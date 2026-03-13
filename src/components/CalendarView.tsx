"use client";

import React, { useMemo, useState } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { AppointmentRecord } from "@/app/admin/appointments/page";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NewAppointmentForm } from "@/components/NewAppointmentForm";

import { getPatientColor } from "@/lib/utils/colors";

// Setup the localizer for react-big-calendar
moment.locale("fr", {
  week: {
    dow: 1, // Monday is the first day of the week
  },
});
const localizer = momentLocalizer(moment);

// Unused interface removed

export function CalendarView({
  initialAppointments,
}: {
  initialAppointments: AppointmentRecord[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentRecord | null>(
    null,
  );

  const events = useMemo(() => {
    return initialAppointments.map((appt) => {
      const startDate = new Date(appt.appointment_date);
      const endDate = new Date(
        startDate.getTime() + appt.duration_minutes * 60000,
      );
      const patientData = appt.patients;
      const patient = Array.isArray(patientData) ? patientData[0] : patientData;
      const patientName = patient
        ? `${patient.first_name} ${patient.last_name}`
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
        status: appt.status,
        originalRecord: appt,
      };
    });
  }, [initialAppointments]);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
  };

  const handleSelectEvent = (event: { originalRecord: AppointmentRecord }) => {
    setSelectedEvent(event.originalRecord);
  };

  const eventPropGetter = (event: {
    patientId?: string;
    id: string;
    status: string;
  }) => {
    const bg = getPatientColor(event.patientId, event.id);

    return {
      style: {
        backgroundColor: currentView === "month" ? "transparent" : bg,
        borderColor:
          currentView === "month" ? "transparent" : "rgba(255,255,255,0.2)",
        color: "#ffffff",
      },
      className: cn(
        "custom-rbc-event shadow-sm transition-all hover:scale-[1.02] hover:z-50 hover:shadow-lg",
        currentView === "month" && "month-item-wrapper",
        event.status === "completed" && "grayscale-[0.3] opacity-60",
        event.status === "cancelled" && "opacity-40 grayscale line-through",
        event.status === "no-show" && "opacity-80",
      ),
    };
  };

  // Define calendar boundaries (8:00 AM to 8:00 PM)
  const minTime = new Date();
  minTime.setHours(8, 0, 0);
  const maxTime = new Date();
  maxTime.setHours(20, 0, 0);

  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate("PREV");
    };
    const goToNext = () => {
      toolbar.onNavigate("NEXT");
    };
    const goToCurrent = () => {
      toolbar.onNavigate("TODAY");
    };

    const label = () => {
      const date = moment(toolbar.date);
      if (toolbar.view === "month") {
        return date.format("MMMM YYYY");
      }
      if (toolbar.view === "day") {
        return date.format("dddd D MMMM");
      }
      if (toolbar.view === "week") {
        const start = moment(toolbar.date).startOf("week").add(1, "days");
        const end = moment(toolbar.date).endOf("week").add(1, "days");
        return `${start.format("D MMM")} — ${end.format("D MMM")}`;
      }
      return toolbar.label;
    };

    return (
      <div className="rbc-toolbar !flex flex-col md:flex-row items-center justify-between gap-6 mb-8 px-2">
        <div className="rbc-btn-group !m-0">
          <button type="button" onClick={goToCurrent} className="!border-r-0">
            Aujourd'hui
          </button>
          <button type="button" onClick={goToBack} className="!border-r-0">
            Précédent
          </button>
          <button type="button" onClick={goToNext}>
            Suivant
          </button>
        </div>

        <span className="rbc-toolbar-label !m-0 !text-2xl font-black font-outfit uppercase tracking-tighter text-slate-900 border-b-4 border-primary/10 pb-1">
          {label()}
        </span>

        <div className="rbc-btn-group !m-0">
          <button
            type="button"
            className={cn(toolbar.view === "month" && "rbc-active")}
            onClick={() => toolbar.onView("month")}
          >
            Mois
          </button>
          <button
            type="button"
            className={cn(toolbar.view === "week" && "rbc-active")}
            onClick={() => toolbar.onView("week")}
          >
            Semaine
          </button>
          <button
            type="button"
            className={cn(toolbar.view === "day" && "rbc-active")}
            onClick={() => toolbar.onView("day")}
          >
            Jour
          </button>
          <button
            type="button"
            className={cn(toolbar.view === "agenda" && "rbc-active")}
            onClick={() => toolbar.onView("agenda")}
          >
            Planning
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-background rounded-2xl border-none shadow-none flex flex-col relative">
      {/* Creation Modal Triggered by Slot Selection */}
      <NewAppointmentForm
        hideTrigger
        isOpenOverride={!!selectedSlot}
        onOpenChangeOverride={(open) => !open && setSelectedSlot(null)}
        initialData={
          selectedSlot
            ? {
                date: selectedSlot.start,
                time: format(selectedSlot.start, "HH:mm"),
                duration: String(
                  (selectedSlot.end.getTime() - selectedSlot.start.getTime()) /
                    60000,
                ),
              }
            : undefined
        }
      />

      {/* Edit Modal Triggered by Event Selection */}
      <NewAppointmentForm
        hideTrigger
        isOpenOverride={!!selectedEvent}
        onOpenChangeOverride={(open) => !open && setSelectedEvent(null)}
        initialData={
          selectedEvent
            ? {
                id: selectedEvent.id,
                patient: selectedEvent.patients as any,
                date: new Date(selectedEvent.appointment_date),
                time: format(new Date(selectedEvent.appointment_date), "HH:mm"),
                duration: String(selectedEvent.duration_minutes),
                notes: selectedEvent.notes,
                status: selectedEvent.status,
              }
            : undefined
        }
      />

      <style suppressHydrationWarning>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          margin-bottom: 2rem !important;
          padding: 0 1rem;
        }
        .rbc-btn-group {
          background: var(--slate-50);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .rbc-btn-group button {
          border: none !important;
          border-radius: 8px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 10px !important;
          padding: 6px 16px !important;
          color: var(--slate-500) !important;
        }
        .rbc-btn-group button:hover {
          background-color: var(--slate-100) !important;
        }
        .rbc-btn-group button.rbc-active {
          background-color: white !important;
          color: var(--primary) !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        }
        
        .rbc-toolbar-label {
          font-weight: 900 !important;
          font-family: &apos;Outfit&apos;, sans-serif !important;
          text-transform: uppercase !important;
          letter-spacing: -0.02em !important;
          font-size: 1.5rem !important;
        }

        /* MONTH VIEW CUSTOM STYLING */
        .rbc-month-view {
          border: 1px solid var(--slate-100) !important;
          border-radius: 24px !important;
          background: white !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05) !important;
        }

        .rbc-month-row {
          border: none !important;
        }

        .rbc-day-bg {
          border-left: 1px solid var(--slate-50) !important;
          border-bottom: 1px solid var(--slate-50) !important;
        }

        .rbc-row-content {
          z-index: 4 !important;
        }

        .rbc-row-segment {
          padding: 0 4px !important;
        }

        .month-item-wrapper {
          background: transparent !important;
          border: none !important;
        }

        .compact-month-indicator {
          width: 100%;
          height: 18px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 4px;
          font-size: 8px !important;
          font-weight: 900;
          color: white;
          text-transform: uppercase;
        }

        /* TIME VIEW CUSTOM STYLING */
        .rbc-time-view {
          border: 1px solid var(--slate-100) !important;
          border-radius: 24px !important;
          background: white !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05) !important;
        }

        .rbc-timeslot-group {
          min-height: 80px !important;
        }

        .rbc-header {
          padding: 20px 0 !important;
          background: var(--slate-50) !important;
          border-bottom: 1px solid var(--slate-100) !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 10px !important;
          color: var(--slate-400) !important;
        }

        .rbc-today {
          background-color: var(--primary-50) !important;
        }

        .custom-rbc-event {
          border-radius: 12px !important;
          border: none !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 10px -2px rgb(0 0 0 / 0.2) !important;
        }

        .rbc-event-content {
          font-weight: 800 !important;
          font-size: 11px !important;
        }

        .rbc-time-gutter .rbc-timeslot-group {
          border: none !important;
          font-weight: 700 !important;
          font-size: 10px !important;
          color: var(--slate-300) !important;
        }

        .rbc-current-time-indicator {
          background-color: var(--rose-500) !important;
          height: 2px !important;
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
        onSelectSlot={handleSelectSlot}
        selectable
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
          event: ({ event }: { event: any }) =>
            currentView === "month" ? (
              <div
                className="compact-month-indicator"
                style={{
                  backgroundColor: getPatientColor(event.patientId, event.id),
                }}
              >
                <Clock className="w-2 h-2 mr-1 shrink-0" />
                <span className="truncate">
                  {moment(event.start).format("HH:mm")} {event.title}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">
                    {moment(event.start).format("HH:mm")}
                  </span>
                </div>
                <span className="truncate leading-tight">{event.title}</span>
              </div>
            ),
          toolbar: CustomToolbar,
        }}
      />
    </div>
  );
}
