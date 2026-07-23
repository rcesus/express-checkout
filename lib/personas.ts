export type EndMode = "untilCancel" | "specificDate";

export const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "every2weeks", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "every3months", label: "Every 3 months" },
  { value: "every6months", label: "Every 6 months" },
  { value: "annually", label: "Annually" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

export interface Persona {
  amount: number;
  defaultFrequency: Frequency;
  defaultEndMode: EndMode;
  /** Months after the start date for the default specific end date. */
  defaultEndOffsetMonths: number;
}

export const PERSONA: Persona = {
  amount: 425,
  defaultFrequency: "monthly",
  defaultEndMode: "specificDate",
  defaultEndOffsetMonths: 6,
};

/** The customer is already known at wallet-enrollment time, so these are fixed. */
export const CUSTOMER = {
  firstName: "Jordan",
  lastName: "Rivera",
  email: "jordan.rivera@example.com",
  address1: "456 Oak Street",
  city: "Portland",
  state: "OR",
  zip: "97214",
  country: "US",
} as const;

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Local-time YYYY-MM-DD. isoDate formats in UTC, which drifts a day west of UTC
// in the evening. The autopay start-date floor has to match the component's
// validator, which works in local time, so date math for it formats locally.
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return localIsoDate(d);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}
