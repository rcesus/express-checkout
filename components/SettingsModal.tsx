"use client";

import { useEffect, useState } from "react";
import {
  APPLE_PAY_BUTTON_STYLES,
  APPLE_PAY_BUTTON_TYPES,
  APPLE_PAY_LANGUAGES,
  GOOGLE_PAY_BUTTON_STYLES,
  GOOGLE_PAY_LANGUAGES,
  SUPPORTED_NETWORKS,
  COLUMN_OPTIONS,
  CURRENCY_OPTIONS,
  SHIPPING_CONTACT_FIELDS,
  INVOICE_TYPE_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  INVOICE_FREQUENCIES,
  DEFAULT_CHECKOUT,
  freshInvoiceData,
  nextInvoiceNumber,
  type CheckoutConfig,
  type InvoiceData,
  type TriState,
} from "@/lib/checkout-options";

export interface PaypointSettings {
  entryPoint: string;
  publicToken: string;
  checkout: CheckoutConfig;
}

interface Props {
  open: boolean;
  settings: PaypointSettings;
  hasPrivateToken: boolean;
  onSave: (settings: PaypointSettings, privateTokenSaved: boolean) => void;
  onClose: () => void;
}

type Tab = "connection" | "mode" | "style" | "networks";

export default function SettingsModal({ open, settings, hasPrivateToken, onSave, onClose }: Props) {
  const [entryPoint, setEntryPoint] = useState(settings.entryPoint);
  const [publicToken, setPublicToken] = useState(settings.publicToken);
  const [privateToken, setPrivateToken] = useState("");
  const [checkout, setCheckout] = useState<CheckoutConfig>(settings.checkout);
  const [tab, setTab] = useState<Tab>("connection");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEntryPoint(settings.entryPoint);
      setPublicToken(settings.publicToken);
      setPrivateToken("");
      setCheckout(settings.checkout);
      setTab("connection");
      setError("");
    }
  }, [open, settings]);

  if (!open) return null;

  const isOneTime = checkout.paymentMode === "one_time";
  const isAutopay = checkout.paymentMode === "autopay";
  const isTokenization = checkout.paymentMode === "tokenization";
  const isScheduledInvoice = checkout.invoiceData.invoiceType === 1;

  function patch(next: Partial<CheckoutConfig>) {
    setCheckout((c) => ({ ...c, ...next }));
  }

  function patchInvoice(next: Partial<InvoiceData>) {
    setCheckout((c) => ({ ...c, invoiceData: { ...c.invoiceData, ...next } }));
  }

  // First enable seeds the fields (fresh number, today's dates); a later
  // re-enable keeps whatever's already there.
  function toggleInvoice(on: boolean) {
    setCheckout((c) => ({
      ...c,
      attachInvoice: on,
      invoiceData: on && !c.invoiceData.invoiceNumber ? freshInvoiceData() : c.invoiceData,
    }));
  }

  function resetSizes() {
    patch({
      buttonHeight: DEFAULT_CHECKOUT.buttonHeight,
      buttonBorderRadius: DEFAULT_CHECKOUT.buttonBorderRadius,
      paddingX: DEFAULT_CHECKOUT.paddingX,
      paddingY: DEFAULT_CHECKOUT.paddingY,
    });
  }

  function toggleShippingField(value: string) {
    setCheckout((c) => {
      const on = c.requiredShippingContactFields.includes(value);
      return {
        ...c,
        requiredShippingContactFields: on
          ? c.requiredShippingContactFields.filter((n) => n !== value)
          : [...c.requiredShippingContactFields, value],
      };
    });
  }

  function toggleNetwork(value: string) {
    setCheckout((c) => {
      const on = c.supportedNetworks.includes(value);
      return {
        ...c,
        supportedNetworks: on
          ? c.supportedNetworks.filter((n) => n !== value)
          : [...c.supportedNetworks, value],
      };
    });
  }

  async function handleSave() {
    setError("");
    if (!entryPoint.trim() || !publicToken.trim()) {
      setError("Entrypoint and public token are required.");
      return;
    }
    if (checkout.supportedNetworks.length === 0) {
      setError("Pick at least one card network.");
      return;
    }
    setSaving(true);
    let privateSaved = hasPrivateToken;
    try {
      if (privateToken.trim()) {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privateToken: privateToken.trim() }),
        });
        if (!res.ok) throw new Error("Could not store the private token.");
        privateSaved = true;
      }
      onSave(
        { entryPoint: entryPoint.trim(), publicToken: publicToken.trim(), checkout },
        privateSaved,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong saving settings.");
    } finally {
      setSaving(false);
    }
  }

  const invoiceSection = (
    <fieldset className="end-mode">
      <legend>Invoice</legend>
      <label className="radio">
        <input
          type="checkbox"
          checked={checkout.attachInvoice}
          onChange={(e) => toggleInvoice(e.target.checked)}
        />
        Attach invoice data
      </label>
      {checkout.attachInvoice && (
        <>
          <label>
            Invoice number
            <div className="search-row">
              <input
                type="text"
                value={checkout.invoiceData.invoiceNumber}
                onChange={(e) => patchInvoice({ invoiceNumber: e.target.value })}
              />
              <button
                type="button"
                className="btn secondary"
                onClick={() => patchInvoice({ invoiceNumber: nextInvoiceNumber() })}
              >
                Regenerate
              </button>
            </div>
          </label>
          <label>
            Invoice date
            <input
              type="date"
              value={checkout.invoiceData.invoiceDate}
              onChange={(e) => patchInvoice({ invoiceDate: e.target.value })}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={checkout.invoiceData.invoiceDueDate}
              onChange={(e) => patchInvoice({ invoiceDueDate: e.target.value })}
            />
          </label>
          <label>
            Type
            <select
              value={String(checkout.invoiceData.invoiceType)}
              onChange={(e) => patchInvoice({ invoiceType: Number(e.target.value) })}
            >
              {INVOICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={String(checkout.invoiceData.invoiceStatus)}
              onChange={(e) => patchInvoice({ invoiceStatus: Number(e.target.value) })}
            >
              {INVOICE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {isScheduledInvoice && (
            <>
              <label>
                Frequency
                <select
                  value={checkout.invoiceData.frequency}
                  onChange={(e) => patchInvoice({ frequency: e.target.value })}
                >
                  {INVOICE_FREQUENCIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Invoice end date
                <input
                  type="date"
                  value={checkout.invoiceData.invoiceEndDate}
                  onChange={(e) => patchInvoice({ invoiceEndDate: e.target.value })}
                />
              </label>
            </>
          )}
        </>
      )}
    </fieldset>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "connection"}
            className={`modal-tab${tab === "connection" ? " active" : ""}`}
            onClick={() => setTab("connection")}
          >
            Connection
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mode"}
            className={`modal-tab${tab === "mode" ? " active" : ""}`}
            onClick={() => setTab("mode")}
          >
            Mode
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "style"}
            className={`modal-tab${tab === "style" ? " active" : ""}`}
            onClick={() => setTab("style")}
          >
            Button Styling &amp; Sizing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "networks"}
            className={`modal-tab${tab === "networks" ? " active" : ""}`}
            onClick={() => setTab("networks")}
          >
            Networks &amp; Shipping
          </button>
        </div>

        {/* Panel the tabs sit on. Only the win95 theme frames it. */}
        <div className="modal-panel">
        {tab === "connection" && (
          <>
            <label>
              Entrypoint
              <input
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label>
              Public Token
              <input
                value={publicToken}
                onChange={(e) => setPublicToken(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label>
              Private Token
              <input
                type="password"
                value={privateToken}
                onChange={(e) => setPrivateToken(e.target.value)}
                autoComplete="off"
              />
            </label>
          </>
        )}

        {tab === "mode" && (
          <>
            <fieldset className="end-mode">
              <legend>Payment mode</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={isOneTime}
                  onChange={() => patch({ paymentMode: "one_time" })}
                />
                One-time payment
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={isAutopay}
                  onChange={() => patch({ paymentMode: "autopay" })}
                />
                Autopay (recurring)
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={isTokenization}
                  onChange={() => patch({ paymentMode: "tokenization" })}
                />
                Tokenization (save method, no charge)
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Fee and currency</legend>
              <label>
                Fee
                <input
                  type="text"
                  value={checkout.fee}
                  onChange={(e) => patch({ fee: e.target.value })}
                />
              </label>
              <label>Currency</label>
              {CURRENCY_OPTIONS.map((o) => (
                <label className="radio" key={o.value}>
                  <input
                    type="radio"
                    name="currency"
                    checked={checkout.currency === o.value}
                    onChange={() => patch({ currency: o.value })}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>

            {isOneTime && (
              <fieldset className="end-mode">
                <legend>One-time options</legend>
                <label className="radio">
                  <input
                    type="checkbox"
                    checked={checkout.saveIfSuccess}
                    onChange={(e) => patch({ saveIfSuccess: e.target.checked })}
                  />
                  Also save the card on success (pay + tokenize)
                </label>
                <label>
                  Return transaction details (includeDetails)
                  <select
                    value={checkout.includeDetails}
                    onChange={(e) => patch({ includeDetails: e.target.value as TriState })}
                  >
                    <option value="">Not set</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </label>
              </fieldset>
            )}

            {isTokenization && (
              <fieldset className="end-mode">
                <legend>Tokenization options</legend>
                <label>
                  Fallback auth amount
                  <input
                    type="text"
                    value={checkout.fallbackAuthAmount}
                    onChange={(e) => patch({ fallbackAuthAmount: e.target.value })}
                  />
                </label>
                <label>
                  Method description
                  <input
                    type="text"
                    value={checkout.methodDescription}
                    onChange={(e) => patch({ methodDescription: e.target.value })}
                  />
                </label>
              </fieldset>
            )}

            {(isOneTime || isAutopay) && invoiceSection}
          </>
        )}

        {tab === "style" && (
          <>
            <fieldset className="end-mode">
              <legend>Apple Pay</legend>
              <label className="radio">
                <input
                  type="checkbox"
                  checked={checkout.applePayEnabled}
                  onChange={(e) => patch({ applePayEnabled: e.target.checked })}
                />
                Enabled
              </label>
              <label className="radio">
                <input
                  type="checkbox"
                  checked={checkout.applePayCrossBrowser}
                  disabled={!checkout.applePayEnabled}
                  onChange={(e) => patch({ applePayCrossBrowser: e.target.checked })}
                />
                Show on non-Safari browsers
              </label>
              <label>
                Button style
                <select
                  value={checkout.applePayButtonStyle}
                  disabled={!checkout.applePayEnabled}
                  onChange={(e) => patch({ applePayButtonStyle: e.target.value })}
                >
                  {APPLE_PAY_BUTTON_STYLES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Button text
                <select
                  value={checkout.applePayButtonType}
                  disabled={!checkout.applePayEnabled}
                  onChange={(e) => patch({ applePayButtonType: e.target.value })}
                >
                  {APPLE_PAY_BUTTON_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={checkout.applePayLanguage}
                  disabled={!checkout.applePayEnabled}
                  onChange={(e) => patch({ applePayLanguage: e.target.value })}
                >
                  {APPLE_PAY_LANGUAGES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Google Pay</legend>
              <label className="radio">
                <input
                  type="checkbox"
                  checked={checkout.googlePayEnabled}
                  onChange={(e) => patch({ googlePayEnabled: e.target.checked })}
                />
                Enabled
              </label>
              <label>
                Button style
                <select
                  value={checkout.googlePayButtonStyle}
                  disabled={!checkout.googlePayEnabled}
                  onChange={(e) => patch({ googlePayButtonStyle: e.target.value })}
                >
                  {GOOGLE_PAY_BUTTON_STYLES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={checkout.googlePayLanguage}
                  disabled={!checkout.googlePayEnabled}
                  onChange={(e) => patch({ googlePayLanguage: e.target.value })}
                >
                  {GOOGLE_PAY_LANGUAGES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Layout</legend>
              {COLUMN_OPTIONS.map((o) => (
                <label className="radio" key={o.value}>
                  <input
                    type="radio"
                    name="columns"
                    checked={checkout.columns === Number(o.value)}
                    onChange={() => patch({ columns: Number(o.value) })}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="end-mode">
              <legend>Button size (Apple Pay and Google Pay)</legend>
              <label className="slider">
                <span className="slider-label">Height</span>
                <input
                  type="range"
                  min={30}
                  max={70}
                  value={checkout.buttonHeight}
                  onChange={(e) => patch({ buttonHeight: Number(e.target.value) })}
                />
                <span className="slider-value">{checkout.buttonHeight}px</span>
              </label>
              <label className="slider">
                <span className="slider-label">Corner radius</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={checkout.buttonBorderRadius}
                  onChange={(e) => patch({ buttonBorderRadius: Number(e.target.value) })}
                />
                <span className="slider-value">{checkout.buttonBorderRadius}px</span>
              </label>
              <label className="slider">
                <span className="slider-label">Horizontal padding</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={checkout.paddingX}
                  onChange={(e) => patch({ paddingX: Number(e.target.value) })}
                />
                <span className="slider-value">{checkout.paddingX}px</span>
              </label>
              <label className="slider">
                <span className="slider-label">Vertical padding</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={checkout.paddingY}
                  onChange={(e) => patch({ paddingY: Number(e.target.value) })}
                />
                <span className="slider-value">{checkout.paddingY}px</span>
              </label>
              <button type="button" className="btn secondary reset-sizes" onClick={resetSizes}>
                Reset to defaults
              </button>
            </fieldset>
          </>
        )}

        {tab === "networks" && (
          <>
            <fieldset className="end-mode">
              <legend>Card networks</legend>
              {SUPPORTED_NETWORKS.map((o) => (
                <label className="radio" key={o.value}>
                  <input
                    type="checkbox"
                    checked={checkout.supportedNetworks.includes(o.value)}
                    onChange={() => toggleNetwork(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="end-mode">
              <legend>Required shipping contact fields</legend>
              {SHIPPING_CONTACT_FIELDS.map((field) => (
                <label key={field.value} className="radio">
                  <input
                    type="checkbox"
                    checked={checkout.requiredShippingContactFields.includes(field.value)}
                    onChange={() => toggleShippingField(field.value)}
                  />
                  {field.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
