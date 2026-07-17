// Nepal system helpers: NPR currency formatting, Bikram Sambat (BS) date conversion,
// and Ashad-end fiscal year logic (Nepal's financial year ends mid-July / Ashad 31).

const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];
const BS_MONTHS_NE = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत',
];

// Days in each BS month for a given BS year (approx, valid for 2000-2100 range).
const BS_DAYS: Record<number, number[]> = {
  // year: [Baisakh..Chaitra]
  2080: [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
};
const DEFAULT_BS_DAYS = [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30];

// Reference: BS 2080/01/01 = AD 2023/04/14
const REF_BS_YEAR = 2080;
const REF_BS_MONTH = 1; // Baisakh
const REF_BS_DAY = 1;
const REF_AD = new Date(2023, 3, 14); // April 14, 2023 (month 0-indexed)

function daysInMonth(bsYear: number, bsMonth: number): number {
  const arr = BS_DAYS[bsYear] ?? DEFAULT_BS_DAYS;
  return arr[bsMonth - 1];
}

/** Convert an AD Date to a Bikram Sambat {year, month, day}. */
export function toBS(date: Date): { year: number; month: number; day: number } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((d.getTime() - REF_AD.getTime()) / 86400000);
  let year = REF_BS_YEAR;
  let month = REF_BS_MONTH;
  let day = REF_BS_DAY + diffDays;
  // roll forward
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  // roll backward
  while (day < 1) {
    month--;
    if (month < 1) { month = 12; year--; }
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

/** Format a Date as a Nepali BS date string, optionally in Nepali script. */
export function formatBS(date: Date | string, nepaliScript = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const bs = toBS(d);
  const monthName = nepaliScript ? BS_MONTHS_NE[bs.month - 1] : BS_MONTHS_EN[bs.month - 1];
  return `${bs.year}/${String(bs.month).padStart(2, '0')}/${String(bs.day).padStart(2, '0')} (${monthName})`;
}

/** Nepal fiscal year (Ashad-end). Returns e.g. "2080/81". */
export function fiscalYear(date: Date = new Date()): string {
  const bs = toBS(date);
  // Standard Nepal FY: Baisakh 1 of BS year Y to Ashad 30/31 of BS year Y+1 -> "Y/(Y+1)".
  return `${bs.year}/${bs.year + 1}`;
}

/** Format money in Nepali Rupees. amount is a number; nepaliScript uses रू symbol. */
export function formatNPR(amount: number | string, nepaliScript = false): string {
  const n = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const grouped = n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return nepaliScript ? `रू ${grouped}` : `Rs ${grouped}`;
}

export const NEPAL = {
  baseCurrency: 'NPR',
  vatRate: 0.13,
  currencySymbol: 'Rs',
  currencySymbolNe: 'रू',
  fiscalYearStartMonthBS: 1, // Baisakh
  fiscalYearEndMonthBS: 3, // Ashad
};
