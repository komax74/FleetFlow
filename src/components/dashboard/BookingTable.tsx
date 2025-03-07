import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { supabase } from "@/lib/supabase";
import {
  format,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import { it } from "date-fns/locale";

interface BookingTableProps {
  currentDate: Date;
  currentView: string;
}

const BookingTable = ({
  currentDate = new Date(),
  currentView = "month",
}: BookingTableProps) => {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            profiles!bookings_user_id_fkey(*),
            vehicles(*)
          `,
          )
          .eq("status", "active");

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error("Error loading bookings:", error);
      }
    };

    fetchBookings();

    // Set up real-time subscription
    const subscription = supabase
      .channel("bookings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getDateRange = () => {
    let start, end;

    if (currentView === "month") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (currentView === "week") {
      start = startOfWeek(currentDate, { locale: it });
      end = endOfWeek(currentDate, { locale: it });
    } else {
      // day
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  const filteredBookings = bookings.filter((booking) => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);

    // Verifica se c'è una sovrapposizione tra il periodo di prenotazione e il periodo visualizzato
    return (
      (bookingStart <= end && bookingEnd >= start) || // La prenotazione si sovrappone al periodo
      isWithinInterval(bookingStart, { start, end }) || // L'inizio della prenotazione è nel periodo
      isWithinInterval(bookingEnd, { start, end }) // La fine della prenotazione è nel periodo
    );
  });

  // Formatta il periodo di riferimento
  const getPeriodLabel = () => {
    if (currentView === "month") {
      return format(currentDate, "MMMM yyyy", { locale: it });
    } else if (currentView === "week") {
      const weekStart = startOfWeek(currentDate, { locale: it });
      const weekEnd = endOfWeek(currentDate, { locale: it });
      return `${format(weekStart, "d", { locale: it })} - ${format(weekEnd, "d MMMM yyyy", { locale: it })}`;
    } else {
      // day
      return format(currentDate, "d MMMM yyyy", { locale: it });
    }
  };

  return (
    <Card className="w-full bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 mb-8 rounded-[20px] overflow-hidden border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">
          Prenotazioni Attive - {getPeriodLabel()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="md:table-row flex flex-col border-b"
                >
                  <TableCell className="md:table-cell block">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span>
                        {booking.vehicles?.brand} {booking.vehicles?.model}
                      </span>
                      <span className="text-gray-500">
                        ({booking.vehicles?.license_plate})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="md:table-cell block">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            booking.profiles?.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.profiles?.full_name || booking.user_id}`
                          }
                        />
                        <AvatarFallback>
                          {booking.profiles?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span>{booking.profiles?.full_name || "Utente"}</span>
                        {booking.profiles?.company && (
                          <span className="text-gray-600">
                            ({booking.profiles?.company})
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="md:table-cell block">
                    <div className="flex flex-wrap items-center gap-x-2">
                      {booking.start_date === booking.end_date ? (
                        <>
                          <span>
                            {new Date(booking.start_date).toLocaleDateString(
                              "it-IT",
                            )}
                          </span>
                          <span className="text-gray-500">
                            {booking.pickup_time.slice(0, 5)} -{" "}
                            {booking.return_time.slice(0, 5)}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <div>
                              <span>Prelievo: </span>
                              <span className="text-gray-500">
                                {new Date(
                                  booking.start_date,
                                ).toLocaleDateString("it-IT")}{" "}
                                {booking.pickup_time.slice(0, 5)}
                              </span>
                            </div>
                            <div>
                              <span>Riconsegna: </span>
                              <span className="text-gray-500">
                                {new Date(booking.end_date).toLocaleDateString(
                                  "it-IT",
                                )}{" "}
                                {booking.return_time.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    Nessuna prenotazione per questo periodo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingTable;
