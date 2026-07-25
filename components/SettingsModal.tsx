"use client";

import { useEffect, useState } from "react";
import {
  APPLE_PAY_BUTTON_STYLES,
  APPLE_PAY_BUTTON_TYPES,
  GOOGLE_PAY_BUTTON_STYLES,
  SUPPORTED_NETWORKS,
  COLUMN_OPTIONS,
  SHIPPING_CONTACT_FIELDS,
  DEFAULT_CHECKOUT,
  type CheckoutConfig,
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

export default function SettingsModal({ open, settings, hasPrivateToken, onSave, onClose }: Props) {
  const [entryPoint, setEntryPoint] = useState(settings.entryPoint);
  const [publicToken, setPublicToken] = useState(settings.publicToken);
  const [privateToken, setPrivateToken] = useState("");
  const [checkout, setCheckout] = useState<CheckoutConfig>(settings.checkout);
  const [tab, setTab] = useState<"connection" | "checkout" | "styling" | "sizing" | "advanced">(
    "connection",
  );
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

  function patch(next: Partial<CheckoutConfig>) {
    setCheckout((c) => ({ ...c, ...next }));
  }

  function resetSizes() {
    patch({
      buttonHeight: DEFAULT_CHECKOUT.buttonHeight,
      buttonBorderRadius: DEFAULT_CHECKOUT.buttonBorderRadius,
      paddingX: DEFAULT_CHECKOUT.paddingX,
      paddingY: DEFAULT_CHECKOUT.paddingY,
    });
  }

  function resetAdvanced() {
    patch({
      includeDetails: DEFAULT_CHECKOUT.includeDetails,
      fee: DEFAULT_CHECKOUT.fee,
      currency: DEFAULT_CHECKOUT.currency,
      saveIfSuccess: DEFAULT_CHECKOUT.saveIfSuccess,
      applePayLanguage: DEFAULT_CHECKOUT.applePayLanguage,
      googlePayButtonType: DEFAULT_CHECKOUT.googlePayButtonType,
      googlePayLanguage: DEFAULT_CHECKOUT.googlePayLanguage,
      requiredShippingContactFields: DEFAULT_CHECKOUT.requiredShippingContactFields,
      customerId: DEFAULT_CHECKOUT.customerId,
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
            aria-selected={tab === "checkout"}
            className={`modal-tab${tab === "checkout" ? " active" : ""}`}
            onClick={() => setTab("checkout")}
          >
            Checkout Options
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "styling"}
            className={`modal-tab${tab === "styling" ? " active" : ""}`}
            onClick={() => setTab("styling")}
          >
            Button Styling
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "sizing"}
            className={`modal-tab${tab === "sizing" ? " active" : ""}`}
            onClick={() => setTab("sizing")}
          >
            Button Sizing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "advanced"}
            className={`modal-tab${tab === "advanced" ? " active" : ""}`}
            onClick={() => setTab("advanced")}
          >
            Advanced
          </button>
        </div>

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

        {tab === "checkout" && (
          <>
            <fieldset className="end-mode">
              <legend>Payment Mode</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={checkout.paymentMode === "one_time"}
                  onChange={() => patch({ paymentMode: "one_time" })}
                />
                One-time payment
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={checkout.paymentMode === "autopay"}
                  onChange={() => patch({ paymentMode: "autopay" })}
                />
                Autopay (recurring)
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Customer Identifier (autopay)</legend>
              <label className="radio">
                <input
                  type="checkbox"
                  checked={checkout.useCustomerId}
                  disabled={checkout.paymentMode !== "autopay"}
                  onChange={(e) => patch({ useCustomerId: e.target.checked })}
                />
                Send as customerId instead of customerNumber
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Card Networks</legend>
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
          </>
        )}

        {tab === "styling" && (
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
            </fieldset>

            <fieldset className="end-mode">
              <legend>Layout</legend>
              <label>
                <select
                  value={String(checkout.columns)}
                  onChange={(e) => patch({ columns: Number(e.target.value) })}
                >
                  {COLUMN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </>
        )}

        {tab === "sizing" && (
          <>
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

        {tab === "advanced" && (
          <>
            <fieldset className="end-mode">
              <legend>Wallet request options</legend>
              <label>
                Include details
                <select
                  value={checkout.includeDetails}
                  onChange={(e) => patch({ includeDetails: e.target.value as TriState })}
                >
                  <option value="">Not set</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </label>
              <label>
                Save if success
                <select
                  value={checkout.saveIfSuccess}
                  onChange={(e) => patch({ saveIfSuccess: e.target.value as TriState })}
                >
                  <option value="">Not set</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </label>
              <label>
                Fee
                <input
                  type="text"
                  value={checkout.fee}
                  onChange={(e) => patch({ fee: e.target.value })}
                />
              </label>
              <label>
                Currency
                <input
                  type="text"
                  value={checkout.currency}
                  onChange={(e) => patch({ currency: e.target.value })}
                />
              </label>
            </fieldset>

            <fieldset className="end-mode">
              <legend>Wallet language</legend>
              <label>
                Apple Pay language
                <input
                  type="text"
                  value={checkout.applePayLanguage}
                  onChange={(e) => patch({ applePayLanguage: e.target.value })}
                />
              </label>
              <label>
                Google Pay button type
                <input
                  type="text"
                  value={checkout.googlePayButtonType}
                  onChange={(e) => patch({ googlePayButtonType: e.target.value })}
                />
              </label>
              <label>
                Google Pay language
                <input
                  type="text"
                  value={checkout.googlePayLanguage}
                  onChange={(e) => patch({ googlePayLanguage: e.target.value })}
                />
              </label>
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

            <fieldset className="end-mode">
              <legend>Customer ID (experimental)</legend>
              <label>
                Customer ID
                <input
                  type="text"
                  value={checkout.customerId}
                  onChange={(e) => patch({ customerId: e.target.value })}
                />
              </label>
              <button type="button" className="btn secondary reset-advanced" onClick={resetAdvanced}>
                Reset to defaults
              </button>
            </fieldset>
          </>
        )}

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
