// SPEC: key-dates.md
// Pure data — no React, no imports.

export type Region = "US" | "CA" | "GB" | "IE" | "ZA" | "FR" | "DE" | "ES" | "PT";

export interface Holiday {
  name: string;
  region: Region;
  month: number; // 1–12
  day: number;   // 1–31 (for fixed-date holidays; ignored when isVariable = true)
  isVariable?: boolean; // date changes each year — look up in VARIABLE_HOLIDAY_DATES
  note?: string;
}

// ---------------------------------------------------------------------------
// Variable-date holidays — actual dates per year
// ---------------------------------------------------------------------------

export const VARIABLE_HOLIDAY_DATES: Record<
  string,
  Record<number, { month: number; day: number }>
> = {
  // Easter Sunday
  "Easter Sunday": {
    2024: { month: 3, day: 31 },
    2025: { month: 4, day: 20 },
    2026: { month: 4, day: 5 },
    2027: { month: 3, day: 28 },
  },
  // Easter Monday (Easter Sunday + 1 day)
  "Easter Monday": {
    2024: { month: 4, day: 1 },
    2025: { month: 4, day: 21 },
    2026: { month: 4, day: 6 },
    2027: { month: 3, day: 29 },
  },
  // Good Friday (Easter Sunday − 2 days)
  "Good Friday": {
    2024: { month: 3, day: 29 },
    2025: { month: 4, day: 18 },
    2026: { month: 4, day: 3 },
    2027: { month: 3, day: 26 },
  },
  // Ascension Thursday (Easter Sunday + 39 days)
  "Ascension Day": {
    2024: { month: 5, day: 9 },
    2025: { month: 5, day: 29 },
    2026: { month: 5, day: 14 },
    2027: { month: 5, day: 6 },
  },
  // Whit Monday / Pentecost Monday (Easter Sunday + 50 days)
  "Whit Monday": {
    2024: { month: 5, day: 20 },
    2025: { month: 6, day: 9 },
    2026: { month: 5, day: 25 },
    2027: { month: 5, day: 17 },
  },
  // Corpus Christi (Easter Sunday + 60 days)
  "Corpus Christi": {
    2024: { month: 5, day: 30 },
    2025: { month: 6, day: 19 },
    2026: { month: 6, day: 4 },
    2027: { month: 5, day: 27 },
  },
  // US MLK Day — 3rd Monday in January
  "Martin Luther King Jr. Day": {
    2024: { month: 1, day: 15 },
    2025: { month: 1, day: 20 },
    2026: { month: 1, day: 19 },
    2027: { month: 1, day: 18 },
  },
  // US Presidents' Day — 3rd Monday in February
  "Presidents' Day": {
    2024: { month: 2, day: 19 },
    2025: { month: 2, day: 17 },
    2026: { month: 2, day: 16 },
    2027: { month: 2, day: 15 },
  },
  // US Memorial Day — last Monday in May
  "Memorial Day": {
    2024: { month: 5, day: 27 },
    2025: { month: 5, day: 26 },
    2026: { month: 5, day: 25 },
    2027: { month: 5, day: 31 },
  },
  // US Labor Day — 1st Monday in September
  "Labor Day": {
    2024: { month: 9, day: 2 },
    2025: { month: 9, day: 1 },
    2026: { month: 9, day: 7 },
    2027: { month: 9, day: 6 },
  },
  // US Columbus Day — 2nd Monday in October
  "Columbus Day": {
    2024: { month: 10, day: 14 },
    2025: { month: 10, day: 13 },
    2026: { month: 10, day: 12 },
    2027: { month: 10, day: 11 },
  },
  // US Thanksgiving — 4th Thursday in November
  "Thanksgiving Day": {
    2024: { month: 11, day: 28 },
    2025: { month: 11, day: 27 },
    2026: { month: 11, day: 26 },
    2027: { month: 11, day: 25 },
  },
  // Canada Family Day — 3rd Monday in February (BC/AB/SK/ON/NB; NS uses same day)
  "Family Day (Canada)": {
    2024: { month: 2, day: 19 },
    2025: { month: 2, day: 17 },
    2026: { month: 2, day: 16 },
    2027: { month: 2, day: 15 },
  },
  // Canada Victoria Day — Monday before May 25
  "Victoria Day": {
    2024: { month: 5, day: 20 },
    2025: { month: 5, day: 19 },
    2026: { month: 5, day: 18 },
    2027: { month: 5, day: 24 },
  },
  // Canada Civic Holiday — 1st Monday in August
  "Civic Holiday": {
    2024: { month: 8, day: 5 },
    2025: { month: 8, day: 4 },
    2026: { month: 8, day: 3 },
    2027: { month: 8, day: 2 },
  },
  // Canada Labour Day — 1st Monday in September
  "Labour Day (Canada)": {
    2024: { month: 9, day: 2 },
    2025: { month: 9, day: 1 },
    2026: { month: 9, day: 7 },
    2027: { month: 9, day: 6 },
  },
  // Canada Thanksgiving — 2nd Monday in October
  "Thanksgiving Day (Canada)": {
    2024: { month: 10, day: 14 },
    2025: { month: 10, day: 13 },
    2026: { month: 10, day: 12 },
    2027: { month: 10, day: 11 },
  },
  // UK Early May Bank Holiday — 1st Monday in May
  "Early May Bank Holiday": {
    2024: { month: 5, day: 6 },
    2025: { month: 5, day: 5 },
    2026: { month: 5, day: 4 },
    2027: { month: 5, day: 3 },
  },
  // UK Spring Bank Holiday — last Monday in May
  "Spring Bank Holiday": {
    2024: { month: 5, day: 27 },
    2025: { month: 5, day: 26 },
    2026: { month: 5, day: 25 },
    2027: { month: 5, day: 31 },
  },
  // UK Summer Bank Holiday (England/Wales) — last Monday in August
  "Summer Bank Holiday": {
    2024: { month: 8, day: 26 },
    2025: { month: 8, day: 25 },
    2026: { month: 8, day: 31 },
    2027: { month: 8, day: 30 },
  },
  // Ireland May Bank Holiday — 1st Monday in May
  "May Bank Holiday": {
    2024: { month: 5, day: 6 },
    2025: { month: 5, day: 5 },
    2026: { month: 5, day: 4 },
    2027: { month: 5, day: 3 },
  },
  // Ireland June Bank Holiday — 1st Monday in June
  "June Bank Holiday": {
    2024: { month: 6, day: 3 },
    2025: { month: 6, day: 2 },
    2026: { month: 6, day: 1 },
    2027: { month: 6, day: 7 },
  },
  // Ireland August Bank Holiday — 1st Monday in August
  "August Bank Holiday": {
    2024: { month: 8, day: 5 },
    2025: { month: 8, day: 4 },
    2026: { month: 8, day: 3 },
    2027: { month: 8, day: 2 },
  },
  // Ireland October Bank Holiday — last Monday in October
  "October Bank Holiday": {
    2024: { month: 10, day: 28 },
    2025: { month: 10, day: 27 },
    2026: { month: 10, day: 26 },
    2027: { month: 10, day: 25 },
  },
};

