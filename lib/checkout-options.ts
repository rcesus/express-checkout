// Ad-hoc ExpressCheckout config surfaced as editable controls in the settings
// modal, so a tester can flip wallet options without a code change. Enum values
// come from the Payabli ExpressCheckout guide. The docs only show "black-outline"
// for Apple Pay buttonStyle; the rest below are the standard Apple set and are
// not guaranteed by the docs.

import { localIsoDate, addDays } from "./personas";

type Option = { value: string; label: string };

export const APPLE_PAY_BUTTON_STYLES: Option[] = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "white-outline", label: "White Outline" },
];

export const APPLE_PAY_BUTTON_TYPES: Option[] = [
  { value: "plain", label: "Plain" },
  { value: "buy", label: "Buy" },
  { value: "donate", label: "Donate" },
  { value: "check-out", label: "Check out" },
  { value: "book", label: "Book" },
  { value: "continue", label: "Continue" },
  { value: "top-up", label: "Top up" },
  { value: "order", label: "Order" },
  { value: "rent", label: "Rent" },
  { value: "support", label: "Support" },
  { value: "contribute", label: "Contribute" },
  { value: "tip", label: "Tip" },
  { value: "pay", label: "Pay" },
];

export const GOOGLE_PAY_BUTTON_STYLES: Option[] = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
];

export const SUPPORTED_NETWORKS: Option[] = [
  { value: "visa", label: "Visa" },
  { value: "masterCard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
  { value: "jcb", label: "JCB" },
];

// invoiceData enums. Status and type codes are from the invoice lifecycle guide
// (0 draft, 1 active/open, 2 partially paid, 4 paid, 99 canceled; type 0 single,
// 1 scheduled). frequency mirrors the autopay set the component accepts.
export const INVOICE_TYPE_OPTIONS: Option[] = [
  { value: "0", label: "Single" },
  { value: "1", label: "Scheduled" },
];

export const INVOICE_STATUS_OPTIONS: Option[] = [
  { value: "0", label: "Draft" },
  { value: "1", label: "Active / Open" },
  { value: "2", label: "Partially paid" },
  { value: "4", label: "Paid / Complete" },
  { value: "99", label: "Canceled" },
];

export const INVOICE_FREQUENCIES: Option[] = [
  { value: "onetime", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "every2weeks", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "every3months", label: "Every 3 months" },
  { value: "every6months", label: "Every 6 months" },
  { value: "annually", label: "Annually" },
];

export const COLUMN_OPTIONS: Option[] = [
  { value: "1", label: "Vertical" },
  { value: "2", label: "Horizontal" },
];

export const SHIPPING_CONTACT_FIELDS: Option[] = [
  { value: "name", label: "Name" },
  { value: "postalAddress", label: "Postal Address" },
  { value: "phoneNumber", label: "Phone Number" },
  { value: "emailAddress", label: "Email Address" },
];

// BCP 47 locale codes. The ExpressCheckout guide lists these as representative
// supported values, not a guaranteed-exhaustive enum.
export const APPLE_PAY_LANGUAGES: Option[] = [
  { value: "en-US", label: "English (US)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "it-IT", label: "Italian" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "nl-NL", label: "Dutch" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "ru-RU", label: "Russian" },
  { value: "sv-SE", label: "Swedish" },
  { value: "tr-TR", label: "Turkish" },
  { value: "pl-PL", label: "Polish" },
  { value: "cs-CZ", label: "Czech" },
  { value: "da-DK", label: "Danish" },
  { value: "fi-FI", label: "Finnish" },
  { value: "nb-NO", label: "Norwegian (Bokmal)" },
  { value: "nn-NO", label: "Norwegian (Nynorsk)" },
  { value: "hu-HU", label: "Hungarian" },
  { value: "ro-RO", label: "Romanian" },
  { value: "sk-SK", label: "Slovak" },
  { value: "uk-UA", label: "Ukrainian" },
  { value: "vi-VN", label: "Vietnamese" },
  { value: "th-TH", label: "Thai" },
];

// ISO 639-1 codes. Same caveat as above: the guide lists these as
// representative supported values, not a guaranteed-exhaustive enum.
export const GOOGLE_PAY_LANGUAGES: Option[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "bg", label: "Bulgarian" },
  { value: "ca", label: "Catalan" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "es", label: "Spanish" },
  { value: "et", label: "Estonian" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "hr", label: "Croatian" },
  { value: "id", label: "Indonesian" },
];

export type PaymentMode = "one_time" | "autopay" | "tokenization";

// Tri-state string instead of boolean so the modal can tell "not set"
// (omit the key) apart from an explicit false.
export type TriState = "" | "true" | "false";

// expressCheckout.invoiceData. Attaching it makes a successful one-time or
// autopay charge create an invoice; tokenization ignores it. Numeric codes are
// stored as numbers to match the API. Dates are YYYY-MM-DD strings. frequency
// and invoiceEndDate only apply to scheduled invoices (invoiceType 1).
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceDueDate: string;
  invoiceType: number;
  invoiceStatus: number;
  frequency: string;
  invoiceEndDate: string;
}

