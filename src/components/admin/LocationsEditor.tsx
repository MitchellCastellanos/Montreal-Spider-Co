"use client";

import { useActionState, useState } from "react";
import { updateLocationAction, createLocationAction, type ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import type { StoreLocationView } from "@/lib/data/locations";
import { EMPTY_WEEKLY_HOURS } from "@/lib/opening-hours";
import OpeningHoursEditor from "@/components/admin/OpeningHoursEditor";
import ConceptInfo from "@/components/ConceptInfo";

export default function LocationsEditor({ locations, locale }: { locations: StoreLocationView[]; locale: Locale }) {
  const [createState, createAction, creating] = useActionState<ActionState, FormData>(createLocationAction, {});

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
              <th className="px-4 py-3 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {locations.map((loc) => (
              <LocationRow key={loc.id} location={loc} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>

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
          <label className="field">
            <span>Distributor code</span>
            <input name="distributorCode" className="input" placeholder="e.g. REPTILE24" />
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

/** One location: an always-visible summary row, and an "Edit" panel with every field on a single form + save button. */
function LocationRow({ location, locale }: { location: StoreLocationView; locale: Locale }) {
  const [row, setRow] = useState(location);
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateLocationAction, {});

  const patch = (fields: Partial<StoreLocationView>) => setRow((r) => ({ ...r, ...fields }));

  return (
    <>
      <tr className="text-bone">
        <td className="px-4 py-2">{row.name}</td>
        <td className="px-4 py-2">{row.address}</td>
        <td className="px-3 py-2 text-center">{row.isPickup ? "✓" : "—"}</td>
        <td className="px-3 py-2 text-center">{row.isDistributor ? "✓" : "—"}</td>
        <td className="px-3 py-2 text-center">{row.active ? "✓" : "—"}</td>
        <td className="px-4 py-2 text-right">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-gold hover:text-gold-bright"
          >
            {expanded ? "Hide" : "Edit"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-ink-soft/30">
          <td colSpan={6} className="px-4 py-4">
            <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="locale" value={locale} />

              <label className="field">
                <span>Name *</span>
                <input
                  name="name"
                  value={row.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className="input"
                  required
                />
              </label>
              <label className="field sm:col-span-2 lg:col-span-1">
                <span>Address *</span>
                <input
                  name="address"
                  value={row.address}
                  onChange={(e) => patch({ address: e.target.value })}
                  className="input"
                  required
                />
              </label>
              <label className="field">
                <span>Neighborhood</span>
                <input
                  name="neighborhood"
                  value={row.neighborhood}
                  onChange={(e) => patch({ neighborhood: e.target.value })}
                  className="input"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={row.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  className="input"
                />
              </label>
              <label className="field">
                <span>Google Maps</span>
                <input
                  name="mapsUrl"
                  value={row.mapsUrl}
                  onChange={(e) => patch({ mapsUrl: e.target.value })}
                  className="input"
                />
              </label>
              <label className="field">
                <span>Partner email (operations)</span>
                <input
                  name="email"
                  type="email"
                  value={row.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  className="input"
                  placeholder="store@example.com"
                />
              </label>
              <label className="field">
                <span>Contact name</span>
                <input
                  name="contactName"
                  value={row.contactName}
                  onChange={(e) => patch({ contactName: e.target.value })}
                  className="input"
                />
              </label>
              <label className="field">
                <span>WhatsApp (optional)</span>
                <input
                  name="whatsapp"
                  value={row.whatsapp}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  className="input"
                  placeholder="+1 514 555 0100"
                />
              </label>
              <label className="field">
                <span>Distributor code</span>
                <input
                  name="distributorCode"
                  value={row.distributorCode}
                  onChange={(e) => patch({ distributorCode: e.target.value })}
                  className="input"
                  placeholder="e.g. REPTILE24"
                />
                <span className="mt-1 block text-xs text-muted">
                  Share with the partner by email or in person — required before their staff can open the walk-in sale screen.
                </span>
              </label>
              <label className="field">
                <span>Min price policy (% of MSRP)</span>
                <input
                  name="minPricePct"
                  type="number"
                  min={0}
                  max={200}
                  value={row.minPricePct ?? ""}
                  onChange={(e) => patch({ minPricePct: e.target.value === "" ? null : Number(e.target.value) })}
                  className="input"
                  placeholder="e.g. 100"
                />
              </label>

              <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm text-bone">
                  <input
                    type="checkbox"
                    name="isPickup"
                    checked={row.isPickup}
                    onChange={(e) => patch({ isPickup: e.target.checked })}
                    className="accent-[var(--gold)]"
                  />
                  Pickup point
                </label>
                <label className="flex items-center gap-2 text-sm text-bone">
                  <input
                    type="checkbox"
                    name="isDistributor"
                    checked={row.isDistributor}
                    onChange={(e) => patch({ isDistributor: e.target.checked })}
                    className="accent-[var(--gold)]"
                  />
                  Authorized distributor
                </label>
                <label className="flex items-center gap-2 text-sm text-bone">
                  <input
                    type="checkbox"
                    name="active"
                    checked={row.active}
                    onChange={(e) => patch({ active: e.target.checked })}
                    className="accent-[var(--gold)]"
                  />
                  Active
                </label>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gold-deep">Opening hours</p>
                <OpeningHoursEditor
                  name="hours"
                  initial={row.hours}
                  onChange={(hours) => patch({ hours })}
                />
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={pending} className="btn btn-gold">
                  {pending ? "Saving…" : "Save changes"}
                </button>
                {state.error && <p className="text-sm text-danger">Could not save: {state.error}</p>}
                {state.ok && <p className="text-sm text-ok">Saved</p>}
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
