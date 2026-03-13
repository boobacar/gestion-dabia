(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/CalendarView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarView",
    ()=>CalendarView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$big$2d$calendar$2f$dist$2f$react$2d$big$2d$calendar$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-big-calendar/dist/react-big-calendar.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$moment$2f$moment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/moment/moment.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$moment$2f$locale$2f$fr$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/moment/locale/fr.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
// Setup the localizer for react-big-calendar
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$moment$2f$moment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].locale("fr", {
    week: {
        dow: 1
    }
});
const localizer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$big$2d$calendar$2f$dist$2f$react$2d$big$2d$calendar$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["momentLocalizer"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$moment$2f$moment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]);
function CalendarView({ initialAppointments }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [currentDate, setCurrentDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date());
    const [currentView, setCurrentView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("week");
    const events = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CalendarView.useMemo[events]": ()=>{
            // Convert DB appointments to Calendar items
            return initialAppointments.map({
                "CalendarView.useMemo[events]": (appt)=>{
                    const startDate = new Date(appt.appointment_date);
                    const endDate = new Date(startDate.getTime() + appt.duration_minutes * 60000);
                    // Create a nice title
                    const patientName = appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "Patient Inconnu";
                    const eventTitle = appt.notes ? `${patientName} - ${appt.notes}` : patientName;
                    return {
                        id: appt.id,
                        title: eventTitle,
                        start: startDate,
                        end: endDate,
                        patientId: appt.patient_id
                    };
                }
            }["CalendarView.useMemo[events]"]);
        }
    }["CalendarView.useMemo[events]"], [
        initialAppointments
    ]);
    const handleSelectEvent = (event)=>{
        // Navigate to patient file
        router.push(`/admin/patients/${event.patientId}`);
    };
    const eventPropGetter = (event)=>{
        let hash = 0;
        const str = event.patientId || event.id;
        for(let i = 0; i < str.length; i++){
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            "hsl(var(--primary))",
            "#0ea5e9",
            "#10b981",
            "#8b5cf6",
            "#f59e0b",
            "#ec4899",
            "#ef4444"
        ];
        const bg = colors[Math.abs(hash) % colors.length];
        return {
            style: {
                backgroundColor: bg,
                borderColor: "rgba(0,0,0,0.1)",
                color: "#ffffff"
            },
            className: "custom-rbc-event"
        };
    };
    // Define calendar boundaries (8:00 AM to 8:00 PM)
    const minTime = new Date();
    minTime.setHours(8, 0, 0);
    const maxTime = new Date();
    maxTime.setHours(20, 0, 0);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-[650px] w-full bg-background rounded-xl border p-6 shadow-sm flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                suppressHydrationWarning: true,
                children: `
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
      `
            }, void 0, false, {
                fileName: "[project]/src/components/CalendarView.tsx",
                lineNumber: 103,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$big$2d$calendar$2f$dist$2f$react$2d$big$2d$calendar$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Calendar"], {
                localizer: localizer,
                events: events,
                eventPropGetter: eventPropGetter,
                startAccessor: "start",
                endAccessor: "end",
                style: {
                    height: "100%",
                    width: "100%",
                    flexGrow: 1
                },
                onSelectEvent: handleSelectEvent,
                date: currentDate,
                view: currentView,
                onNavigate: (newDate)=>setCurrentDate(newDate),
                onView: (newView)=>setCurrentView(newView),
                min: minTime,
                max: maxTime,
                step: 15,
                timeslots: 4,
                messages: {
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
                    showMore: (total)=>`+ ${total} autres`
                },
                components: {
                    event: ({ event })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1 overflow-hidden font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                    className: "w-3 h-3 shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CalendarView.tsx",
                                    lineNumber: 231,
                                    columnNumber: 15
                                }, void 0),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "truncate",
                                    children: event.title
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CalendarView.tsx",
                                    lineNumber: 232,
                                    columnNumber: 15
                                }, void 0)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/CalendarView.tsx",
                            lineNumber: 230,
                            columnNumber: 13
                        }, void 0)
                }
            }, void 0, false, {
                fileName: "[project]/src/components/CalendarView.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/CalendarView.tsx",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
_s(CalendarView, "tDj0XnbAh+doZ1kb+LjvqT+d/cE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CalendarView;
var _c;
__turbopack_context__.k.register(_c, "CalendarView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_CalendarView_tsx_dceb20f9._.js.map