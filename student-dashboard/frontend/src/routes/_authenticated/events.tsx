import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Users, ExternalLink, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getLocalItems, SEED_EVENTS } from "@/lib/mock-data";
import { eventVisibleToProfile } from "@/lib/content-filters";
import { GovIdentity } from "@/components/gov-brand";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsPage,
});

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type EventCategory = "academics" | "non-academics" | "sports" | "general";

function getEventCategory(event: any): EventCategory {
  if (event?.category === "academics" || event?.category === "non-academics" || event?.category === "sports" || event?.category === "general") {
    return event.category;
  }

  const titleLower = `${event.title ?? ""} ${event.description ?? ""} ${event.event_kind ?? ""}`.toLowerCase();
  if (/exam|test|revision|model|unit|term|quarterly|half-yearly|பரீட்சை|தேர்வு|மாதிரி|அலகு|மீளாய்வு/i.test(titleLower)) return "academics";
  if (/tournament|match|practice|sports|athletic|track|field|kabaddi|yoga|விளையாட்டு|போட்டி|பயிற்சி/i.test(titleLower)) return "sports";
  if (/holiday|festival|public holiday|government holiday|விடுமுறை|பண்டிகை|தினம்|ramzan|bakrid/i.test(titleLower)) return "general";
  return "non-academics";
}

const CATEGORY_OPTIONS: EventCategory[] = ["academics", "non-academics", "sports", "general"];

const CATEGORY_COLORS: Record<EventCategory, {
  chip: string;
  active: string;
  border: string;
  dot: string;
  text: string;
  accent: string;
}> = {
  academics: {
    chip: "bg-blue-50 text-blue-800 border-blue-200",
    active: "bg-blue-600 text-white border-blue-700 shadow-sm",
    border: "border-blue-500",
    dot: "bg-blue-500",
    text: "text-blue-700",
    accent: "bg-blue-600",
  },
  "non-academics": {
    chip: "bg-green-50 text-green-800 border-green-200",
    active: "bg-green-600 text-white border-green-700 shadow-sm",
    border: "border-green-500",
    dot: "bg-green-500",
    text: "text-green-700",
    accent: "bg-green-600",
  },
  sports: {
    chip: "bg-red-50 text-red-800 border-red-200",
    active: "bg-red-600 text-white border-red-700 shadow-sm",
    border: "border-red-500",
    dot: "bg-red-500",
    text: "text-red-700",
    accent: "bg-red-600",
  },
  general: {
    chip: "bg-amber-50 text-amber-900 border-amber-200",
    active: "bg-amber-500 text-amber-950 border-amber-600 shadow-sm",
    border: "border-amber-500",
    dot: "bg-amber-500",
    text: "text-amber-700",
    accent: "bg-amber-500",
  },
};

const CATEGORY_BORDER_CLASSES: Record<EventCategory, string> = {
  academics: "border-blue-500",
  sports: "border-red-500",
  "non-academics": "border-green-500",
  general: "border-amber-500",
};

const CATEGORY_PRIORITY: EventCategory[] = ["academics", "non-academics", "sports", "general"];
const EVENTS_CATEGORY_STORAGE_KEY = "events:selected-category";

function parseISODate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventRange(event: any): [Date, Date] {
  const start = parseISODate(event.start_date) ?? parseISODate(event.event_date) ?? parseISODate(event.date) ?? new Date();
  const end = parseISODate(event.end_date) ?? start;
  const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return normalizedEnd.getTime() >= normalizedStart.getTime() ? [normalizedStart, normalizedEnd] : [normalizedStart, normalizedStart];
}

function eventOccursOn(event: any, date: Date) {
  const [start, end] = getEventRange(event);
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return current.getTime() >= start.getTime() && current.getTime() <= end.getTime();
}

function getPrimaryCategory(dayEvents: any[], selectedCategory: EventCategory | null): EventCategory | null {
  if (selectedCategory) return selectedCategory;
  for (const category of CATEGORY_PRIORITY) {
    if (dayEvents.some((event) => getEventCategory(event) === category)) return category;
  }
  return null;
}

function getStoredCategory(): EventCategory | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(EVENTS_CATEGORY_STORAGE_KEY);
  return CATEGORY_OPTIONS.includes(stored as EventCategory) ? (stored as EventCategory) : null;
}

