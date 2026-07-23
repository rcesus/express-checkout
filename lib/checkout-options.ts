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
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export const SUPPORTED_NETWORKS: Option[] = [
  { value: "visa", label: "Visa" },
  { value: "masterCard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
];

export const COLUMN_OPTIONS: Option[] = [
  { value: "1", label: "1 column" },
  { value: "2", label: "2 columns" },
];

export interface CheckoutConfig {
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
}

export const DEFAULT_CHECKOUT: CheckoutConfig = {
  applePayEnabled: true,
  applePayCrossBrowser: true,
  applePayButtonStyle: "black",
  applePayButtonType: "plain",
  googlePayEnabled: true,
  googlePayButtonStyle: "dark",
  supportedNetworks: ["visa", "masterCard", "amex", "discover"],
  columns: 1,
  buttonHeight: 50,
  buttonBorderRadius: 10,
  paddingX: 10,
  paddingY: 10,
};
