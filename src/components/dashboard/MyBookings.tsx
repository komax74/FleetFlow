import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Pencil, Trash2 } from "lucide-react";
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
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Header from "./Header";

const MyBookings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [returnInfo, setReturnInfo] = useState({ mileage: "", location: "" });
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [user?.id, showAllBookings]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`*, vehicles(*), profiles!bookings_user_id_fkey(*)`)
        .eq("status", "active");

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

  const handleDelete = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

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
        .update({ status: "completed" })
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

      setReturnInfo({ mileage: "", location: "" });
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
      const { error } = await supabase
        .from("bookings")
        .update({
          pickup_time: booking.pickup_time,
          return_time: booking.return_time,
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Prenotazione aggiornata",
      });

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

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Non hai prenotazioni attive al momento
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="bg-white overflow-hidden">
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
                              Data:{" "}
                              {new Date(
                                booking.start_date,
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-sm">
                              Orario: {booking.pickup_time.slice(0, 5)} -{" "}
                              {booking.return_time.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-4">
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-100 text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
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
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(booking.id)}
                                >
                                  Conferma
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-blue-100 text-blue-500"
                            onClick={() => {
                              setEditingBooking(booking);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                            >
                              Riconsegna veicolo
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Restituisci veicolo</DialogTitle>
                              <DialogDescription>
                                Inserisci i dettagli della restituzione
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label>Chilometri attuali</Label>
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
                              </div>
                              <div className="grid gap-2">
                                <Label>Posizione di restituzione</Label>
                                <Input
                                  value={returnInfo.location}
                                  onChange={(e) =>
                                    setReturnInfo({
                                      ...returnInfo,
                                      location: e.target.value,
                                    })
                                  }
                                  placeholder="Es. Parcheggio aziendale"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={() => handleReturn(booking)}>
                                Conferma restituzione
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
                  Modifica gli orari della prenotazione
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Orario di ritiro</Label>
                  <Input
                    type="time"
                    value={editingBooking?.pickup_time}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        pickup_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Orario di consegna</Label>
                  <Input
                    type="time"
                    value={editingBooking?.return_time}
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