// ---------------------------------------------------------------------------
// Fixed-date holidays
// ---------------------------------------------------------------------------

export const HOLIDAYS: Holiday[] = [
  // -------------------------------------------------------------------------
  // United States
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "US", month: 1, day: 1, note: "Observed Monday if falls on weekend" },
  { name: "Martin Luther King Jr. Day", region: "US", month: 1, day: 15, isVariable: true },
  { name: "Presidents' Day", region: "US", month: 2, day: 19, isVariable: true },
  { name: "Memorial Day", region: "US", month: 5, day: 27, isVariable: true },
  { name: "Juneteenth", region: "US", month: 6, day: 19, note: "Observed Monday if falls on weekend" },
  { name: "Independence Day", region: "US", month: 7, day: 4, note: "Observed Monday if falls on weekend" },
  { name: "Labor Day", region: "US", month: 9, day: 2, isVariable: true },
  { name: "Columbus Day", region: "US", month: 10, day: 14, isVariable: true },
  { name: "Veterans Day", region: "US", month: 11, day: 11, note: "Observed Monday if falls on weekend" },
  { name: "Thanksgiving Day", region: "US", month: 11, day: 28, isVariable: true },
  { name: "Christmas Day", region: "US", month: 12, day: 25, note: "Observed Monday if falls on weekend" },

  // -------------------------------------------------------------------------
  // Canada
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "CA", month: 1, day: 1 },
  { name: "Family Day (Canada)", region: "CA", month: 2, day: 19, isVariable: true, note: "Most provinces; date varies slightly by province" },
  { name: "Good Friday", region: "CA", month: 3, day: 29, isVariable: true },
  { name: "Victoria Day", region: "CA", month: 5, day: 20, isVariable: true },
  { name: "Canada Day", region: "CA", month: 7, day: 1 },
  { name: "Civic Holiday", region: "CA", month: 8, day: 5, isVariable: true, note: "BC Day / Simcoe Day / Heritage Day — name varies by province" },
  { name: "Labour Day (Canada)", region: "CA", month: 9, day: 2, isVariable: true },
  { name: "Thanksgiving Day (Canada)", region: "CA", month: 10, day: 14, isVariable: true },
  { name: "Remembrance Day", region: "CA", month: 11, day: 11 },
  { name: "Christmas Day", region: "CA", month: 12, day: 25 },
  { name: "Boxing Day", region: "CA", month: 12, day: 26 },

  // -------------------------------------------------------------------------
  // United Kingdom
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "GB", month: 1, day: 1, note: "Substitute day if 1 Jan falls on weekend" },
  { name: "Good Friday", region: "GB", month: 3, day: 29, isVariable: true },
  { name: "Easter Monday", region: "GB", month: 4, day: 1, isVariable: true, note: "England, Wales & Northern Ireland only" },
  { name: "Early May Bank Holiday", region: "GB", month: 5, day: 6, isVariable: true },
  { name: "Spring Bank Holiday", region: "GB", month: 5, day: 27, isVariable: true },
  { name: "Summer Bank Holiday", region: "GB", month: 8, day: 26, isVariable: true, note: "England & Wales — Scotland uses 1st Monday in August" },
  { name: "Christmas Day", region: "GB", month: 12, day: 25, note: "Substitute day if falls on weekend" },
  { name: "Boxing Day", region: "GB", month: 12, day: 26, note: "Substitute day if falls on weekend" },

  // -------------------------------------------------------------------------
  // Ireland
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "IE", month: 1, day: 1 },
  { name: "St. Brigid's Day", region: "IE", month: 2, day: 3, note: "First Monday in February (or 1 Feb if it falls on a Friday)" },
  { name: "St. Patrick's Day", region: "IE", month: 3, day: 17 },
  { name: "Easter Monday", region: "IE", month: 4, day: 1, isVariable: true },
  { name: "May Bank Holiday", region: "IE", month: 5, day: 6, isVariable: true },
  { name: "June Bank Holiday", region: "IE", month: 6, day: 3, isVariable: true },
  { name: "August Bank Holiday", region: "IE", month: 8, day: 5, isVariable: true },
  { name: "October Bank Holiday", region: "IE", month: 10, day: 28, isVariable: true },
  { name: "Christmas Day", region: "IE", month: 12, day: 25 },
  { name: "St. Stephen's Day", region: "IE", month: 12, day: 26 },

  // -------------------------------------------------------------------------
  // South Africa
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "ZA", month: 1, day: 1 },
  { name: "Human Rights Day", region: "ZA", month: 3, day: 21 },
  { name: "Good Friday", region: "ZA", month: 3, day: 29, isVariable: true },
  { name: "Family Day", region: "ZA", month: 4, day: 1, isVariable: true, note: "Easter Monday" },
  { name: "Freedom Day", region: "ZA", month: 4, day: 27 },
  { name: "Workers' Day", region: "ZA", month: 5, day: 1 },
  { name: "Youth Day", region: "ZA", month: 6, day: 16 },
  { name: "National Women's Day", region: "ZA", month: 8, day: 9 },
  { name: "Heritage Day", region: "ZA", month: 9, day: 24 },
  { name: "Day of Reconciliation", region: "ZA", month: 12, day: 16 },
  { name: "Christmas Day", region: "ZA", month: 12, day: 25 },
  { name: "Day of Goodwill", region: "ZA", month: 12, day: 26 },

  // -------------------------------------------------------------------------
  // France
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "FR", month: 1, day: 1 },
  { name: "Easter Monday", region: "FR", month: 4, day: 1, isVariable: true },
  { name: "Labour Day", region: "FR", month: 5, day: 1 },
  { name: "Victory in Europe Day", region: "FR", month: 5, day: 8 },
  { name: "Ascension Day", region: "FR", month: 5, day: 9, isVariable: true },
  { name: "Whit Monday", region: "FR", month: 5, day: 20, isVariable: true },
  { name: "Bastille Day", region: "FR", month: 7, day: 14 },
  { name: "Assumption of Mary", region: "FR", month: 8, day: 15 },
  { name: "All Saints' Day", region: "FR", month: 11, day: 1 },
  { name: "Armistice Day", region: "FR", month: 11, day: 11 },
  { name: "Christmas Day", region: "FR", month: 12, day: 25 },

  // -------------------------------------------------------------------------
  // Germany
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "DE", month: 1, day: 1 },
  { name: "Good Friday", region: "DE", month: 3, day: 29, isVariable: true },
  { name: "Easter Monday", region: "DE", month: 4, day: 1, isVariable: true },
  { name: "Labour Day", region: "DE", month: 5, day: 1 },
  { name: "Ascension Day", region: "DE", month: 5, day: 9, isVariable: true },
  { name: "Whit Monday", region: "DE", month: 5, day: 20, isVariable: true },
  { name: "German Unity Day", region: "DE", month: 10, day: 3 },
  { name: "Christmas Day", region: "DE", month: 12, day: 25 },
  { name: "Second Day of Christmas", region: "DE", month: 12, day: 26 },

  // -------------------------------------------------------------------------
  // Spain
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "ES", month: 1, day: 1 },
  { name: "Epiphany", region: "ES", month: 1, day: 6 },
  { name: "Good Friday", region: "ES", month: 3, day: 29, isVariable: true },
  { name: "Labour Day", region: "ES", month: 5, day: 1 },
  { name: "Assumption of Mary", region: "ES", month: 8, day: 15 },
  { name: "National Day of Spain", region: "ES", month: 10, day: 12 },
  { name: "All Saints' Day", region: "ES", month: 11, day: 1 },
  { name: "Constitution Day", region: "ES", month: 12, day: 6 },
  { name: "Immaculate Conception", region: "ES", month: 12, day: 8 },
  { name: "Christmas Day", region: "ES", month: 12, day: 25 },

  // -------------------------------------------------------------------------
  // Portugal
  // -------------------------------------------------------------------------
  { name: "New Year's Day", region: "PT", month: 1, day: 1 },
  { name: "Good Friday", region: "PT", month: 3, day: 29, isVariable: true },
  { name: "Easter Sunday", region: "PT", month: 3, day: 31, isVariable: true },
  { name: "Freedom Day", region: "PT", month: 4, day: 25 },
  { name: "Labour Day", region: "PT", month: 5, day: 1 },
  { name: "Portugal Day", region: "PT", month: 6, day: 10 },
  { name: "Corpus Christi", region: "PT", month: 5, day: 30, isVariable: true },
  { name: "Assumption of Mary", region: "PT", month: 8, day: 15 },
  { name: "Republic Day", region: "PT", month: 10, day: 5 },
  { name: "All Saints' Day", region: "PT", month: 11, day: 1 },
  { name: "Restoration of Independence", region: "PT", month: 12, day: 1 },
  { name: "Immaculate Conception", region: "PT", month: 12, day: 8 },
  { name: "Christmas Day", region: "PT", month: 12, day: 25 },
];

// ---------------------------------------------------------------------------
// Helper: resolve a holiday to a concrete { month, day } for a given year
// ---------------------------------------------------------------------------

export function resolveHolidayDate(
  holiday: Holiday,
  year: number
): { month: number; day: number } | null {
  if (!holiday.isVariable) {
    return { month: holiday.month, day: holiday.day };
  }
  const entry = VARIABLE_HOLIDAY_DATES[holiday.name];
  if (!entry) return null;
  return entry[year] ?? null;
}

// ---------------------------------------------------------------------------
// Region display labels
// ---------------------------------------------------------------------------

export const REGION_LABELS: Record<Region, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IE: "Ireland",
  ZA: "South Africa",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  PT: "Portugal",
};

export const ALL_REGIONS: Region[] = ["US", "CA", "GB", "IE", "ZA", "FR", "DE", "ES", "PT"];
