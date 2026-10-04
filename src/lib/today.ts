const warsawDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function warsawToday(): string {
  return warsawDay.format(new Date());
}
