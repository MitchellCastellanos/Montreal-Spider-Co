/** Unicode punctuation → ASCII for pdf-lib StandardFonts (WinAnsi only). */
const PDF_TEXT_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  ["\u2033", '"'], // double prime (e.g. 2 1/8″)
  ["\u2032", "'"], // prime
  ["\u2014", "-"], // em dash
  ["\u2013", "-"], // en dash
  ["\u2026", "..."], // ellipsis
  ["\u201c", '"'],
  ["\u201d", '"'],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u00a0", " "], // nbsp
  ["\u2212", "-"], // minus sign
  ["\u00d7", "x"], // multiplication sign
];

/** Normalize text so pdf-lib WinAnsi fonts can measure and draw it. */
export function toPdfText(text: string): string {
  let out = text;
  for (const [from, to] of PDF_TEXT_REPLACEMENTS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  // Drop remaining non–Latin-1 chars (WinAnsi covers U+0000–U+00FF).
  return out.replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "");
}
