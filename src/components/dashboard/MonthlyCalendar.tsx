import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import BookingTable from "./BookingTable";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { it } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStoredBookings } from "@/lib/localBookings";
import { supabase } from "@/lib/supabase";
import Header from "./Header";

type ViewMode = "users" | "vehicles";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "it-IT": it,
  },
});

const MonthlyCalendar = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("users");
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            *,
            profiles!bookings_user_id_fkey(*),
            vehicles(*)
          `,
          )
          .eq("status", "active");

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const events = bookings.map((booking) => {
    return {
      id: booking.id,
      title:
        viewMode === "users"
          ? booking.profiles?.full_name || `User ${booking.user_id}`
          : `${booking.vehicles?.brand} ${booking.vehicles?.model} - ${booking.vehicles?.license_plate}`,
      start: new Date(`${booking.start_date}T${booking.pickup_time}`),
      end: new Date(`${booking.end_date}T${booking.return_time}`),
      booking,
    };
  });

  const EventComponent = ({ event }: any) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full h-full flex items-center gap-2 p-1">
          {viewMode === "users" ? (
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${event.booking.profiles?.full_name || event.booking.user_id}`}
              />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6">
              <AvatarImage src={event.booking.vehicles?.image_url} />
              <AvatarFallback>
                {event.booking.vehicles?.brand[0]}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-xs truncate">{event.title}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">
              {viewMode === "users"
                ? `${event.booking.vehicles?.brand} ${event.booking.vehicles?.model}`
                : event.booking.profiles?.full_name ||
                  `User ${event.booking.user_id}`}
            </p>
            <p className="text-xs text-gray-500">
              {event.booking.pickup_time.slice(0, 5)} -{" "}
              {event.booking.return_time.slice(0, 5)}
            </p>
            {viewMode === "vehicles" && (
              <p className="text-xs text-gray-500">
                {event.booking.vehicles?.license_plate}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="min-h-screen bg-[#e9e8e8]">
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 mb-6">
            <h1 className="text-2xl font-semibold">Calendario prenotazioni</h1>
            <Select
              value={viewMode}
              onValueChange={(v: ViewMode) => setViewMode(v)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Visualizza per" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Utenti</SelectItem>
                <SelectItem value="vehicles">Veicoli</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 px-6 pb-6">
            <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6" style={{ height: "650px" }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%", minHeight: 600 }}
                  defaultView={Views.MONTH}
                  views={[Views.MONTH, Views.WEEK, Views.DAY]}
                  components={{
                    event: EventComponent,
                  }}
                  onNavigate={(newDate) => setDate(newDate)}
                  messages={{
                    next: "Successivo",
                    previous: "Precedente",
                    today: "Oggi",
                    month: "Mese",
                    week: "Settimana",
                    day: "Giorno",
                  }}
                  className="rbc-calendar-custom"
                />
                <style>{`
                  .rbc-calendar-custom .rbc-toolbar button {
                    border: none;
                    padding: 6px 12px;
                    font-size: 0.875rem;
                  }
                  .rbc-calendar-custom .rbc-toolbar button.rbc-active {
                    background: #f3f4f6;
                    box-shadow: none;
                  }
                `}</style>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 px-6">
            <BookingTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;
