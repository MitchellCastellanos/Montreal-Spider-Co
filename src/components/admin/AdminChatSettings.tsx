"use client";

import { useEffect, useState } from "react";

type ChatHours = { enabled: boolean; days: number[]; startHour: number; endHour: number };
type ChatSettings = { staffName: string; hours: ChatHours };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export default function AdminChatSettings() {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/chat/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      });
  }, []);

  const toggleDay = (day: number) => {
    if (!settings) return;
    setSaved(false);
    const days = settings.hours.days.includes(day)
      ? settings.hours.days.filter((d) => d !== day)
      : [...settings.hours.days, day].sort((a, b) => a - b);
    setSettings({ ...settings, hours: { ...settings.hours, days } });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Save failed.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-cream">Chat identity</h2>
        <label className="field max-w-[280px]">
          <span>Staff name shown to visitors</span>
          <input
            type="text"
            className="input"
            value={settings.staffName}
            onChange={(e) => {
              setSettings({ ...settings, staffName: e.target.value });
              setSaved(false);
            }}
            placeholder="Mitch"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Shown as &ldquo;{settings.staffName || "Mitch"} joined the chat&rdquo; the first time you reply to a conversation.
        </p>
      </section>

      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-cream">Business hours</h2>
        <p className="mb-4 text-xs text-muted">
          Times are Eastern Time (ET). A visitor tapping &ldquo;talk to a human&rdquo; outside these hours gets a quick
          &ldquo;leave a message, we reply within 24 business hours&rdquo; form instead of the usual live handoff — this works
          correctly for a visitor in any timezone.
        </p>
        <label className="mb-4 flex items-center gap-2 text-sm text-bone">
          <input
            type="checkbox"
            checked={settings.hours.enabled}
            onChange={(e) => {
              setSettings({ ...settings, hours: { ...settings.hours, enabled: e.target.checked } });
              setSaved(false);
            }}
          />
          Enable the offline / leave-a-message flow outside these hours
        </label>

        {settings.hours.enabled && (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    settings.hours.days.includes(i) ? "border-gold/60 bg-gold/15 text-cream" : "border-line text-muted hover:border-gold/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <label className="field">
                <span>From</span>
                <select
                  className="input"
                  value={settings.hours.startHour}
                  onChange={(e) => {
                    setSettings({ ...settings, hours: { ...settings.hours, startHour: Number(e.target.value) } });
                    setSaved(false);
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>To</span>
                <select
                  className="input"
                  value={settings.hours.endHour}
                  onChange={(e) => {
                    setSettings({ ...settings, hours: { ...settings.hours, endHour: Number(e.target.value) } });
                    setSaved(false);
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
      </section>

      {error && <p className="text-sm text-danger">Could not save: {error}</p>}
      <div>
        <button onClick={() => void save()} disabled={saving} className="btn btn-gold">
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="ml-2 text-sm text-ok">✓ Saved</span>}
      </div>
    </div>
  );
}
