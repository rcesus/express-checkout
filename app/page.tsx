"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import SettingsModal, { PaypointSettings } from "@/components/SettingsModal";
import ConsoleLog, { type LogEntry, type LogKind } from "@/components/ConsoleLog";
import { DEFAULT_CHECKOUT } from "@/lib/checkout-options";
import {
  FREQUENCIES,
  PERSONA,
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

// A customer as this page holds it, whether selected from search or just
// created. Matches the shape both /api endpoints normalize to.
type Customer = {
  customerId: string | number;
  customerNumber?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

// Blank create-new form. Country defaults to US to match the create endpoint.
const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  address1: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

// Show enough of the public token to recognize it without printing the whole
// value into the console panel. The private token is never in scope here.
function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

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

  // The customer express checkout will run against, set either by picking a
  // search result or by creating a new record through the form.
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Search-a-customer state.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Create-a-customer state.
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_FORM);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logId = useRef(0);
  // Remembers the last real customer call (the GET that selected a customer, or
  // the POST that created one) so both payment modes can replay it into the
  // console instead of re-hitting the API when Continue is pressed.
  const lastCustomerFetch = useRef<{
    label: string;
    request: unknown;
    status: number;
    data: unknown;
  } | null>(null);

  function pushLog(kind: LogKind, label: string, detail?: unknown) {
    const text =
      detail === undefined
        ? undefined
        : typeof detail === "string"
          ? detail
          : JSON.stringify(detail, null, 2);
    logId.current += 1;
    const entry: LogEntry = { id: logId.current, kind, label, detail: text };
    setLogs((l) => [...l, entry]);
  }

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
      setLogs([]);
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.innerHTML = "";
    }
    setError("");
  }

  async function runSearch() {
    setSearchError("");
    if (!settings.entryPoint) {
      setSearchError("Add your entrypoint in settings first.");
      return;
    }
    if (!hasPrivateToken) {
      setSearchError("Searching customers needs a private token. Add one in settings.");
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSearchError("Type a name or email to search.");
      return;
    }
    setSearching(true);
    try {
      const url = `/api/customers?entryPoint=${encodeURIComponent(
        settings.entryPoint,
      )}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Customer search failed.");
      const customers: Customer[] = data.customers ?? [];
      setSearchResults(customers);
      // Remember this GET so Continue can replay it into the console. The picked
      // record is what express checkout runs against.
      lastCustomerFetch.current = {
        label: `GET /api/customers?q=${q}`,
        request: { entryPoint: settings.entryPoint, q },
        status: res.status,
        data,
      };
      if (!customers.length) setSearchError("No matching customers.");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Customer search failed.");
    } finally {
      setSearching(false);
    }
  }

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setSearchResults([]);
    setSearchQuery("");
    setSearchError("");
    setCreating(false);
    markStale();
  }

  function clearSelected() {
    setSelectedCustomer(null);
    markStale();
  }

  function cancelCreate() {
    setCreating(false);
    setNewCustomer(EMPTY_FORM);
    setCreateError("");
  }

  function setNewField(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewCustomer((f) => ({ ...f, [key]: value }));
    };
  }

  async function createCustomer() {
    setCreateError("");
    if (!settings.entryPoint) {
      setCreateError("Add your entrypoint in settings first.");
      return;
    }
    if (!hasPrivateToken) {
      setCreateError("Creating a customer needs a private token. Add one in settings.");
      return;
    }
    if (!newCustomer.email.trim()) {
      setCreateError("Email is required. It's the field the record matches on.");
      return;
    }
    setCreateBusy(true);
    try {
      const request = { entryPoint: settings.entryPoint, ...newCustomer };
      const res = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Customer creation failed.");
      lastCustomerFetch.current = {
        label: "POST /api/customer",
        request,
        status: res.status,
        data,
      };
      // Build the selected record from what was typed plus the returned id.
      selectCustomer({
        customerId: data.customerId,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        address1: newCustomer.address1,
        city: newCustomer.city,
        state: newCustomer.state,
        zip: newCustomer.zip,
        country: newCustomer.country,
      });
      setNewCustomer(EMPTY_FORM);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Customer creation failed.");
    } finally {
      setCreateBusy(false);
    }
  }

  const readyToPay = useMemo(
    () => !!settings.entryPoint && !!settings.publicToken && scriptLoaded,
    [settings.entryPoint, settings.publicToken, scriptLoaded],
  );

  const isOneTime = settings.checkout.paymentMode === "one_time";

  function renderComponent(customerNumber?: string) {
    const container = document.getElementById(CONTAINER_ID);
    if (container) container.innerHTML = "";

    // The component validates startDate by parsing it and comparing against a floor
    // it builds in local time (today at local midnight, plus one day). A bare
    // "YYYY-MM-DD" parses as UTC midnight, which sits below that floor west of UTC,
    // so tomorrow gets rejected. Sending a local datetime with no zone parses to
    // local midnight and clears the floor. endDate has no such floor, so it stays
    // date-only. One-time charges once, so it carries no autopay block at all.
    const startAt = `${startDate}T00:00:00`;
    const autopay =
      endMode === "specificDate"
        ? { frequency, startDate: startAt, endDate, untilCancel: false }
        : { frequency, startDate: startAt, untilCancel: true };

    const expressCheckout: Record<string, unknown> = {
      mode: isOneTime ? "one_time" : "autopay",
      amount: amountValue,
      fee: Number(settings.checkout.fee) || 0,
      currency: settings.checkout.currency || "USD",
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
      // Autopay carries the recurring schedule; one-time omits the block entirely.
      ...(isOneTime ? {} : { autopay }),
      ...(settings.checkout.includeDetails
        ? { includeDetails: settings.checkout.includeDetails === "true" }
        : {}),
      saveIfSuccess: settings.checkout.saveIfSuccess,
      ...(settings.checkout.requiredShippingContactFields.length
        ? { requiredShippingContactFields: settings.checkout.requiredShippingContactFields }
        : {}),
      applePay: {
        enabled: settings.checkout.applePayEnabled,
        crossBrowser: settings.checkout.applePayCrossBrowser,
        buttonStyle: settings.checkout.applePayButtonStyle,
        buttonType: settings.checkout.applePayButtonType,
        language: settings.checkout.applePayLanguage || "en-US",
      },
      googlePay: {
        enabled: settings.checkout.googlePayEnabled,
        buttonStyle: settings.checkout.googlePayButtonStyle,
        buttonType: "plain",
        language: settings.checkout.googlePayLanguage || "en",
      },
    };

    const config: Record<string, unknown> = {
      type: "expressCheckout",
      rootContainer: CONTAINER_ID,
      token: settings.publicToken,
      entryPoint: settings.entryPoint,
      // Custom stylesheet applied inside the checkout iframe. Absolute URL so
      // the iframe can fetch it on whatever domain this deploys to.
      customCssUrl: `${window.location.origin}/express-checkout.css`,
      expressCheckout,
      customerData: {
        ...(customerNumber
          ? settings.checkout.useCustomerId
            ? { customerId: customerNumber }
            : { customerNumber }
          : {}),
        firstName: selectedCustomer?.firstName ?? "",
        lastName: selectedCustomer?.lastName ?? "",
        billingEmail: selectedCustomer?.email ?? "",
      },
      functionCallBackReady: () => {
        // The ready event is the latest lifecycle signal Payabli exposes; there
        // is no documented "styling applied" callback. A short buffer after it
        // gives the iframe's fetched stylesheet time to paint before we uncover.
        pushLog("event", "functionCallBackReady (component mounted)");
        window.setTimeout(() => setCovering(false), 250);
      },
      functionCallBackSuccess: (data: {
        data?: { responseData?: { referenceId?: string } };
        paymentMethod?: string;
      }) => {
        const ref = data?.data?.responseData?.referenceId;
        const label = isOneTime ? "Payment complete" : "Subscription created";
        pushLog("event", "functionCallBackSuccess", data);
        setResult({
          ok: true,
          message: ref ? `${label}. Reference ${ref}.` : `${label}.`,
        });
      },
      functionCallBackError: (data: { error?: { responseText?: string } }) => {
        pushLog("event", "functionCallBackError", data);
        setResult({
          ok: false,
          message: data?.error?.responseText || "The payment setup failed.",
        });
      },
      functionCallBackCancel: () => {
        pushLog("event", "functionCallBackCancel (payer cancelled)");
        setResult({ ok: false, message: "The payer cancelled the setup." });
      },
    };

    // Log the config this page assembles, with the public token masked. The
    // private token never touches this object, so it can't leak here. The four
    // functionCallBack* props are functions and drop out of JSON.stringify.
    pushLog("config", "PayabliComponent config (handed to the component)", {
      ...config,
      token: maskToken(settings.publicToken),
    });
    // Make the boundary explicit. The wallet charge runs inside the Payabli
    // iframe, cross-origin, so this page doesn't make that call itself. But its
    // immediate approve/decline DOES come back through the success/error
    // callbacks below (that reference ID is the transaction). What the page
    // can't see is what happens afterward server-side, which is what the webhook
    // note covers.
    pushLog(
      "note",
      "The wallet charge runs inside the Payabli iframe (cross-origin), so this page doesn't make that call. Its immediate approve or decline does come back, through functionCallBackSuccess / functionCallBackError below (the reference ID is the transaction). What the page can't see is what happens after: settlement, funding, and any future recurring charge run on Payabli's schedule with no browser session attached. Those reach you only through webhooks.",
    );
    // Per-mode webhook recommendation. Autopay's recurring charges fire later on
    // Payabli's schedule, so the page will never see them; one-time only needs
    // the charge result plus the money-movement follow-ups.
    pushLog(
      "note",
      isOneTime
        ? "Recommended webhooks for one-time: ApprovedPayment / DeclinedPayment for the charge result, then SettledPayment and FundedPayment to follow the money into your account."
        : "Recommended webhooks for autopay: SubscriptionCreated to confirm the schedule, ApprovedPayment / DeclinedPayment on each recurring charge for the firing and its result (matched to the subscription by the transaction's ScheduleReference), and SubscriptionCompleted when it passes its end date.",
    );

    // Cover the container so the iframe's own white first paint never shows.
    setCovering(true);
    new PayabliComponent(config);
  }

  async function handleContinue() {
    setError("");
    setResult(null);
    setLogs([]);

    if (!settings.entryPoint || !settings.publicToken) {
      setError("Add your entrypoint and public token in settings first.");
      return;
    }
    // A customer already exists by this point: it was either picked from search
    // or created through the form, and both paths set selectedCustomer.
    if (!selectedCustomer) {
      setError("Search for a customer or create one first.");
      return;
    }
    // Autopay enforces the start-date floor. One-time charges once with no
    // schedule, so it skips the check.
    if (!isOneTime && startDate < minStartDate) {
      setError("Pick a start date at least one day in the future.");
      return;
    }
    if (!scriptLoaded || typeof PayabliComponent !== "function") {
      setError("The payment component is still loading. Try again in a moment.");
      return;
    }

    setBusy(true);
    try {
      // The real customer call already happened during search or create. Replay
      // it into the console so the customer step is visible, without re-hitting
      // the API.
      const cached = lastCustomerFetch.current;
      if (cached) {
        pushLog("request", cached.label, cached.request);
        pushLog("response", `${cached.label} (${cached.status})`, cached.data);
      }
      // One-time passes the customer inline with no id; autopay ties the
      // subscription to the selected record by its id.
      if (isOneTime) {
        renderComponent();
      } else {
        renderComponent(String(selectedCustomer.customerId));
      }
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
        <ConsoleLog entries={logs} />

        <div className="right-col">
        <section className="card form">
          <div className="customer-card">
            <span className="customer-label">Customer</span>

            {selectedCustomer ? (
              <>
                <p className="customer-name">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
                {(selectedCustomer.address1 ||
                  selectedCustomer.city ||
                  selectedCustomer.state ||
                  selectedCustomer.zip) && (
                  <p className="customer-line">
                    {[
                      selectedCustomer.address1,
                      selectedCustomer.city,
                      [selectedCustomer.state, selectedCustomer.zip]
                        .filter(Boolean)
                        .join(" "),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                <p className="customer-line">{selectedCustomer.email}</p>
                <button
                  type="button"
                  className="link-btn"
                  onClick={clearSelected}
                >
                  Change customer
                </button>
              </>
            ) : creating ? (
              <div className="customer-form">
                <label>
                  First name
                  <input
                    type="text"
                    value={newCustomer.firstName}
                    onChange={setNewField("firstName")}
                  />
                </label>
                <label>
                  Last name
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={setNewField("lastName")}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={setNewField("email")}
                  />
                </label>
                <label>
                  Address
                  <input
                    type="text"
                    value={newCustomer.address1}
                    onChange={setNewField("address1")}
                  />
                </label>
                <label>
                  City
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={setNewField("city")}
                  />
                </label>
                <label>
                  State
                  <input
                    type="text"
                    value={newCustomer.state}
                    onChange={setNewField("state")}
                  />
                </label>
                <label>
                  Zip
                  <input
                    type="text"
                    value={newCustomer.zip}
                    onChange={setNewField("zip")}
                  />
                </label>
                <label>
                  Country
                  <input
                    type="text"
                    value={newCustomer.country}
                    onChange={setNewField("country")}
                  />
                </label>
                {createError && <p className="error-text">{createError}</p>}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={createCustomer}
                    disabled={createBusy}
                  >
                    {createBusy ? "Creating..." : "Create customer"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={cancelCreate}
                    disabled={createBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="customer-search">
                <div className="search-row">
                  <input
                    type="text"
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={runSearch}
                    disabled={searching}
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
                {searchError && <p className="error-text">{searchError}</p>}
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.map((c) => (
                      <li key={String(c.customerId)}>
                        <button
                          type="button"
                          className="result-row"
                          onClick={() => selectCustomer(c)}
                        >
                          <span className="result-name">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="result-email">{c.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setCreating(true);
                    setSearchError("");
                  }}
                >
                  Create new customer
                </button>
              </div>
            )}
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

          {!isOneTime && (
            <>
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
            </>
          )}

          {error && <p className="error-text">{error}</p>}

          <button
            className="btn primary continue"
            onClick={handleContinue}
            disabled={busy || !readyToPay || !selectedCustomer}
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
        </div>
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
