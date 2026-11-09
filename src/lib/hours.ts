export type DayHours = {
  day: string;
  short: string;
  open: number | null;
  close: number | null;
};

export const HOURS: DayHours[] = [
  { day: "Monday", short: "Mon", open: null, close: null },
  { day: "Tuesday", short: "Tue", open: 12, close: 21 },
  { day: "Wednesday", short: "Wed", open: 12, close: 21 },
  { day: "Thursday", short: "Thu", open: 12, close: 21 },
  { day: "Friday", short: "Fri", open: 12, close: 22 },
  { day: "Saturday", short: "Sat", open: 12, close: 22 },
  { day: "Sunday", short: "Sun", open: 12, close: 20 },
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${suffix}`;
};

export const hoursLabel = (day: DayHours) =>
  day.open === null || day.close === null
    ? "Closed"
    : `${formatHour(day.open)} – ${formatHour(day.close)}`;

type ChicagoTime = { dayIndex: number; minutes: number };

const chicagoTime = (date = new Date()): ChicagoTime => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sunday";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    dayIndex: Math.max(WEEKDAYS.indexOf(weekday), 0),
    minutes: hour * 60 + minute,
  };
};

export type StoreStatus = {
  isOpen: boolean;
  todayIndex: number;
  today: DayHours;
  label: string;
  detail: string;
  isLunchWindow: boolean;
};

export const getStoreStatus = (date = new Date()): StoreStatus => {
  const { dayIndex, minutes } = chicagoTime(date);
  const today = HOURS.find((day) => day.day === WEEKDAYS[dayIndex]) ?? HOURS[0];
  const opensAt = today.open === null ? null : today.open * 60;
  const closesAt = today.close === null ? null : today.close * 60;

  const isOpen =
    opensAt !== null && closesAt !== null && minutes >= opensAt && minutes < closesAt;

  const isLunchWindow =
    dayIndex >= 1 && dayIndex <= 5 && minutes >= 12 * 60 && minutes < 16 * 60;

  if (isOpen && closesAt !== null) {
    const minutesLeft = closesAt - minutes;
    return {
      isOpen: true,
      todayIndex: dayIndex,
      today,
      label: "Open now",
      detail:
        minutesLeft <= 60
          ? `Closing in ${minutesLeft} min`
          : `Kitchen open until ${formatHour(today.close ?? 0)}`,
      isLunchWindow,
    };
  }

  // Find the next day that is open.
  for (let offset = 0; offset < 8; offset += 1) {
    const index = (dayIndex + offset) % 7;
    const day = HOURS.find((entry) => entry.day === WEEKDAYS[index]);
    if (!day || day.open === null) continue;

    const openingMinutes = day.open * 60;
    if (offset === 0 && minutes >= openingMinutes) continue;

    return {
      isOpen: false,
      todayIndex: dayIndex,
      today,
      label: "Closed right now",
      detail:
        offset === 0
          ? `Opens today at ${formatHour(day.open)}`
          : `Opens ${day.short} at ${formatHour(day.open)}`,
      isLunchWindow,
    };
  }

  return {
    isOpen: false,
    todayIndex: dayIndex,
    today,
    label: "Closed right now",
    detail: hoursLabel(today),
    isLunchWindow,
  };
};

export const lunchSlots = () => {
  const slots: string[] = [];
  for (let minutes = 12 * 60; minutes <= 15 * 60 + 30; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const normalized = hour % 12 === 0 ? 12 : hour % 12;
    slots.push(`${normalized}:${minute.toString().padStart(2, "0")} ${suffix}`);
  }
  return slots;
};

export const isOpenAt = (date = new Date()): boolean => {
  const { dayIndex, minutes } = chicagoTime(date);
  const day = HOURS.find((entry) => entry.day === WEEKDAYS[dayIndex]);
  if (!day || day.open === null || day.close === null) return false;
  return minutes >= day.open * 60 && minutes < day.close * 60;
};

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export type PickupSlot = { value: string; label: string };

/**
 * Quarter-hour slots the kitchen is actually open for, soonest first. Closed
 * days and closing times are skipped rather than offered, so checkout can only
 * ever submit a time the store is open — the Worker checks again anyway.
 */
export const pickupSlots = (count = 6, from = new Date()): PickupSlot[] => {
  const slots: PickupSlot[] = [];
  const start = new Date(from.getTime() + 40 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const today = dayKey(from);

  // Four days of quarter hours is enough to step over a closed day.
  for (let step = 0; step < 4 * 96 && slots.length < count; step += 1) {
    const time = new Date(start.getTime() + step * 15 * 60 * 1000);
    if (!isOpenAt(time)) continue;

    const clock = time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });

    slots.push({
      value: time.toISOString(),
      label:
        dayKey(time) === today
          ? clock
          : `${new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Chicago",
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(time)} at ${clock}`,
    });
  }

  return slots;
};
