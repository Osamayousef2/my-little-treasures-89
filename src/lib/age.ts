export function ageAt(birth: string | null | undefined, when: string | null | undefined): string | null {
  if (!birth || !when) return null;
  const b = new Date(birth);
  const w = new Date(when);
  if (isNaN(b.getTime()) || isNaN(w.getTime()) || w < b) return null;
  let years = w.getFullYear() - b.getFullYear();
  let months = w.getMonth() - b.getMonth();
  let days = w.getDate() - b.getDate();
  if (days < 0) months -= 1;
  if (months < 0) { years -= 1; months += 12; }

  const y = years, m = months;
  if (y === 0 && m === 0) return "أقل من شهر";
  const yPart = y === 0 ? "" : y === 1 ? "سنة" : y === 2 ? "سنتان" : y >= 3 && y <= 10 ? `${y} سنوات` : `${y} سنة`;
  const mPart = m === 0 ? "" : m === 1 ? "شهر" : m === 2 ? "شهران" : m >= 3 && m <= 10 ? `${m} أشهر` : `${m} شهراً`;
  if (yPart && mPart) return `${yPart} و${mPart}`;
  return yPart || mPart;
}
