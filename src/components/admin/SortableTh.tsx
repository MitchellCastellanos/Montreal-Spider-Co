"use client";

export type SortDir = "asc" | "desc";

export function toggleSortKey(key: string, activeKey: string, dir: SortDir): [string, SortDir] {
  if (activeKey === key) return [key, dir === "asc" ? "desc" : "asc"];
  return [key, "asc"];
}

export function cmpStr(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

export function cmpNum(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

export default function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className = "",
  align = "left",
}: {
  label: string;
  sortKey: string;
  activeKey: string;
  dir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = activeKey === sortKey;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex w-full items-center gap-1 uppercase tracking-wide transition hover:text-gold-bright ${
          active ? "text-gold-bright" : ""
        } ${align === "right" ? "justify-end" : "justify-start"}`}
      >
        {label}
        <span className={`text-[10px] ${active ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