function EventsPage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(() => getStoredCategory());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const categoryLabels: Record<EventCategory, string> = {
    academics: t("academics"),
    "non-academics": t("nonAcademics"),
    sports: t("sports"),
    general: t("general"),
  };

  const shortCategoryLabels: Record<EventCategory, string> = {
    academics: t("categoryShortAcademic"),
    sports: t("categoryShortSports"),
    "non-academics": t("categoryShortNonAcademic"),
    general: t("categoryShortGeneral"),
  };

  const weekDays = useMemo(() => {
    const base = new Date(Date.UTC(2026, 4, 31));
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + index);
      return d.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { weekday: "short" });
    });
  }, [lang]);

  useEffect(() => {
    apiRequest<ApiListResponse<any>>("/api/events").then(({ data }) => {
      const fallback = getLocalItems("events", SEED_EVENTS);
      setEvents(
        (data?.length ? data : fallback).filter((item) => eventVisibleToProfile(item, profile, role)),
      );
    }).catch(() => {
      const fallback = getLocalItems("events", SEED_EVENTS);
      setEvents(fallback.filter((item) => eventVisibleToProfile(item, profile, role)));
    });
  }, [profile, role]);

  useEffect(() => {
    if (selectedCategory) window.localStorage.setItem(EVENTS_CATEGORY_STORAGE_KEY, selectedCategory);
    else window.localStorage.removeItem(EVENTS_CATEGORY_STORAGE_KEY);
  }, [selectedCategory]);

  const calendarDays = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const firstDay = start.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDay).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const filteredEvents = events.filter((event) => {
    return selectedCategory ? getEventCategory(event) === selectedCategory : true;
  });

  const eventsForDay = (date: Date) =>
    filteredEvents.filter((event) => eventOccursOn(event, date));

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <h1 className="text-2xl font-bold text-primary">{t("events")}</h1>
        <p className="text-xs opacity-70">{t("schoolEventsContestsExams")}</p>
      </header>

      <div className="space-y-4 p-5">
        {/* Legend removed per UX: holiday names are shown under calendar dates */}

        {/* Category Filter Tabs */}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("eventCategories")}>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory((current) => (current === cat ? null : cat))}
              aria-pressed={selectedCategory === cat}
              aria-label={`${t("eventCategories")}: ${categoryLabels[cat]}`}
              className={`min-h-11 w-full rounded-full border px-3 text-center text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedCategory === cat
                  ? CATEGORY_COLORS[cat].active
                  : `${CATEGORY_COLORS[cat].chip} hover:shadow-sm`
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <Card className="border-0 p-3 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-bold">{month.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" })}</p>
              <p className="text-[10px] text-muted-foreground">{t("syncedWithDeviceDate")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? eventsForDay(day) : [];
              const dayCategory = day ? getPrimaryCategory(dayEvents, selectedCategory) : null;
              const hasEvents = dayEvents.length > 0;
              const dayCategories = Array.from(new Set(dayEvents.map(getEventCategory)));

              const dayClasses = hasEvents && dayCategory
                ? `border-2 ${CATEGORY_BORDER_CLASSES[dayCategory]} bg-white shadow-sm`
                : day
                  ? "border border-border/60 bg-white/70"
                  : "border border-transparent";

              return (
                <button
                  onClick={() => day && hasEvents && setSelectedDate(day)}
                  disabled={!day || !hasEvents}
                  key={day?.toISOString() ?? `blank-${index}`}
                  className={[
                    "flex h-10 min-w-0 flex-col items-center justify-center rounded-xl text-xs font-medium transition-all cursor-pointer",
                      day ? dayClasses : "border border-transparent",
                    day && selectedDate && sameDay(day, selectedDate)
                      ? dayCategory
                        ? `ring-2 ${CATEGORY_BORDER_CLASSES[dayCategory].replace("border-", "ring-")} ring-inset`
                        : "ring-2 ring-primary ring-inset"
                      : day && sameDay(day, today)
                        ? dayCategory
                          ? `ring-2 ${CATEGORY_BORDER_CLASSES[dayCategory].replace("border-", "ring-")} ring-inset`
                          : "ring-2 ring-primary ring-inset"
                        : "",
                    hasEvents ? "hover:shadow-md" : "",
                    !day || !hasEvents ? "cursor-default" : "",
                  ].join(" ")}
                >
                  <span>{day?.getDate()}</span>
                  {hasEvents && (
                    <span className="mt-1 flex max-w-full gap-0.5" aria-hidden="true">
                      {dayCategories.slice(0, 4).map((category) => (
                        <span key={category} className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[category].dot}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {selectedCategory && filteredEvents.length === 0 && (
          <Card className="border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("noCategoryEvents")}
          </Card>
        )}
      </div>

      {/* Date Details Modal */}
      {selectedDate && (
        <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <DialogContent className="max-w-md">
            <DialogTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {t("events")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDate.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </DialogTitle>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDate ? (
                (() => {
                  const modalEvents = events.filter((ev) => {
                    if (!selectedDate) return false;
                    if (!eventOccursOn(ev, selectedDate)) return false;
                    return selectedCategory ? getEventCategory(ev) === selectedCategory : true;
                  });

                  if (modalEvents.length === 0) {
                    return (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {t("noEventsForDate")}
                      </p>
                    );
                  }

                  return modalEvents.map((event) => {
                    const category = getEventCategory(event);
                    const colors = CATEGORY_COLORS[category];
                    const title = lang === "ta" && event.title_ta ? event.title_ta : event.title;
                    const subject = lang === "ta" && event.subject_ta ? event.subject_ta : event.subject;
                    const venue = event.venue;
                    const eventKind = event.event_kind;
                    const description = event.description;

                    return (
                      <div key={event.id} className={`overflow-hidden rounded-lg border-l-4 border-y border-r ${colors.border}`}>
                        <div className={`flex items-center gap-3 p-3 text-white ${colors.accent}`}>
                          <div className="flex-1">
                            <h3 className="font-bold text-sm">{title}</h3>
                            <p className="text-xs opacity-90">{event.event_time}</p>
                          </div>
                          <span className="rounded-full px-2 py-1 bg-white/20 text-xs font-semibold">
                            {category === "academics"
                              ? shortCategoryLabels.academics
                              : category === "sports"
                                ? shortCategoryLabels.sports
                                : category === "non-academics"
                                  ? shortCategoryLabels["non-academics"]
                                  : shortCategoryLabels.general}
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {category === "academics" && subject && (
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">{t("subjectsLabel")}:</span> {subject}
                            </div>
                          )}
                          {category === "general" && eventKind && (
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">{t("type")}:</span> {eventKind}
                            </div>
                          )}
                          {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {event.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{venue}</span>
                              </div>
                            )}
                            {category === "academics" && subject && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{t("subjectDetails")}: {subject}</span>
                              </div>
                            )}
                            {event.target_class && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{t("class")} {event.target_class}</span>
                              </div>
                            )}
                            {event.event_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{event.event_time}</span>
                              </div>
                            )}
                          </div>
                          {event.registration_url && (
                            <a
                              href={event.registration_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              {t("register")} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
