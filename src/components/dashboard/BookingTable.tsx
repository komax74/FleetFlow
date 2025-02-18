import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { supabase } from "@/lib/supabase";

type TimeRange = "today" | "week" | "month";

const BookingTable = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
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

  const getDateRange = (range: TimeRange) => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (range === "week") {
      end.setDate(today.getDate() + 7);
    } else if (range === "month") {
      end.setMonth(today.getMonth() + 1);
    }

    return { start, end };
  };

  const filteredBookings = bookings.filter((booking) => {
    const { start, end } = getDateRange(timeRange);
    const bookingDate = new Date(booking.start_date);
    return bookingDate >= start && bookingDate <= end;
  });

  return (
    <Card className="w-full bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 mb-8 rounded-[20px] overflow-hidden border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prenotazioni Attive</CardTitle>
        <Select
          value={timeRange}
          onValueChange={(value: TimeRange) => setTimeRange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleziona periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Oggi</SelectItem>
            <SelectItem value="week">Prossima settimana</SelectItem>
            <SelectItem value="month">Prossimo mese</SelectItem>
          </SelectContent>
        </Select>
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
                      <span>
                        {booking.vehicles?.brand} {booking.vehicles?.model}
                      </span>
                      <span className="text-gray-500">
                        ({booking.vehicles?.license_plate})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="md:table-cell block">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span>
                        {new Date(booking.start_date).toLocaleDateString(
                          "it-IT",
                        )}
                      </span>
                      {booking.start_date !== booking.end_date && (
                        <span className="text-gray-500">
                          {" "}
                          -{" "}
                          {new Date(booking.end_date).toLocaleDateString(
                            "it-IT",
                          )}
                        </span>
                      )}
                      <span className="text-gray-500">
                        {booking.pickup_time.slice(0, 5)} -{" "}
                        {booking.return_time.slice(0, 5)}
                      </span>
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
