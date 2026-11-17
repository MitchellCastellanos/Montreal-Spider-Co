/** Visual-only photo credit. Original image files remain unchanged. */
export default function PhotoWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[3%] right-[3%] z-[2] w-[min(38%,190px)] select-none opacity-70"
    >
      <svg viewBox="0 0 360 105" xmlns="http://www.w3.org/2000/svg" className="block h-auto w-full overflow-visible" fill="white">
        <text x="180" y="62" textAnchor="middle" fontFamily="'Brush Script MT','Segoe Script','Apple Chancery',cursive" fontStyle="italic" fontSize="49" textLength="340" lengthAdjust="spacingAndGlyphs">Bernardo Illanez</text>
        <path d="M38 72 Q180 83 322 72" fill="none" stroke="white" strokeWidth="1.6" opacity=".85" />
        <text x="180" y="98" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="17" letterSpacing="7" textLength="252" lengthAdjust="spacing">PHOTOGRAPHY</text>
      </svg>
    </div>
  );
}
