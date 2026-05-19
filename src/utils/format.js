export function formatINR(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `Rs ${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.abs(value) < 100 ? Math.min(digits, 2) : 0
  })}`;
}

export function formatNumber(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function formatVolume(value) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  const n = Number(value);
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

export function formatPercent(value, options = {}) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  const n = Number(value);
  const sign = options.sign === false || n < 0 ? "" : "+";
  return `${sign}${n.toFixed(options.digits ?? 2)}%`;
}

export function classForChange(value) {
  if (Number(value) > 0) return "up";
  if (Number(value) < 0) return "dn";
  return "neu";
}

export function timeIST(date = new Date(), withSeconds = false) {
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined
  });
}

export function dateIST(date = new Date()) {
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}
