import type { SpecimenSex } from "@/lib/types";

const STYLES: Record<"female" | "male", string> = {
  female: "border-pink-400/40 bg-pink-400/15 text-pink-300",
  male: "border-sky-400/40 bg-sky-400/15 text-sky-300",
};

const SYMBOL: Record<"female" | "male", string> = {
  female: "♀",
  male: "♂",
};

/** Small color-coded pill marking a specimen's sex — renders nothing when unsexed. */
export default function SexBadge({
  sex,
  label,
  className = "",
}: {
  sex: SpecimenSex;
  /** Optional text next to the symbol, e.g. the localized "Female". */
  label?: string;
  className?: string;
}) {
  if (sex === "unsexed") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[sex]} ${className}`}
    >
      <span aria-hidden>{SYMBOL[sex]}</span>
      {label && <span>{label}</span>}
    </span>
  );
}