export interface CheckoutConfig {
  // one_time charges once; autopay sets up a recurring subscription. Autopay is
  // the only mode that uses the frequency/start-date/end controls on the form.
  paymentMode: PaymentMode;
  // Autopay only. Sends the id from POST /api/customer under customerData.customerId
  // instead of customerData.customerNumber. The ExpressCheckout guide documents
  // neither key, so this is here to find out what the component actually does with
  // customerId: identify the existing record, or ignore it and match on name/email.
  useCustomerId: boolean;
  applePayEnabled: boolean;
  applePayCrossBrowser: boolean;
  applePayButtonStyle: string;
  applePayButtonType: string;
  googlePayEnabled: boolean;
  googlePayButtonStyle: string;
  supportedNetworks: string[];
  columns: number;
  // expressCheckout.appearance. These size the whole wallet-button surface,
  // both Apple Pay and Google Pay, not one button. Numbers in px.
  buttonHeight: number;
  buttonBorderRadius: number;
  paddingX: number;
  paddingY: number;
  includeDetails: TriState;
  fee: string;
  currency: string;
  // one-time only. When true, a one-time charge also tokenizes the card and
  // returns the token. This is the "pay + tokenize" flow; there's no separate
  // mode for it.
  saveIfSuccess: boolean;
  // Whether to attach invoiceData to the request. Off by default; the fields
  // below carry prefilled values so enabling it needs no typing.
  attachInvoice: boolean;
  invoiceData: InvoiceData;
  // tokenization only. fallbackAuthAmount is the verify-and-void auth amount;
  // methodDescription labels the saved method.
  fallbackAuthAmount: string;
  methodDescription: string;
  applePayLanguage: string;
  googlePayLanguage: string;
  requiredShippingContactFields: string[];
  // Experimental. Targets the same customerData.customerId key as
  // useCustomerId's real flow, so it only applies when that toggle is off.
  // Here purely to see whether the component/API accepts or ignores it.
  customerId: string;
}

export const DEFAULT_CHECKOUT: CheckoutConfig = {
  paymentMode: "autopay",
  useCustomerId: false,
  applePayEnabled: true,
  applePayCrossBrowser: true,
  applePayButtonStyle: "black",
  applePayButtonType: "plain",
  googlePayEnabled: true,
  googlePayButtonStyle: "black",
  supportedNetworks: ["visa", "masterCard", "amex", "discover"],
  columns: 1,
  buttonHeight: 50,
  buttonBorderRadius: 10,
  paddingX: 10,
  paddingY: 10,
  includeDetails: "true",
  fee: "0",
  currency: "USD",
  saveIfSuccess: false,
  attachInvoice: false,
  // Dates and number stay blank here and get filled by freshInvoiceData() the
  // first time the invoice toggle is switched on, so "today" is the day it's
  // enabled rather than app-load time.
  invoiceData: {
    invoiceNumber: "",
    invoiceDate: "",
    invoiceDueDate: "",
    invoiceType: 0,
    invoiceStatus: 1,
    frequency: "monthly",
    invoiceEndDate: "",
  },
  fallbackAuthAmount: "0.01",
  methodDescription: "Saved via ExpressCheckout",
  applePayLanguage: "en-US",
  googlePayLanguage: "en",
  requiredShippingContactFields: [],
  customerId: "12345",
};

// Date-based, incrementing invoice number: INV-YYYYMMDD-NN. The suffix comes
// from a per-session counter so repeat demo runs don't collide. The field stays
// editable, so this is only the seed.
export function nextInvoiceNumber(): string {
  const today = localIsoDate(new Date()).replace(/-/g, "");
  let seq = 1;
  if (typeof window !== "undefined") {
    const raw = window.sessionStorage.getItem("payabli_invoice_seq");
    seq = raw ? Number(raw) + 1 : 1;
    window.sessionStorage.setItem("payabli_invoice_seq", String(seq));
  }
  return `INV-${today}-${String(seq).padStart(2, "0")}`;
}

// Prefilled invoiceData for the moment the toggle is enabled: a fresh number,
// today's date, and a due date 30 days out. Everything else keeps its default.
export function freshInvoiceData(): InvoiceData {
  const today = localIsoDate(new Date());
  return {
    ...DEFAULT_CHECKOUT.invoiceData,
    invoiceNumber: nextInvoiceNumber(),
    invoiceDate: today,
    invoiceDueDate: addDays(today, 30),
  };
}

// Shapes invoiceData for the request: the core fields always, plus the
// scheduled-only fields (frequency, invoiceEndDate) when invoiceType is 1.
export function buildInvoiceData(inv: InvoiceData): Record<string, unknown> {
  const base: Record<string, unknown> = {
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    invoiceDueDate: inv.invoiceDueDate,
    invoiceType: inv.invoiceType,
    invoiceStatus: inv.invoiceStatus,
  };
  if (inv.invoiceType === 1) {
    base.frequency = inv.frequency;
    if (inv.invoiceEndDate) base.invoiceEndDate = inv.invoiceEndDate;
  }
  return base;
}
