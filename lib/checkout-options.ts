// Ad-hoc ExpressCheckout config surfaced as editable controls in the settings
// modal, so a tester can flip wallet options without a code change. Enum values
// come from the Payabli ExpressCheckout guide. The docs only show "black-outline"
// for Apple Pay buttonStyle; the rest below are the standard Apple set and are
// not guaranteed by the docs.

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

export type PaymentMode = "one_time" | "autopay";

// Tri-state string instead of boolean so the Advanced tab can tell "not set"
// (omit the key) apart from an explicit false.
export type TriState = "" | "true" | "false";

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
  saveIfSuccess: boolean;
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
  applePayLanguage: "en-US",
  googlePayLanguage: "en",
  requiredShippingContactFields: [],
  customerId: "12345",
};
