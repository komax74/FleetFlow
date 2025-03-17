import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Header from "./Header";

const MyBookings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [returnInfo, setReturnInfo] = useState({
    mileage: "",
    location: "",
    notes: "",
  });
  const [currentVehicleMileage, setCurrentVehicleMileage] = useState(0);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, [user?.id, showAllBookings]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`*, vehicles(*), profiles!bookings_user_id_fkey(*)`)
        .or("status.eq.active,status.eq.completed");

      if (!showAllBookings || profile?.role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive",
      });
    }
  };

  const getFilteredBookings = () => {
    const now = new Date();

    // Filtra le prenotazioni in base al filtro attivo
    let filtered = bookings;
    if (activeFilter !== "all") {
      filtered = bookings.filter((booking) => {
        const startDate = new Date(
          `${booking.start_date}T${booking.pickup_time}`,
        );

        if (activeFilter === "current") {
          // Prenotazioni in corso (iniziate ma non ancora terminate)
          return startDate <= now && booking.status === "active";
        } else if (activeFilter === "returned") {
          // Prenotazioni completate (status = completed)
          return booking.status === "completed";
        } else if (activeFilter === "future") {
          // Prenotazioni future (non ancora iniziate)
          return startDate > now && booking.status === "active";
        }
        return true;
      });
    }

    // Ordina le prenotazioni in base allo stato e alla data
    return filtered.sort((a, b) => {
      const aStartDate = new Date(`${a.start_date}T${a.pickup_time}`);
      const bStartDate = new Date(`${b.start_date}T${b.pickup_time}`);
      const aEndDate = new Date(`${a.end_date}T${a.return_time}`);
      const bEndDate = new Date(`${b.end_date}T${b.return_time}`);

      // Funzione per determinare la priorità di una prenotazione
      const getPriority = (booking, startDate) => {
        if (booking.status === "active" && startDate <= now) return 1; // In corso
        if (booking.status === "active" && startDate > now) return 2; // Future
        if (booking.status === "completed") return 3; // Completate
        return 4; // Altro
      };

      const aPriority = getPriority(a, aStartDate);
      const bPriority = getPriority(b, bStartDate);

      // Prima ordina per priorità
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Se hanno la stessa priorità, ordina per data
      if (aPriority === 1) {
        // In corso: ordina per data di fine (crescente)
        return aEndDate.getTime() - bEndDate.getTime();
      } else if (aPriority === 2) {
        // Future: ordina per data di inizio (crescente)
        return aStartDate.getTime() - bStartDate.getTime();
      } else {
        // Completate: ordina per data di fine (decrescente)
        return bEndDate.getTime() - aEndDate.getTime();
      }
    });
  };

  const handleDelete = async (booking) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (error) throw error;

      // Invia notifica all'utente
      const { error: userNotificationError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: booking.user_id,
            title: "Prenotazione annullata",
            message: `La tua prenotazione per ${booking.vehicles?.brand} ${booking.vehicles?.model} (${booking.vehicles?.license_plate}) è stata annullata con successo.`,
            type: "booking",
            read: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (userNotificationError) {
        console.error(
          "Errore nell'invio della notifica all'utente:",
          userNotificationError,
        );
      } else {
        console.log("Notifica inviata con successo all'utente");
      }

      // Invia notifica agli amministratori
      try {
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          // Crea un array di notifiche per tutti gli admin (escluso l'utente stesso se è admin)
          const adminNotifications = admins
            .filter((admin) => admin.id !== booking.user_id)
            .map((admin) => ({
              user_id: admin.id,
              title: "Prenotazione annullata da un utente",
              message: `${booking.profiles?.full_name} ha annullato la prenotazione per ${booking.vehicles?.brand} ${booking.vehicles?.model} (${booking.vehicles?.license_plate}).`,
              type: "booking",
              read: false,
              created_at: new Date().toISOString(),
              action_url: "/booking-history",
            }));

          if (adminNotifications.length > 0) {
            const { error: adminNotificationError } = await supabase
              .from("notifications")
              .insert(adminNotifications);

            if (adminNotificationError) {
              console.error(
                "Errore nell'invio delle notifiche agli admin:",
                adminNotificationError,
              );
            } else {
              console.log("Notifiche inviate con successo agli admin");
            }
          }
        }
      } catch (error) {
        console.error("Errore nel recupero degli admin:", error);
      }

      toast({
        title: "Successo",
        description: "Prenotazione cancellata",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Errore",
        description: "Impossibile cancellare la prenotazione",
        variant: "destructive",
      });
    }
  };

  const handleReturn = async (booking) => {
    if (!returnInfo.mileage || !returnInfo.location) {
      toast({
        title: "Errore",
        description: "Inserisci tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          return_location: returnInfo.location,
          return_notes: returnInfo.notes,
        })
        .eq("id", booking.id);

      if (bookingError) throw bookingError;

      // Update vehicle mileage
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ mileage: parseInt(returnInfo.mileage) })
        .eq("id", booking.vehicle_id);

      if (vehicleError) throw vehicleError;

      toast({
        title: "Successo",
        description: "Veicolo restituito con successo",
      });

      setReturnInfo({ mileage: "", location: "", notes: "" });
      fetchBookings();
    } catch (error) {
      console.error("Error returning vehicle:", error);
      toast({
        title: "Errore",
        description: "Impossibile restituire il veicolo",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (booking) => {
    try {
      // Verifica che il veicolo sia disponibile nelle nuove date
      const { data: existingBookings, error: checkError } = await supabase
        .from("bookings")
        .select("*")
        .eq("vehicle_id", booking.vehicle_id)
        .eq("status", "active")
        .neq("id", booking.id);

      if (checkError) throw checkError;

      // Verifica sovrapposizioni con altre prenotazioni dello stesso veicolo
      const newStartDate = new Date(
        `${booking.start_date}T${booking.pickup_time}`,
      );
      const newEndDate = new Date(`${booking.end_date}T${booking.return_time}`);

      const hasOverlap = existingBookings.some((existingBooking) => {
        const existingStart = new Date(
          `${existingBooking.start_date}T${existingBooking.pickup_time}`,
        );
        const existingEnd = new Date(
          `${existingBooking.end_date}T${existingBooking.return_time}`,
        );
        return newStartDate <= existingEnd && newEndDate >= existingStart;
      });

      if (hasOverlap) {
        toast({
          title: "Errore",
          description: "Il veicolo non è disponibile nelle date selezionate",
          variant: "destructive",
        });
        return;
      }

      // Verifica sovrapposizioni con altre prenotazioni dell'utente (altri veicoli)
      const { data: userBookings, error: userCheckError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", booking.user_id)
        .eq("status", "active")
        .neq("id", booking.id)
        .neq("vehicle_id", booking.vehicle_id);

      if (userCheckError) throw userCheckError;

      const hasUserOverlap = userBookings.some((userBooking) => {
        const userStart = new Date(
          `${userBooking.start_date}T${userBooking.pickup_time}`,
        );
        const userEnd = new Date(
          `${userBooking.end_date}T${userBooking.return_time}`,
        );
        return newStartDate <= userEnd && newEndDate >= userStart;
      });

      // Aggiorna la prenotazione
      const { error } = await supabase
        .from("bookings")
        .update({
          start_date: booking.start_date,
          end_date: booking.end_date,
          pickup_time: booking.pickup_time,
          return_time: booking.return_time,
        })
        .eq("id", booking.id);

      if (error) throw error;

      // Invia notifica all'utente
      await supabase.from("notifications").insert([
        {
          user_id: booking.user_id,
          title: "Prenotazione modificata",
          message: `La tua prenotazione per ${booking.vehicles?.brand} ${booking.vehicles?.model} (${booking.vehicles?.license_plate}) è stata modificata con successo.`,
          type: "booking",
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      // Invia notifica agli amministratori
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          if (admin.id !== booking.user_id) {
            // Non inviare all'admin se è lo stesso utente
            await supabase.from("notifications").insert([
              {
                user_id: admin.id,
                title: "Prenotazione modificata da un utente",
                message: `${booking.profiles?.full_name} ha modificato la prenotazione per ${booking.vehicles?.brand} ${booking.vehicles?.model} (${booking.vehicles?.license_plate}).`,
                type: "booking",
                read: false,
                created_at: new Date().toISOString(),
                action_url: "/booking-history",
              },
            ]);
          }
        }
      }

      toast({
        title: "Successo",
        description: "Prenotazione aggiornata",
      });

      if (hasUserOverlap) {
        toast({
          title: "Attenzione",
          description: "Hai già un'altra auto prenotata in questo periodo",
          variant: "warning",
        });
      }

      setIsEditDialogOpen(false);
      setEditingBooking(null);
      fetchBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la prenotazione",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Le mie prenotazioni</h1>
            {profile?.role === "admin" && (
              <Button
                variant="outline"
                onClick={() => setShowAllBookings(!showAllBookings)}
              >
                {showAllBookings ? "Mostra solo le mie" : "Mostra tutte"}
              </Button>
            )}
          </div>

          <div className="flex gap-3 mb-6">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              className={`rounded-full ${activeFilter === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              Tutte
            </Button>
            <Button
              variant={activeFilter === "current" ? "default" : "outline"}
              className={`rounded-full ${activeFilter === "current" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              onClick={() => setActiveFilter("current")}
            >
              In Corso
            </Button>
            <Button
              variant={activeFilter === "returned" ? "default" : "outline"}
              className={`rounded-full ${activeFilter === "returned" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              onClick={() => setActiveFilter("returned")}
            >
              Riconsegnate
            </Button>
            <Button
              variant={activeFilter === "future" ? "default" : "outline"}
              className={`rounded-full ${activeFilter === "future" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              onClick={() => setActiveFilter("future")}
            >
              Future
            </Button>
          </div>

          {getFilteredBookings().length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Non hai prenotazioni{" "}
                {activeFilter !== "all"
                  ? "in questa categoria"
                  : "attive al momento"}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {getFilteredBookings().map((booking) => (
                <Card
                  key={booking.id}
                  className={`bg-white overflow-hidden ${booking.status === "completed" ? "border-l-4 border-l-green-500" : booking.status === "active" && new Date(`${booking.start_date}T${booking.pickup_time}`) <= new Date() ? "border-l-4 border-l-orange-500" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <img
                          src={booking.vehicles?.image_url}
                          alt={booking.vehicles?.model}
                          className="w-32 h-24 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="text-lg font-semibold">
                            {booking.vehicles?.brand} {booking.vehicles?.model}
                            {showAllBookings && profile?.role === "admin" && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({booking.profiles?.full_name})
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Targa: {booking.vehicles?.license_plate}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Inizio:</span>{" "}
                              {new Date(
                                booking.start_date,
                              ).toLocaleDateString()}{" "}
                              {booking.pickup_time.slice(0, 5)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Fine:</span>{" "}
                              {new Date(booking.end_date).toLocaleDateString()}{" "}
                              {booking.return_time.slice(0, 5)}
                            </p>
                          </div>

                          {/* Avvisi per prenotazioni */}
                          {(() => {
                            const now = new Date();
                            const endDate = new Date(
                              `${booking.end_date}T${booking.return_time}`,
                            );
                            const startDate = new Date(
                              `${booking.start_date}T${booking.pickup_time}`,
                            );

                            // Verifica se la prenotazione è scaduta ma ancora attiva
                            if (endDate < now && booking.status === "active") {
                              return (
                                <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-red-500 flex-shrink-0 mt-0.5"
                                  >
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                  </svg>
                                  <p className="text-sm text-red-700">
                                    Attenzione hai superato l'orario di
                                    riconsegna, chiudi prima possibile la
                                    prenotazione
                                  </p>
                                </div>
                              );
                            }

                            // Verifica se ci sono prenotazioni ravvicinate (entro 2 ore)
                            const nextBookings = bookings.filter((b) => {
                              if (
                                b.id === booking.id ||
                                b.vehicle_id !== booking.vehicle_id
                              )
                                return false;
                              const nextStart = new Date(
                                `${b.start_date}T${b.pickup_time}`,
                              );
                              const timeDiff =
                                (nextStart.getTime() - endDate.getTime()) /
                                (1000 * 60 * 60); // differenza in ore
                              return timeDiff > 0 && timeDiff <= 2; // entro 2 ore
                            });

                            if (nextBookings.length > 0) {
                              return (
                                <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-start gap-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-yellow-500 flex-shrink-0 mt-0.5"
                                  >
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                  </svg>
                                  <p className="text-sm text-yellow-700">
                                    Attenzione auto prenotata a poca distanza
                                    della riconsegna, cerca di essere preciso
                                  </p>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-4">
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const now = new Date();
                            const startDate = new Date(
                              `${booking.start_date}T${booking.pickup_time}`,
                            );

                            // Mostra i pulsanti di modifica e annullamento solo se la data di inizio è futura e lo stato è active
                            if (
                              startDate > now &&
                              booking.status === "active"
                            ) {
                              return (
                                <>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        className="w-full"
                                      >
                                        Annulla prenotazione
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Cancella prenotazione
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Sei sicuro di voler cancellare questa
                                          prenotazione?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Annulla
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(booking)}
                                        >
                                          Conferma
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <Button
                                    variant="default"
                                    className="bg-blue-500 hover:bg-blue-600 text-white w-full"
                                    onClick={() => {
                                      setEditingBooking(booking);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    Modifica prenotazione
                                  </Button>
                                </>
                              );
                            } else if (
                              startDate <= now &&
                              booking.status === "active"
                            ) {
                              // Se la data di inizio è passata e lo stato è active, mostra solo il pulsante di riconsegna
                              return (
                                <Dialog
                                  onOpenChange={(open) => {
                                    if (open) {
                                      // Quando si apre il dialog, imposta il chilometraggio attuale del veicolo
                                      setCurrentVehicleMileage(
                                        booking.vehicles?.mileage || 0,
                                      );
                                      setReturnInfo({
                                        mileage: "",
                                        location: "",
                                        notes: "",
                                      });
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 w-full"
                                    >
                                      Riconsegna veicolo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Restituisci veicolo
                                      </DialogTitle>
                                      <DialogDescription>
                                        Inserisci i dettagli della restituzione
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid gap-2">
                                        <Label>
                                          Chilometri alla riconsegna (Chilometri
                                          alla partenza: {currentVehicleMileage}
                                          )
                                        </Label>
                                        <Input
                                          type="number"
                                          value={returnInfo.mileage}
                                          onChange={(e) =>
                                            setReturnInfo({
                                              ...returnInfo,
                                              mileage: e.target.value,
                                            })
                                          }
                                        />
                                        {returnInfo.mileage && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Chilometri percorsi:{" "}
                                            {parseInt(returnInfo.mileage) -
                                              currentVehicleMileage}
                                          </p>
                                        )}
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Posizione di restituzione</Label>
                                        <Select
                                          value={returnInfo.location}
                                          onValueChange={(value) =>
                                            setReturnInfo({
                                              ...returnInfo,
                                              location: value,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleziona posizione" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Fronte Ufficio">
                                              Fronte Ufficio
                                            </SelectItem>
                                            <SelectItem value="Fronte Sanar">
                                              Fronte Sanar
                                            </SelectItem>
                                            <SelectItem value="Lato Ufficio">
                                              Lato Ufficio
                                            </SelectItem>
                                            <SelectItem value="Fronte Gavabaccio">
                                              Fronte Gavabaccio
                                            </SelectItem>
                                            <SelectItem value="Lato Veraldi">
                                              Lato Veraldi
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="grid gap-2 mt-2">
                                        <Label>Note</Label>
                                        <Textarea
                                          value={returnInfo.notes}
                                          onChange={(e) =>
                                            setReturnInfo({
                                              ...returnInfo,
                                              notes: e.target.value,
                                            })
                                          }
                                          placeholder="Inserisci eventuali note sulla restituzione"
                                          className="min-h-[80px]"
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        onClick={() => handleReturn(booking)}
                                      >
                                        Conferma restituzione
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              );
                            } else {
                              // Per prenotazioni completate, non mostrare pulsanti
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifica prenotazione</DialogTitle>
                <DialogDescription>
                  Modifica la data e gli orari della prenotazione
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Data di ritiro</Label>
                  <Input
                    type="date"
                    value={editingBooking?.start_date || ""}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        start_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Orario di ritiro</Label>
                  <Input
                    type="time"
                    value={editingBooking?.pickup_time || ""}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        pickup_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data di riconsegna</Label>
                  <Input
                    type="date"
                    value={editingBooking?.end_date || ""}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        end_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Orario di consegna</Label>
                  <Input
                    type="time"
                    value={editingBooking?.return_time || ""}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        return_time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleUpdate(editingBooking)}>
                  Salva modifiche
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
