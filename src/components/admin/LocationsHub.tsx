"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { DistributorView } from "@/lib/data/distributors";
import type { PickupView } from "@/lib/data/locations";
import { localeHref } from "@/lib/href";
import PickupListTable from "@/components/admin/PickupListTable";
import DistributorListTable from "@/components/admin/DistributorListTable";

type Tab = "pickup" | "distributors";

export default function LocationsHub({
  pickups,
  distributors,
  locale,
}: {
  pickups: PickupView[];
  distributors: DistributorView[];
  locale: Locale;
}) {
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "distributors" ? "distributors" : "pickup";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Locations</h1>
          <p className="text-sm text-muted">Pickup points & authorized distributors</p>
        </div>
        <Link
          href={localeHref(locale, tab === "distributors" ? "/admin/distributors/new" : "/admin/pickup/new")}
          className="btn btn-gold"
        >
          {tab === "distributors" ? "+ New distributor" : "+ New pickup point"}
        </Link>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-ink-soft/40 p-1">
        <TabLink href={localeHref(locale, "/admin/pickup")} active={tab === "pickup"}>
          Pickup points ({pickups.length})
        </TabLink>
        <TabLink href={localeHref(locale, "/admin/pickup?tab=distributors")} active={tab === "distributors"}>
          Distributors ({distributors.length})
        </TabLink>
      </div>

      {tab === "pickup" ? (
        <PickupListTable points={pickups} locale={locale} />
      ) : (
        <DistributorListTable distributors={distributors} locale={locale} />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
        active ? "bg-gold/15 text-gold-bright" : "text-muted hover:text-cream"
      }`}
    >
      {children}
    </Link>
  );
}
