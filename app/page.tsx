"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import SettingsModal, { PaypointSettings } from "@/components/SettingsModal";
import { DEFAULT_CHECKOUT } from "@/lib/checkout-options";
import {
  FREQUENCIES,
  PERSONA,
  CUSTOMER,
  localIsoDate,
  addMonths,
  addDays,
  type Frequency,
  type EndMode,
} from "@/lib/personas";

const SETTINGS_KEY = "payabli_paypoint_settings";
const SANDBOX_SCRIPT = "https://embedded-component-sandbox.payabli.com/component.js";
const CONTAINER_ID = "pay-component-1";

type Result = { ok: boolean; message: string };

export default function Home() {
  const persona = PERSONA;

  const [settings, setSettings] = useState<PaypointSettings>({
    entryPoint: "",
    publicToken: "",
    checkout: DEFAULT_CHECKOUT,
  });
  const [hasPrivateToken, setHasPrivateToken] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Local tomorrow, matching the floor the component's validator builds in local
  // time. The start date is sent to the component as a local datetime (see
  // renderComponent), so tomorrow at local midnight clears its "at least 1 day in
  // the future" check. A bare date would parse as UTC midnight and, west of UTC,
  // fall below that floor.
  const minStartDate = useMemo(() => addDays(localIsoDate(new Date()), 1), []);

  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(persona.defaultFrequency);
  const [startDate, setStartDate] = useState(() => addDays(localIsoDate(new Date()), 1));
  const [endMode, setEndMode] = useState<EndMode>(persona.defaultEndMode);
  const [endDate, setEndDate] = useState(() =>
    addMonths(addDays(localIsoDate(new Date()), 1), persona.defaultEndOffsetMonths ?? 6),
  );

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const [covering, setCovering] = useState(false);

  // Clear the component's result message a few seconds after it appears so it
  // doesn't linger on the page.
  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(() => setResult(null), 5000);
    return () => window.clearTimeout(t);
  }, [result]);

  // Load saved paypoint settings and private-token status once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only checkout options are restored. Entrypoint and public token are
        // never persisted, so they start empty on every new session.
        setSettings((s) => ({
          ...s,
          checkout: { ...DEFAULT_CHECKOUT, ...(parsed.checkout ?? {}) },
        }));
      }
    } catch {
      // ignore malformed storage
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setHasPrivateToken(!!d.hasPrivateToken))
      .catch(() => {});
  }, []);

  function markStale() {
    if (active) {
      setActive(false);
      setResult(null);
      setCovering(false);
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.innerHTML = "";
    }
    setError("");
  }

  const readyToPay = useMemo(
    () => !!settings.entryPoint && !!settings.publicToken && scriptLoaded,
    [settings.entryPoint, settings.publicToken, scriptLoaded],
  );

  function renderComponent(customerNumber?: string) {
    const container = document.getElementById(CONTAINER_ID);
    if (container) container.innerHTML = "";

    // The component validates startDate by parsing it and comparing against a floor
    // it builds in local time (today at local midnight, plus one day). A bare
    // "YYYY-MM-DD" parses as UTC midnight, which sits below that floor west of UTC,
    // so tomorrow gets rejected. Sending a local datetime with no zone parses to
    // local midnight and clears the floor. endDate has no such floor, so it stays
    // date-only.
    const startAt = `${startDate}T00:00:00`;
    const autopay =
      endMode === "specificDate"
        ? { frequency, startDate: startAt, endDate, untilCancel: false }
        : { frequency, startDate: startAt, untilCancel: true };

    const config: Record<string, unknown> = {
      type: "expressCheckout",
      rootContainer: CONTAINER_ID,
      token: settings.publicToken,
      entryPoint: settings.entryPoint,
      // Custom stylesheet applied inside the checkout iframe. Absolute URL so
      // the iframe can fetch it on whatever domain this deploys to.
      customCssUrl: `${window.location.origin}/express-checkout.css`,
      expressCheckout: {
        mode: "autopay",
        amount: amountValue,
        fee: 0,
        currency: "USD",
        supportedNetworks: settings.checkout.supportedNetworks,
        columns: settings.checkout.columns,
        // Component-wide button sizing. Applies to both the Apple Pay and
        // Google Pay buttons, not one wallet.
        appearance: {
          buttonHeight: settings.checkout.buttonHeight,
          buttonBorderRadius: settings.checkout.buttonBorderRadius,
          padding: {
            x: settings.checkout.paddingX,
            y: settings.checkout.paddingY,
          },
        },
        autopay,
        applePay: {
          enabled: settings.checkout.applePayEnabled,
          crossBrowser: settings.checkout.applePayCrossBrowser,
          buttonStyle: settings.checkout.applePayButtonStyle,
          buttonType: settings.checkout.applePayButtonType,
          language: "en-US",
        },
        googlePay: {
          enabled: settings.checkout.googlePayEnabled,
          buttonStyle: settings.checkout.googlePayButtonStyle,
          buttonType: "plain",
          language: "en",
        },
      },
      customerData: {
        ...(customerNumber ? { customerNumber } : {}),
        firstName: CUSTOMER.firstName,
        lastName: CUSTOMER.lastName,
        billingEmail: CUSTOMER.email,
      },
      functionCallBackReady: () => {
        // The ready event is the latest lifecycle signal Payabli exposes; there
        // is no documented "styling applied" callback. A short buffer after it
        // gives the iframe's fetched stylesheet time to paint before we uncover.
        window.setTimeout(() => setCovering(false), 250);
      },
      functionCallBackSuccess: (data: {
        data?: { responseData?: { referenceId?: string } };
        paymentMethod?: string;
      }) => {
        const ref = data?.data?.responseData?.referenceId;
        setResult({
          ok: true,
          message: ref
            ? `Subscription created. Reference ${ref}.`
            : "Subscription created.",
        });
      },
      functionCallBackError: (data: { error?: { responseText?: string } }) => {
        setResult({
          ok: false,
          message: data?.error?.responseText || "The payment setup failed.",
        });
      },
      functionCallBackCancel: () => {
        setResult({ ok: false, message: "The payer cancelled the setup." });
      },
    };

    // Cover the container so the iframe's own white first paint never shows.
    setCovering(true);
    new PayabliComponent(config);
  }

  async function handleContinue() {
    setError("");
    setResult(null);

    if (!settings.entryPoint || !settings.publicToken) {
      setError("Add your entrypoint and public token in settings first.");
      return;
    }
    if (!hasPrivateToken) {
      setError("Creating the customer record needs a private token. Add one in settings.");
      return;
    }
    if (startDate < minStartDate) {
      setError("Pick a start date at least one day in the future.");
      return;
    }
    if (!scriptLoaded || typeof PayabliComponent !== "function") {
      setError("The payment component is still loading. Try again in a moment.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryPoint: settings.entryPoint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Customer creation failed.");
      const customerNumber = String(data.customerId);
      renderComponent(customerNumber);
      setActive(true);
    } catch (e) {
      setCovering(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function saveSettings(next: PaypointSettings, privateTokenSaved: boolean) {
    setSettings(next);
    setHasPrivateToken(privateTokenSaved);
    try {
      // Only checkout options are persisted. Entrypoint and public token stay
      // in memory for this session and are never written to storage.
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify({ checkout: next.checkout }));
    } catch {
      // ignore storage failures
    }
    markStale();
  }

  const amountValue = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : persona.amount;
  }, [amount, persona.amount]);

  return (
    <div className="page">
      <Script
        src={SANDBOX_SCRIPT}
        strategy="afterInteractive"
        data-test=""
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
      />

      <header className="topbar">
        <div />
        <button
          className="gear"
          aria-label="Paypoint settings"
          onClick={() => setModalOpen(true)}
        >
          ⚙
        </button>
      </header>

      <main className="grid">
        <section className="card form">
          <div className="customer-card">
            <span className="customer-label">Customer</span>
            <p className="customer-name">
              {CUSTOMER.firstName} {CUSTOMER.lastName}
            </p>
            <p className="customer-line">
              {CUSTOMER.address1}, {CUSTOMER.city}, {CUSTOMER.state} {CUSTOMER.zip}
            </p>
            <p className="customer-line">{CUSTOMER.email}</p>
          </div>

          <label>
            Amount
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              placeholder={persona.amount.toFixed(2)}
              onChange={(e) => {
                // Keep digits and a single decimal point, and cap cents at two
                // digits, so the field can't collect unlimited decimals.
                const [whole, ...rest] = e.target.value
                  .replace(/[^\d.]/g, "")
                  .split(".");
                const cents = rest.join("").slice(0, 2);
                setAmount(rest.length ? `${whole}.${cents}` : whole);
                markStale();
              }}
            />
          </label>

          <label>
            Frequency
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value as Frequency);
                markStale();
              }}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start date
            <input
              type="date"
              value={startDate}
              min={minStartDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                markStale();
              }}
            />
          </label>

          <fieldset className="end-mode">
            <legend>Ends</legend>
            <label className="radio">
              <input
                type="radio"
                name="endMode"
                checked={endMode === "untilCancel"}
                onChange={() => {
                  setEndMode("untilCancel");
                  markStale();
                }}
              />
              Until cancelled
            </label>
            <label className="radio">
              <input
                type="radio"
                name="endMode"
                checked={endMode === "specificDate"}
                onChange={() => {
                  setEndMode("specificDate");
                  markStale();
                }}
              />
              Specific date
            </label>
            {endMode === "specificDate" && (
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  markStale();
                }}
              />
            )}
          </fieldset>

          {error && <p className="error-text">{error}</p>}

          <button
            className="btn primary continue"
            onClick={handleContinue}
            disabled={busy || !readyToPay}
          >
            {busy ? "Setting up..." : "Continue to payment"}
          </button>
          {!readyToPay && !scriptLoaded && (
            <p className="hint">Loading the payment component...</p>
          )}
        </section>

        <section className="card checkout">
          <div className="pay-wrap">
            <div id={CONTAINER_ID} className="pay-container" />
            <div className="pay-overlay" data-show={covering} />
          </div>
          {result && (
            <p className={result.ok ? "success-text" : "error-text"}>{result.message}</p>
          )}
        </section>
      </main>

      <SettingsModal
        open={modalOpen}
        settings={settings}
        hasPrivateToken={hasPrivateToken}
        onSave={saveSettings}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
