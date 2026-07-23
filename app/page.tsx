"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import SettingsModal, { PaypointSettings } from "@/components/SettingsModal";
import {
  FREQUENCIES,
  PERSONA,
  CUSTOMER,
  isoDate,
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

  const [settings, setSettings] = useState<PaypointSettings>({ entryPoint: "", publicToken: "" });
  const [hasPrivateToken, setHasPrivateToken] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // The component's own validator parses a date-only startDate ("2026-07-24") as
  // UTC midnight, but builds its "at least tomorrow" floor in local time. West of
  // UTC (US timezones) that makes today+1 land a few hours below the floor and get
  // rejected, so the floor is today+2, which clears the check.
  const minStartDate = useMemo(() => addDays(isoDate(new Date()), 2), []);

  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(persona.defaultFrequency);
  const [startDate, setStartDate] = useState(() => addDays(isoDate(new Date()), 2));
  const [endMode, setEndMode] = useState<EndMode>(persona.defaultEndMode);
  const [endDate, setEndDate] = useState(() =>
    addMonths(addDays(isoDate(new Date()), 2), persona.defaultEndOffsetMonths ?? 6),
  );

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  // Load saved paypoint settings and private-token status once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings(JSON.parse(raw));
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

    const autopay =
      endMode === "specificDate"
        ? { frequency, startDate, endDate, untilCancel: false }
        : { frequency, startDate, untilCancel: true };

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
        supportedNetworks: ["visa", "masterCard", "amex", "discover"],
        columns: 1,
        autopay,
        applePay: {
          enabled: true,
          crossBrowser: true,
          buttonStyle: "black-outline",
          buttonType: "plain",
          language: "en-US",
        },
        googlePay: {
          enabled: true,
          buttonStyle: "dark",
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
      functionCallBackReady: () => {},
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
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function saveSettings(next: PaypointSettings, privateTokenSaved: boolean) {
    setSettings(next);
    setHasPrivateToken(privateTokenSaved);
    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
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
        <div>
          <h1>Recurring wallet checkout</h1>
        </div>
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
          <h2>Wallet checkout</h2>
          <div id={CONTAINER_ID} className="pay-container" />
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
