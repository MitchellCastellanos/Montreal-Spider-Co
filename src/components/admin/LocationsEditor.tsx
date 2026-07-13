"use client";

import { Fragment, useActionState, useState } from "react";
import { bulkSaveLocationsAction, createLocationAction, type ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import type { StoreLocationView } from "@/lib/data/locations";
import { EMPTY_WEEKLY_HOURS } from "@/lib/opening-hours";
import OpeningHoursEditor from "@/components/admin/OpeningHoursEditor";
import ConceptInfo from "@/components/ConceptInfo";

interface RowState {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  mapsUrl: string;
  active: boolean;
  isPickup: boolean;
  isDistributor: boolean;
  hours: StoreLocationView["hours"];
  email: string;
  contactName: string;
  whatsapp: string;
  minPricePct: number | null;
  expanded: boolean;
}

function toRow(loc: StoreLocationView): RowState {
  return { ...loc, expanded: false };
}

export default function LocationsEditor({ locations, locale }: { locations: StoreLocationView[]; locale: Locale }) {
  const [rows, setRows] = useState<RowState[]>(() => locations.map(toRow));
  const [state, saveAction, saving] = useActionState<ActionState, FormData>(bulkSaveLocationsAction, {});
  const [createState, createAction, creating] = useActionState<ActionState, FormData>(createLocationAction, {});

  const patch = (id: string, fields: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));

  const toggleExpand = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, expanded: !r.expanded } : r)));

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-3 py-3 text-center">
                Pickup <ConceptInfo concept="pickup" className="ml-0.5" />
              </th>
              <th className="px-3 py-3 text-center">
                Distributor <ConceptInfo concept="distributor" className="ml-0.5" />
              </th>
              <th className="px-3 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="text-bone">
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => patch(row.id, { name: e.target.value })}
                      className="input py-1.5 text-sm"
                      aria-label="Name"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.address}
                      onChange={(e) => patch(row.id, { address: e.target.value })}
                      className="input py-1.5 text-sm"
                      aria-label="Address"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.isPickup}
                      onChange={(e) => patch(row.id, { isPickup: e.target.checked })}
                      className="accent-[var(--gold)]"
                      aria-label={`Pickup — ${row.name}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.isDistributor}
                      onChange={(e) => patch(row.id, { isDistributor: e.target.checked })}
                      className="accent-[var(--gold)]"
                      aria-label={`Distributor — ${row.name}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => patch(row.id, { active: e.target.checked })}
                      className="accent-[var(--gold)]"
                      aria-label={`Active — ${row.name}`}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleExpand(row.id)}
                      className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-gold hover:text-gold-bright"
                    >
                      {row.expanded ? "Hide" : "Hours & contact"}
                    </button>
                  </td>
                </tr>
                {row.expanded && (
                  <tr className="bg-ink-soft/30">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="field">
                          <span>Neighborhood</span>
                          <input
                            value={row.neighborhood}
                            onChange={(e) => patch(row.id, { neighborhood: e.target.value })}
                            className="input"
                          />
                        </label>
                        <label className="field">
                          <span>Phone</span>
                          <input
                            value={row.phone}
                            onChange={(e) => patch(row.id, { phone: e.target.value })}
                            className="input"
                          />
                        </label>
                        <label className="field sm:col-span-2 lg:col-span-1">
                          <span>Google Maps</span>
                          <input
                            value={row.mapsUrl}
                            onChange={(e) => patch(row.id, { mapsUrl: e.target.value })}
                            className="input"
                          />
                        </label>
                        <label className="field">
                          <span>Partner email (operations)</span>
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) => patch(row.id, { email: e.target.value })}
                            className="input"
                            placeholder="store@example.com"
                          />
                        </label>
                        <label className="field">
                          <span>Contact name</span>
                          <input
                            value={row.contactName}
                            onChange={(e) => patch(row.id, { contactName: e.target.value })}
                            className="input"
                          />
                        </label>
                        <label className="field">
                          <span>WhatsApp (optional)</span>
                          <input
                            value={row.whatsapp}
                            onChange={(e) => patch(row.id, { whatsapp: e.target.value })}
                            className="input"
                            placeholder="+1 514 555 0100"
                          />
                        </label>
                        <label className="field">
                          <span>Min price policy (% of MSRP)</span>
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={row.minPricePct ?? ""}
                            onChange={(e) =>
                              patch(row.id, { minPricePct: e.target.value === "" ? null : Number(e.target.value) })
                            }
                            className="input"
                            placeholder="e.g. 100"
                          />
                        </label>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gold-deep">Opening hours</p>
                        <OpeningHoursEditor
                          name={`hours-${row.id}`}
                          initial={row.hours}
                          onChange={(hours) => patch(row.id, { hours })}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <form action={saveAction}>
        <input type="hidden" name="locale" value={locale} />
        <input
          type="hidden"
          name="locations"
          value={JSON.stringify(
            rows.map(({ expanded: _e, ...r }) => r),
          )}
        />
        {state.error && <p className="mb-3 text-sm text-danger">Could not save: {state.error}</p>}
        <button type="submit" className="btn btn-gold" disabled={saving}>
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </form>

      <div className="card-glow rounded-2xl p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-cream">Add location</h2>
        <form action={createAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="field">
            <span>Name *</span>
            <input name="name" className="input" required />
          </label>
          <label className="field">
            <span>Neighborhood</span>
            <input name="neighborhood" className="input" />
          </label>
          <label className="field sm:col-span-2">
            <span>Address *</span>
            <input name="address" className="input" required />
          </label>
          <label className="field">
            <span>Partner email</span>
            <input name="email" type="email" className="input" placeholder="store@example.com" />
          </label>
          <label className="field">
            <span>Contact name</span>
            <input name="contactName" className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="checkbox" name="isPickup" defaultChecked className="accent-[var(--gold)]" />
            Pickup point
          </label>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="checkbox" name="isDistributor" className="accent-[var(--gold)]" />
            Authorized distributor
          </label>
          <input type="hidden" name="hours" value={JSON.stringify(EMPTY_WEEKLY_HOURS)} />
          {createState.error && <p className="text-sm text-danger sm:col-span-2">{createState.error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-ghost" disabled={creating}>
              {creating ? "Adding…" : "+ Add location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
