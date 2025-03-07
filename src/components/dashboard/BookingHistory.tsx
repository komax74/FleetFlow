import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { FileText, Pencil, Trash2, Calendar, User, Car } from "lucide-react";
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
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Header from "./Header";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const BookingHistory = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  // Filtri
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
    key: "selection",
  });

  useEffect(() => {
    fetchBookings();
    if (profile?.role === "admin") {
      fetchVehicles();
      fetchUsers();
    }
  }, [user?.id, profile?.role]);

  useEffect(() => {
    applyFilters();
  }, [bookings, selectedVehicle, selectedUser, dateRange]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`*, vehicles(*), profiles!bookings_user_id_fkey(*)`);

      if (profile?.role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
      setFilteredBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive",
      });
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Filtro per veicolo
    if (selectedVehicle && selectedVehicle !== "all") {
      filtered = filtered.filter((b) => b.vehicle_id === selectedVehicle);
    }

    // Filtro per utente
    if (selectedUser && selectedUser !== "all") {
      filtered = filtered.filter((b) => b.user_id === selectedUser);
    }

    // Filtro per data
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter((b) => {
        const bookingDate = new Date(b.start_date);
        return (
          bookingDate >= dateRange.startDate && bookingDate <= dateRange.endDate
        );
      });
    }

    setFilteredBookings(filtered);
  };

  const handleDelete = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Prenotazione eliminata definitivamente",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la prenotazione",
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
          return_location: booking.return_location,
          return_notes: booking.return_notes,
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

  // Raggruppa le prenotazioni per data
  const groupBookingsByDate = (bookings) => {
    const grouped = {};

    bookings.forEach((booking) => {
      const dateKey = booking.start_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });

    // Ordina le date in ordine decrescente (più recenti prima)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((date) => ({
        date,
        bookings: grouped[date],
      }));
  };

  const groupedBookings = groupBookingsByDate(filteredBookings);

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Storico Prenotazioni</h1>
          </div>

          {profile?.role === "admin" && (
            <div className="flex flex-wrap gap-4 mb-8">
              <Select
                value={selectedVehicle}
                onValueChange={setSelectedVehicle}
              >
                <SelectTrigger className="w-[220px] h-12 bg-white rounded-full">
                  <Car className="h-5 w-5 mr-2" />
                  <SelectValue placeholder="Filtra per auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le auto</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} ({vehicle.license_plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[220px] h-12 bg-white rounded-full">
                  <User className="h-5 w-5 mr-2" />
                  <SelectValue placeholder="Filtra per utente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog
                open={isDateFilterOpen}
                onOpenChange={setIsDateFilterOpen}
              >
                <Button
                  variant="outline"
                  className="bg-white h-12 rounded-full px-6"
                  onClick={() => setIsDateFilterOpen(true)}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Filtra per data
                </Button>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Seleziona intervallo date</DialogTitle>
                    <DialogDescription>
                      Filtra le prenotazioni per periodo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <DateRange
                      ranges={[dateRange]}
                      onChange={(item) => setDateRange(item.selection)}
                      locale={it}
                      months={1}
                      direction="vertical"
                      showDateDisplay={true}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIsDateFilterOpen(false)}>
                      Applica filtro
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {((selectedVehicle && selectedVehicle !== "all") ||
                (selectedUser && selectedUser !== "all") ||
                (dateRange.startDate && dateRange.endDate)) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedVehicle("all");
                    setSelectedUser("all");
                    setDateRange({
                      startDate: null,
                      endDate: null,
                      key: "selection",
                    });
                  }}
                >
                  Rimuovi filtri
                </Button>
              )}
            </div>
          )}

          {groupedBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Nessuna prenotazione trovata
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {groupedBookings.map(({ date, bookings }) => (
                <div key={date} className="space-y-2">
                  <div className="px-4 py-2">
                    <h2 className="text-lg font-medium">
                      {format(parseISO(date), "EEEE d MMMM yyyy", {
                        locale: it,
                      })}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <Card
                        key={booking.id}
                        className="bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <img
                                src={booking.vehicles?.image_url}
                                alt={booking.vehicles?.model}
                                className="w-16 h-12 object-cover rounded-lg"
                              />
                              <div className="text-sm text-gray-500">
                                {booking.vehicles?.license_plate}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                                <div>
                                  <p className="font-medium">
                                    {booking.vehicles?.brand}{" "}
                                    {booking.vehicles?.model}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.profiles?.full_name || booking.user_id}`}
                                    />
                                    <AvatarFallback>U</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {booking.profiles?.full_name ||
                                      `User ${booking.user_id}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {profile?.role === "admin" && (
                              <div className="flex items-center gap-1">
                                {booking.return_notes && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-blue-500 hover:text-blue-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBooking(booking);
                                      setIsDetailsDialogOpen(true);
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-500 hover:text-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBooking(booking);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Elimina prenotazione
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler eliminare
                                        definitivamente questa prenotazione?
                                        Questa azione non può essere annullata.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Annulla
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(booking.id)}
                                      >
                                        Elimina
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dialog per i dettagli della prenotazione */}
          <Dialog
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Dettagli Prenotazione</DialogTitle>
              </DialogHeader>
              {selectedBooking && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedBooking.vehicles?.image_url}
                      alt={selectedBooking.vehicles?.model}
                      className="w-32 h-24 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedBooking.vehicles?.brand}{" "}
                        {selectedBooking.vehicles?.model}
                      </h3>
                      <p className="text-gray-500">
                        {selectedBooking.vehicles?.license_plate}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Informazioni Utente
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedBooking.profiles?.full_name || selectedBooking.user_id}`}
                          />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <span>
                          {selectedBooking.profiles?.full_name ||
                            `User ${selectedBooking.user_id}`}
                        </span>
                      </div>
                      {selectedBooking.profiles?.company && (
                        <p className="text-sm text-gray-600">
                          Azienda: {selectedBooking.profiles.company}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Dettagli Veicolo
                      </h4>
                      <p className="text-sm">
                        Marca: {selectedBooking.vehicles?.brand}
                      </p>
                      <p className="text-sm">
                        Modello: {selectedBooking.vehicles?.model}
                      </p>
                      <p className="text-sm">
                        Targa: {selectedBooking.vehicles?.license_plate}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Prelievo
                      </h4>
                      <p className="text-sm">
                        Data:{" "}
                        {format(
                          parseISO(selectedBooking.start_date),
                          "d MMMM yyyy",
                          { locale: it },
                        )}
                      </p>
                      <p className="text-sm">
                        Ora: {selectedBooking.pickup_time?.slice(0, 5) || "N/D"}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Riconsegna
                      </h4>
                      <p className="text-sm">
                        Data:{" "}
                        {format(
                          parseISO(selectedBooking.end_date),
                          "d MMMM yyyy",
                          { locale: it },
                        )}
                      </p>
                      <p className="text-sm">
                        Ora: {selectedBooking.return_time?.slice(0, 5) || "N/D"}
                      </p>
                      {selectedBooking.return_location && (
                        <p className="text-sm">
                          Posizione: {selectedBooking.return_location}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedBooking.return_notes && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2">Note</h4>
                      <p className="text-sm">{selectedBooking.return_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog per la modifica della prenotazione */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifica prenotazione</DialogTitle>
                <DialogDescription>
                  Modifica i dettagli della prenotazione
                </DialogDescription>
              </DialogHeader>
              {editingBooking && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Data prelievo</Label>
                      <Input
                        type="date"
                        value={editingBooking.start_date}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ora prelievo</Label>
                      <Input
                        type="time"
                        value={editingBooking.pickup_time}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            pickup_time: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Data riconsegna</Label>
                      <Input
                        type="date"
                        value={editingBooking.end_date}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            end_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ora riconsegna</Label>
                      <Input
                        type="time"
                        value={editingBooking.return_time}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            return_time: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Posizione di riconsegna</Label>
                    <Select
                      value={editingBooking.return_location || "none"}
                      onValueChange={(value) =>
                        setEditingBooking({
                          ...editingBooking,
                          return_location: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona posizione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna posizione</SelectItem>
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

                  <div className="grid gap-2">
                    <Label>Note</Label>
                    <Textarea
                      value={editingBooking.return_notes || ""}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          return_notes: e.target.value,
                        })
                      }
                      placeholder="Inserisci eventuali note"
                    />
                  </div>
                </div>
              )}
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

export default BookingHistory;
