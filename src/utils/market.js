// Capital Market Segment holidays from NSE circular NSE/CMTR/71775.
export const NSE_HOLIDAYS_2026 = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-03", name: "Holi" },
  { date: "2026-03-26", name: "Ram Navami" },
  { date: "2026-03-31", name: "Mahavir Jayanti" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-14", name: "Dr. Baba Saheb Ambedkar Jayanti" },
  { date: "2026-05-01", name: "Maharashtra Day" },
  { date: "2026-05-28", name: "Bakri Id" },
  { date: "2026-06-26", name: "Muharram" },
  { date: "2026-09-14", name: "Ganesh Chaturthi" },
  { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dussehra" },
  { date: "2026-11-10", name: "Diwali Balipratipada" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti" },
  { date: "2026-12-25", name: "Christmas" }
];

export function getIndiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    ymd: `${get("year")}-${get("month")}-${get("day")}`
  };
}

export function isNseHoliday(date = new Date()) {
  const { ymd } = getIndiaParts(date);
  return NSE_HOLIDAYS_2026.find((holiday) => holiday.date === ymd) || null;
}

export function getMarketStatus(date = new Date()) {
  const india = getIndiaParts(date);
  const holiday = isNseHoliday(date);
  const weekend = india.weekday === "Sat" || india.weekday === "Sun";
  const totalMinutes = india.hour * 60 + india.minute;

  if (weekend) {
    return {
      open: false,
      phase: "closed",
      label: "Market Closed",
      detail: "Weekend - NSE/BSE equity session is closed.",
      source: "NSE calendar"
    };
  }

  if (holiday) {
    return {
      open: false,
      phase: "holiday",
      label: "Market Holiday",
      detail: holiday.name,
      source: "NSE calendar"
    };
  }

  if (totalMinutes >= 540 && totalMinutes < 555) {
    return {
      open: false,
      phase: "pre",
      label: "Pre Open",
      detail: "Pre-open session: 09:00-09:15 IST.",
      source: "session engine"
    };
  }

  if (totalMinutes >= 555 && totalMinutes < 930) {
    return {
      open: true,
      phase: "open",
      label: "Market Live",
      detail: "Regular session: 09:15-15:30 IST.",
      source: "session engine"
    };
  }

  if (totalMinutes >= 930 && totalMinutes < 940) {
    return {
      open: false,
      phase: "closing",
      label: "Closing Session",
      detail: "Closing session: 15:30-15:40 IST.",
      source: "session engine"
    };
  }

  return {
    open: false,
    phase: "closed",
    label: "Market Closed",
    detail: "NSE/BSE opens at 09:15 IST on the next trading day.",
    source: "session engine"
  };
}

export function getStatusClass(phase) {
  if (phase === "open") return "s-open";
  if (phase === "pre" || phase === "closing") return "s-pre";
  return "s-closed";
}

export function getStatusDotClass(phase) {
  if (phase === "open") return "bk-g";
  if (phase === "pre" || phase === "closing") return "bk-a";
  return "bk-r";
}
