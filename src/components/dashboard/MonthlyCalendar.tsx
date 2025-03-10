import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import BookingTable from "./BookingTable";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { it } from "date-fns/locale";
import { registerLocale } from "react-datepicker";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "@/components/ui/button";
import { getStoredBookings } from "@/lib/localBookings";
import { supabase } from "@/lib/supabase";
import Header from "./Header";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Car,
} from "lucide-react";

type ViewMode = "users" | "vehicles";

// Registra la localizzazione italiana
registerLocale("it", it);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "it-IT": it,
  },
});

// Custom toolbar component
const CustomToolbar = (toolbar) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const goToBack = () => {
    toolbar.onNavigate("PREV");
  };

  const goToNext = () => {
    toolbar.onNavigate("NEXT");
  };

  const goToCurrent = () => {
    toolbar.onNavigate("TODAY");
  };

  const goToView = (view) => {
    toolbar.onView(view);
  };

  const viewLabels = {
    month: "Mese",
    week: "Settimana",
    day: "Giorno",
  };

  return (
    <div className="rbc-toolbar flex-col md:flex-row">
      {isMobile ? (
        // Mobile layout
        <>
          <span className="rbc-toolbar-label text-xl font-semibold mb-4 text-center">
            {toolbar.label}
          </span>

          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={goToBack}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToCurrent}
              className="flex items-center justify-center px-4 py-2 rounded-full hover:bg-gray-100"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Oggi
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            {toolbar.views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => goToView(view)}
                className={`flex items-center ${toolbar.view === view ? "rbc-active" : ""}`}
              >
                {view === "month" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === "week" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === "day" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {viewLabels[view]}
              </button>
            ))}
          </div>
        </>
      ) : (
        // Desktop layout
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToBack}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToCurrent}
              className="flex items-center justify-center px-4 py-2 rounded-full hover:bg-gray-100"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Oggi
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <span className="rbc-toolbar-label text-xl font-semibold">
            {toolbar.label}
          </span>

          <div className="flex items-center gap-2">
            {toolbar.views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => goToView(view)}
                className={`flex items-center ${toolbar.view === view ? "rbc-active" : ""}`}
              >
                {view === "month" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === "week" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === "day" && <CalendarIcon className="h-4 w-4 mr-2" />}
                {viewLabels[view]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MonthlyCalendar = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("users");
  const [date, setDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
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

  // Funzione per generare colori coerenti basati su ID
  const getColorForId = (id: string) => {
    // Lista di colori predefiniti per una buona leggibilità
    const colors = [
      "#3b82f6", // blue
      "#10b981", // emerald
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#f97316", // orange
      "#6366f1", // indigo
      "#ef4444", // red
      "#14b8a6", // teal
    ];

    // Genera un numero basato sulla stringa dell'ID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Usa il modulo per ottenere un indice nell'array dei colori
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const events = bookings
    .map((booking) => {
      // Crea date con orari corretti per inizio e fine prenotazione
      const startDate = new Date(
        `${booking.start_date}T${booking.pickup_time}`,
      );
      const endDate = new Date(`${booking.end_date}T${booking.return_time}`);

      // Per prenotazioni multi-giorno, crea un evento per ogni giorno
      if (booking.start_date !== booking.end_date) {
        const multiDayEvents = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        // Primo giorno: dall'ora di inizio fino a fine giornata
        const colorKey =
          viewMode === "users" ? booking.user_id : booking.vehicle_id;
        const eventColor = getColorForId(colorKey);

        multiDayEvents.push({
          id: `${booking.id}-start`,
          title:
            viewMode === "users"
              ? booking.profiles?.full_name || `User ${booking.user_id}`
              : `${booking.vehicles?.model} - ${booking.vehicles?.license_plate}`,
          start: startDate,
          end: new Date(currentDate.setHours(22, 0, 0, 0)),
          allDay: false,
          resource: booking.vehicle_id,
          booking,
          isMultiDay: true,
          isFirstDay: true,
          style: { backgroundColor: eventColor },
        });

        // Avanza al giorno successivo
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(7, 0, 0, 0);

        // Giorni intermedi (se ci sono)
        while (currentDate.toDateString() !== lastDate.toDateString()) {
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(22, 0, 0, 0);

          multiDayEvents.push({
            id: `${booking.id}-${currentDate.toISOString()}`,
            title:
              viewMode === "users"
                ? booking.profiles?.full_name || `User ${booking.user_id}`
                : `${booking.vehicles?.model} - ${booking.vehicles?.license_plate}`,
            start: new Date(currentDate),
            end: dayEnd,
            allDay: false,
            resource: booking.vehicle_id,
            booking,
            isMultiDay: true,
            isMiddleDay: true,
            style: { backgroundColor: eventColor },
          });

          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(7, 0, 0, 0);
        }

        // Ultimo giorno: dall'inizio giornata fino all'ora di fine
        multiDayEvents.push({
          id: `${booking.id}-end`,
          title:
            viewMode === "users"
              ? booking.profiles?.full_name || `User ${booking.user_id}`
              : `${booking.vehicles?.model} - ${booking.vehicles?.license_plate}`,
          start: new Date(currentDate),
          end: endDate,
          allDay: false,
          resource: booking.vehicle_id,
          booking,
          isMultiDay: true,
          isLastDay: true,
          style: { backgroundColor: eventColor },
        });

        return multiDayEvents;
      }

      // Per prenotazioni in giornata, crea un singolo evento
      const colorKey =
        viewMode === "users" ? booking.user_id : booking.vehicle_id;
      const eventColor = getColorForId(colorKey);

      return {
        id: booking.id,
        title:
          viewMode === "users"
            ? booking.profiles?.full_name || `User ${booking.user_id}`
            : `${booking.vehicles?.model} - ${booking.vehicles?.license_plate}`,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: booking.vehicle_id,
        booking,
        style: { backgroundColor: eventColor },
      };
    })
    .flat(); // Appiattisce l'array di array per le prenotazioni multi-giorno

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const EventComponent = ({ event }: any) => {
    // Applica lo stile direttamente all'elemento dell'evento
    const eventStyle = event.style || {};

    // Modifica lo stile dell'evento nel DOM dopo il rendering
    React.useEffect(() => {
      setTimeout(() => {
        const eventElements = document.querySelectorAll(".rbc-event");
        eventElements.forEach((el: any) => {
          if (el.textContent.includes(event.title)) {
            el.style.backgroundColor = eventStyle.backgroundColor || "";
            el.style.borderColor = eventStyle.backgroundColor || "";
          }
        });
      }, 0);
    }, [event.title, eventStyle.backgroundColor]);

    return (
      <div
        className="w-full h-full flex items-center gap-2 p-1 cursor-pointer"
        onClick={() => setSelectedEvent(event)}
      >
        {viewMode === "users" ? (
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${event.booking.profiles?.full_name || event.booking.user_id}`}
            />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={
                event.booking.vehicles?.image_url ||
                `https://via.placeholder.com/150?text=${event.booking.vehicles?.brand}`
              }
            />
            <AvatarFallback>
              {event.booking.vehicles?.brand?.[0] || "V"}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="text-xs truncate">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#e9e8e8]">
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col">
          <div className="flex flex-col items-center justify-center px-6 py-4 mb-2">
            <h1 className="text-3xl font-bold mb-6">Calendario prenotazioni</h1>
            <div className="flex items-center gap-4 mb-4">
              <Select
                value={viewMode}
                onValueChange={(v: ViewMode) => setViewMode(v)}
              >
                <SelectTrigger className="w-[220px] h-12 bg-white rounded-full border-gray-200 text-base">
                  {viewMode === "users" ? (
                    <Users className="h-5 w-5 mr-2" />
                  ) : (
                    <Car className="h-5 w-5 mr-2" />
                  )}
                  <SelectValue placeholder="Visualizza per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Utenti</SelectItem>
                  <SelectItem value="vehicles">Veicoli</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 px-6 pb-6">
            <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent
                className="p-6 md:p-6 p-2"
                style={{ height: "650px" }}
              >
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%", minHeight: 600 }}
                  defaultView={Views.MONTH}
                  views={[Views.MONTH, Views.WEEK, Views.DAY]}
                  min={new Date(0, 0, 0, 7, 0, 0)}
                  max={new Date(0, 0, 0, 22, 0, 0)}
                  timeslots={2}
                  step={30}
                  components={{
                    event: EventComponent,
                    toolbar: CustomToolbar,
                  }}
                  onNavigate={(newDate) => setDate(newDate)}
                  onView={(view) => setCurrentView(view)}
                  messages={{
                    next: "Successivo",
                    previous: "Precedente",
                    today: "Oggi",
                    month: "Mese",
                    week: "Settimana",
                    day: "Giorno",
                    agenda: "Agenda",
                    date: "Data",
                    time: "Ora",
                    event: "Evento",
                    allDay: "Tutto il giorno",
                    noEventsInRange: "Nessun evento in questo periodo",
                  }}
                  className="rbc-calendar-custom"
                  culture="it-IT"
                />
                <style>{`
                  .rbc-calendar-custom .rbc-toolbar {
                    margin-bottom: 20px;
                    padding: 10px;
                    border-radius: 12px;
                    background-color: #f9fafb;
                    display: flex;
                    flex-wrap: wrap;
                  }
                  @media (max-width: 768px) {
                    .rbc-calendar-custom .rbc-toolbar {
                      padding: 8px;
                    }
                  }
                  .rbc-calendar-custom .rbc-toolbar button {
                    border: none;
                    padding: 8px 16px;
                    font-size: 0.875rem;
                    border-radius: 8px;
                    transition: all 0.2s;
                  }
                  .rbc-calendar-custom .rbc-toolbar button.rbc-active {
                    background: #3b82f6;
                    color: white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                  }
                  .rbc-calendar-custom .rbc-toolbar button:hover:not(.rbc-active) {
                    background: #e5e7eb;
                  }
                  .rbc-calendar-custom .rbc-event {
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border: none !important;
                  }
                  @media (max-width: 768px) {
                    .rbc-calendar-custom .rbc-month-view {
                      font-size: 0.85rem;
                    }
                    .rbc-calendar-custom .rbc-event {
                      padding: 1px 2px;
                    }
                    .rbc-calendar-custom .rbc-event-content {
                      font-size: 0.7rem;
                    }
                    .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event {
                      max-width: 90% !important;
                    }
                    .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event-overlaps {
                      max-width: 45% !important;
                    }
                  }
                  .rbc-calendar-custom .rbc-event-label {
                    display: none;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-event {
                    border: none;
                    padding: 2px 5px;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-event-content {
                    font-size: 0.75rem;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-event-label {
                    display: none;
                  }
                  .rbc-calendar-custom .rbc-time-slot {
                    min-height: 20px;
                  }
                  .rbc-calendar-custom .rbc-time-header-content {
                    min-height: 50px;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-events-container {
                    margin-right: 0;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-events-container {
                    display: flex;
                    flex-direction: column;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event-overlaps {
                    flex: 1;
                    max-width: 50% !important;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event-continues-after {
                    border-top-right-radius: 0;
                    border-bottom-right-radius: 0;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event-continues-prior {
                    border-top-left-radius: 0;
                    border-bottom-left-radius: 0;
                  }
                  .rbc-calendar-custom .rbc-time-content {
                    border-top: 1px solid #ddd;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-allday-cell {
                    display: none;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-time-slot {
                    border-top: 1px solid #f0f0f0;
                  }
                  .rbc-calendar-custom .rbc-time-view .rbc-day-slot .rbc-event {
                    z-index: 1;
                    max-width: 95% !important;
                  }
                  .rbc-calendar-custom .rbc-header {
                    padding: 10px 0;
                    font-weight: 600;
                    text-transform: capitalize;
                  }
                  .rbc-calendar-custom .rbc-date-cell {
                    padding: 8px 8px;
                    text-align: center;
                  }
                  .rbc-calendar-custom .rbc-month-row {
                    min-height: 100px;
                  }
                  .rbc-calendar-custom .rbc-month-view {
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                  }
                  .rbc-calendar-custom .rbc-month-row + .rbc-month-row {
                    border-top: 1px solid #e5e7eb;
                  }
                  .rbc-calendar-custom .rbc-day-bg + .rbc-day-bg {
                    border-left: 1px solid #e5e7eb;
                  }
                  .rbc-calendar-custom .rbc-today {
                    background-color: #eff6ff;
                  }
                  .rbc-calendar-custom .rbc-off-range-bg {
                    background-color: #f9fafb;
                  }
                  .rbc-calendar-custom .rbc-toolbar-label {
                    font-size: 1.25rem;
                    font-weight: 600;
                  }
                `}</style>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 px-6">
            <BookingTable currentDate={date} currentView={currentView} />
          </div>

          {/* Event Details Modal */}
          {selectedEvent && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedEvent(null)}
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">
                      Dettagli Prenotazione
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setSelectedEvent(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEvent.booking.profiles?.full_name || selectedEvent.booking.user_id}`}
                        />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {selectedEvent.booking.profiles?.full_name ||
                            "Utente"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedEvent.booking.profiles?.company || ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 mb-3">
                      <img
                        src={
                          selectedEvent.booking.vehicles?.image_url ||
                          "https://via.placeholder.com/150?text=Auto"
                        }
                        alt={selectedEvent.booking.vehicles?.model || "Veicolo"}
                        className="w-20 h-14 object-cover rounded-md"
                      />
                      <div>
                        <p className="font-medium">
                          {selectedEvent.booking.vehicles?.brand}{" "}
                          {selectedEvent.booking.vehicles?.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedEvent.booking.vehicles?.license_plate}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Prelievo
                        </p>
                        <p className="text-sm">
                          {new Date(
                            selectedEvent.booking.start_date,
                          ).toLocaleDateString()}
                          <br />
                          {selectedEvent.booking.pickup_time.slice(0, 5)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Riconsegna
                        </p>
                        <p className="text-sm">
                          {new Date(
                            selectedEvent.booking.end_date,
                          ).toLocaleDateString()}
                          <br />
                          {selectedEvent.booking.return_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;
