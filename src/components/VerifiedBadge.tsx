type Props = {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** TarantulApp Verified Origin seal — used across product cards and pages. */
export default function VerifiedBadge({ label = "TarantulApp Verified Origin", size = "md", className = "" }: Props) {
  const dims = size === "sm" ? 16 : size === "lg" ? 26 : 20;
  const text = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  return (
    <span
      className={`badge ${text} ${className}`}
      title={label}
    >
      <svg width={dims} height={dims} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.8 2.8.8 2.8-2.4 1.7-1 2.8-2.9-.2L12 22l-2.4-1.7-2.9.2-1-2.8L3.3 16l.8-2.8L3.3 10.4 5.7 8.7l1-2.8 2.9.2L12 2z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M8.5 12.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
