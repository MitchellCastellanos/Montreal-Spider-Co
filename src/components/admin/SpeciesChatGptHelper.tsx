"use client";

import { useMemo, useState } from "react";
import {
  buildSpeciesChatGptPrompt,
  countParsedFields,
  parseSpeciesChatGptResponse,
} from "@/lib/species-chatgpt-prompt";
import type { SpeciesFormFields } from "@/lib/species-utils";

type Props = {
  scientific: string;
  careGuides: string[];
  onApply: (fields: Partial<SpeciesFormFields>) => void;
};

export default function SpeciesChatGptHelper({ scientific, careGuides, onApply }: Props) {
  const [notes, setNotes] = useState("");
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  const speciesLine = scientific.trim() || "";
  const prompt = useMemo(
    () => buildSpeciesChatGptPrompt(speciesLine, notes, careGuides),
    [speciesLine, notes, careGuides]
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const applyPaste = () => {
    const parsed = parseSpeciesChatGptResponse(paste);
    const n = countParsedFields(parsed);
    if (n === 0) {
      setParseMsg("Couldn't read any fields — check that ChatGPT used the exact labels from the prompt.");
      return;
    }
    onApply(parsed);
    setParseMsg(`Applied ${n} field${n === 1 ? "" : "s"}. Review below, then save.`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
        <h3 className="font-display text-sm font-semibold text-cream">How to use</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-bone">
          <li>Copy the prompt below (includes the species name at the end).</li>
          <li>Paste it into ChatGPT and send.</li>
          <li>Copy ChatGPT&apos;s labeled reply into the box here → <strong className="text-cream">Apply to form</strong>.</li>
          <li>Set sizes, prices, and photo → Save (species profile is saved for next time).</li>
        </ol>
      </div>

      <label className="field">
        <span>Notes for ChatGPT (optional — appended to the prompt)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. we have slings 2–3 cm, very docile"
          className="input"
        />
      </label>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-cream">Universal prompt — copy &amp; paste into ChatGPT</span>
          <button type="button" className="btn btn-gold text-xs" onClick={copyPrompt}>
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
        <textarea
          readOnly
          value={prompt}
          className="input min-h-56 font-mono text-xs leading-relaxed text-bone"
          onFocus={(e) => e.target.select()}
        />
        {!speciesLine && (
          <p className="mt-2 text-xs text-muted">Enter the scientific name in Listing first — the prompt will end with that species.</p>
        )}
      </div>

      <div>
        <label className="field">
          <span>Paste ChatGPT&apos;s reply here</span>
          <textarea
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setParseMsg(null);
            }}
            placeholder={"COMMON_EN: Brazilian Black\nCOMMON_FR: Mygale noire du Brésil\n..."}
            className="input min-h-40 font-mono text-xs"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost" onClick={applyPaste} disabled={!paste.trim()}>
            Apply to form
          </button>
          {parseMsg && (
            <p className={`text-sm ${parseMsg.startsWith("Applied") ? "text-gold-bright" : "text-danger"}`}>{parseMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
