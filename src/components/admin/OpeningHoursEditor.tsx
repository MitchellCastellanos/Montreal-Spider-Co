"use client";

import { useEffect, useState } from "react";
import {
  DAY_KEYS,
  EMPTY_WEEKLY_HOURS,
  type DayKey,
  type WeeklyHours,
} from "@/lib/opening-hours";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function normalizeHours(hours: WeeklyHours): WeeklyHours {
  const out = { ...EMPTY_WEEKLY_HOURS };
  for (const day of DAY_KEYS) {
    const slot = hours[day];
    if (slot?.closed || !slot?.open || !slot?.close) {
      out[day] = { closed: true };
    } else {
      out[day] = { open: slot.open, close: slot.close };
    }
  }
  return out;
}

export default function OpeningHoursEditor({
  name,
  initial,
  onChange,
}: {
  name: string;
  initial: WeeklyHours;
  onChange?: (hours: WeeklyHours) => void;
}) {
  const [hours, setHours] = useState(() => normalizeHours(initial));

  useEffect(() => {
    onChange?.(hours);
  }, [hours, onChange]);

  function setDay(day: DayKey, patch: Partial<WeeklyHours[DayKey]>) {
    setHours((prev) => {
      const current = prev[day];
      const next = { ...current, ...patch };
      if (next.closed) {
        return { ...prev, [day]: { closed: true } };
      }
      return {
        ...prev,
        [day]: {
          open: next.open ?? "09:00",
          close: next.close ?? "17:00",
        },
      };
    });
  }

  function toggleOpen(day: DayKey, open: boolean) {
    if (open) {
      setDay(day, { closed: false, open: "09:00", close: "17:00" });
    } else {
      setDay(day, { closed: true });
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(hours)} />
      <div className="space-y-2">
        {DAY_KEYS.map((day) => {
          const slot = hours[day];
          const isOpen = !slot.closed && !!slot.open && !!slot.close;
          return (
            <div
              key={day}
              className="grid items-center gap-3 rounded-xl border border-line bg-ink-soft/30 px-3 py-2.5 sm:grid-cols-[7rem_5rem_1fr]"
            >
              <span className="text-sm font-medium text-cream">{DAY_LABELS[day]}</span>
              <label className="flex items-center gap-2 text-sm text-bone">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => toggleOpen(day, e.target.checked)}
                  className="accent-[var(--gold)]"
                />
                Open
              </label>
              {isOpen ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-bone">
                  <input
                    type="time"
                    value={slot.open}
                    onChange={(e) => setDay(day, { open: e.target.value })}
                    className="input w-auto py-1.5"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    value={slot.close}
                    onChange={(e) => setDay(day, { close: e.target.value })}
                    className="input w-auto py-1.5"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
