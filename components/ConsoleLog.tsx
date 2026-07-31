"use client";

export type LogKind = "config" | "request" | "response" | "event" | "note";

export interface LogEntry {
  id: number;
  kind: LogKind;
  label: string;
  detail?: string;
}

const KIND_TAG: Record<LogKind, string> = {
  config: "CONFIG",
  request: "REQUEST",
  response: "RESPONSE",
  event: "EVENT",
  note: "NOTE",
};

export default function ConsoleLog({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="card console">
      <div className="console-head">
        <span className="console-title">Console</span>
        {/* Decorative window controls. Only the win95 theme shows these. */}
        <span className="console-controls" aria-hidden="true">
          <span className="console-control">_</span>
          <span className="console-control">□</span>
          <span className="console-control">✕</span>
        </span>
      </div>
      <div className="console-body">
        {entries.length === 0 ? (
          <p className="console-empty">
            Start a payment to see the config this page assembles, the calls it
            makes, and the events the component sends back.
          </p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className={`log log-${e.kind}`}>
              <span className="log-tag">{KIND_TAG[e.kind]}</span>
              <span className="log-label">{e.label}</span>
              {e.detail && <pre className="log-detail">{e.detail}</pre>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
