"use client";

import React, { useMemo, useState } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { AppointmentRecord } from "@/app/admin/appointments/page";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

// Setup the localizer for react-big-calendar
moment.locale("fr", {
  week: {
    dow: 1, // Monday is the first day of the week
  },
});
const localizer = momentLocalizer(moment);

interface CalendarAppt {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientId: string;
}

export function CalendarView({
  initialAppointments,
}: {
  initialAppointments: AppointmentRecord[];
}) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("week");

  const events = useMemo(() => {
    // Convert DB appointments to Calendar items
    return initialAppointments.map((appt) => {
      const startDate = new Date(appt.appointment_date);
      const endDate = new Date(
        startDate.getTime() + appt.duration_minutes * 60000,
      );

      // Create a nice title
      const patientName = appt.patients
        ? `${appt.patients.first_name} ${appt.patients.last_name}`
        : "Patient Inconnu";
        
      const eventTitle = appt.notes 
        ? `${patientName} - ${appt.notes}` 
        : patientName;

      return {
        id: appt.id,
        title: eventTitle,
        start: startDate,
        end: endDate,
        patientId: appt.patient_id,
      };
    });
  }, [initialAppointments]);

  const handleSelectEvent = (event: CalendarAppt) => {
    // Navigate to patient file
    router.push(`/admin/patients/${event.patientId}`);
  };

  const eventPropGetter = (event: CalendarAppt) => {
    let hash = 0;
    const str = event.patientId || event.id;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "hsl(var(--primary))",
      "#0ea5e9", // sky
      "#10b981", // emerald
      "#8b5cf6", // violet
      "#f59e0b", // amber
      "#ec4899", // pink
      "#ef4444", // red
    ];
    const bg = colors[Math.abs(hash) % colors.length];
    return {
      style: {
        backgroundColor: bg,
        borderColor: "rgba(0,0,0,0.1)",
        color: "#ffffff",
      },
      className: "custom-rbc-event",
    };
  };

  // Define calendar boundaries (8:00 AM to 8:00 PM)
  const minTime = new Date();
  minTime.setHours(8, 0, 0);
  const maxTime = new Date();
  maxTime.setHours(20, 0, 0);

  return (
    <div className="h-[650px] w-full bg-background rounded-xl border p-6 shadow-sm flex flex-col">
      <style suppressHydrationWarning>{`
        .rbc-calendar {
          font-family: inherit;
          font-size: 0.875rem;
        }
        .rbc-btn-group button {
          color: var(--foreground);
          border: 1px solid var(--border) !important;
          background-color: transparent;
          transition: all 0.2s ease;
        }
        .rbc-btn-group button:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }
        .rbc-btn-group button.rbc-active {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          border-color: var(--primary) !important;
          box-shadow: none !important;
        }
        
        .rbc-toolbar-label {
          font-weight: 600;
          font-size: 1.125rem;
          color: var(--foreground);
          text-transform: capitalize;
        }
        
        .custom-rbc-event {
          border-radius: 6px !important;
          padding: 4px 6px !important;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1) !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .custom-rbc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.15) !important;
          z-index: 10 !important;
          filter: brightness(1.05) !important;
        }
        
        .rbc-today {
          background-color: color-mix(in srgb, var(--accent) 50%, transparent) !important;
        }
        
        .rbc-header {
          padding: 12px 0;
          font-weight: 600;
          color: var(--muted-foreground);
          border-bottom: 1px solid var(--border);
        }
        
        /* Grid Borders */
        .rbc-day-bg, .rbc-month-row, .rbc-month-view, .rbc-time-view, .rbc-time-header, .rbc-time-content, .rbc-timeslot-group {
          border-color: var(--border) !important;
        }
        
        /* Rounding the main view corners */
        .rbc-month-view {
          min-height: 500px !important;
        }
        
        .rbc-month-view, .rbc-time-view {
          border-radius: 8px;
          overflow: hidden;
          background-color: var(--background);
        }
        
        .rbc-off-range-bg {
          background-color: color-mix(in srgb, var(--muted) 30%, transparent) !important;
        }
        
        .rbc-event-content {
          font-size: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-weight: 500;
          color: #ffffff !important;
        }
        
        .rbc-time-slot {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        
        .rbc-allday-cell {
          display: none !important;
        }
        
        .rbc-time-header-content {
          border-left: 1px solid var(--border) !important;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        eventPropGetter={eventPropGetter}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%", width: "100%", flexGrow: 1 }}
        onSelectEvent={handleSelectEvent}
        date={currentDate}
        view={currentView}
        onNavigate={(newDate) => setCurrentDate(newDate)}
        onView={(newView) => setCurrentView(newView)}
        min={minTime}
        max={maxTime}
        step={15}
        timeslots={4}
        messages={{
          next: "Suivant",
          previous: "Précédent",
          today: "Aujourd'hui",
          month: "Mois",
          week: "Semaine",
          day: "Jour",
          agenda: "Planning",
          date: "Date",
          time: "Heure",
          event: "Rendez-vous",
          noEventsInRange: "Aucun rendez-vous sur cette période.",
          showMore: (total) => `+ ${total} autres`,
        }}
        components={{
          event: ({ event }) => (
            <div className="flex items-center gap-1 overflow-hidden font-medium">
              <Eye className="w-3 h-3 shrink-0" />
              <span className="truncate">{event.title}</span>
            </div>
          ),
        }}
      />
    </div>
  );
}
