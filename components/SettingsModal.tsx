"use client";

import { useEffect, useState } from "react";

export interface PaypointSettings {
  entryPoint: string;
  publicToken: string;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEntryPoint(settings.entryPoint);
      setPublicToken(settings.publicToken);
      setPrivateToken("");
      setError("");
    }
  }, [open, settings]);

  if (!open) return null;

  async function handleSave() {
    setError("");
    if (!entryPoint.trim() || !publicToken.trim()) {
      setError("Entrypoint and public token are required.");
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
      onSave({ entryPoint: entryPoint.trim(), publicToken: publicToken.trim() }, privateSaved);
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
        <h2>Paypoint settings</h2>
        <p className="modal-note">
          Tokens come from your Payabli sandbox paypoint (PartnerHub &gt; API tokens). The public
          token stays in this browser tab. The private token is stored in an encrypted httpOnly
          cookie and never reaches page scripts.
        </p>

        <label>
          Entrypoint
          <input
            value={entryPoint}
            onChange={(e) => setEntryPoint(e.target.value)}
            placeholder="8cfec329267"
            autoComplete="off"
          />
        </label>

        <label>
          Public token
          <input
            value={publicToken}
            onChange={(e) => setPublicToken(e.target.value)}
            placeholder="o.XXXX..."
            autoComplete="off"
          />
        </label>

        <label>
          Private token {hasPrivateToken && <span className="hint">(saved; enter a new one to replace it)</span>}
          <input
            type="password"
            value={privateToken}
            onChange={(e) => setPrivateToken(e.target.value)}
            placeholder={hasPrivateToken ? "••••••••" : "Required for Tuition and Field Service"}
            autoComplete="off"
          />
        </label>

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
