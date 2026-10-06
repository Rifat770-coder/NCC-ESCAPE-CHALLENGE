"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Facebook, Linkedin, Share2, X } from "lucide-react";

export function ShareResult({ resultId }: { resultId: string }) {
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const copying = useRef(false);

  useEffect(() => {
    if (!url) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = dialog.current;
    const opener = trigger.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setUrl("");
      if (event.key !== "Tab" || !panel) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>("button, a[href], input"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (timer.current) clearTimeout(timer.current);
      opener?.focus();
    };
  }, [url]);

  async function copyUrl() {
    if (copying.current) return;
    copying.current = true;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch { /* Try the selection-based fallback below. */ }
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = url;
      field.readOnly = true;
      field.style.cssText = "position:fixed;inset:0;opacity:0;pointer-events:none";
      dialog.current?.appendChild(field);
      try {
        field.focus();
        field.select();
        field.setSelectionRange(0, url.length);
        copied = document.execCommand("copy");
      } catch { /* Offer manual copying if both clipboard methods fail. */ }
      finally { field.remove(); }
    }
    copying.current = false;
    if (!dialog.current) return;
    dialog.current.querySelector<HTMLButtonElement>("[data-copy]")?.focus();
    setManualCopy(!copied);
    setFeedback(copied ? "Link Copied" : "Could not copy. Select the URL below to copy it manually.");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(""), 1800);
  }

  return (
    <>
      <button ref={trigger} type="button" className="btn-ghost" aria-haspopup="dialog" aria-expanded={!!url}
        onClick={() => {
          setFeedback("");
          setManualCopy(false);
          setUrl(new URL(`/result/${encodeURIComponent(resultId)}`, window.location.origin).href);
        }}>
        <Share2 className="h-4 w-4" /> Share Result
      </button>
      {url && createPortal(
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={(event) => { if (event.target === event.currentTarget) setUrl(""); }}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-label="Share Result"
            className="modal-shell glass-strong neon-border w-full max-w-sm overflow-y-auto rounded-sm p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold uppercase tracking-widest text-white">Share Result</h2>
              <button type="button" onClick={() => setUrl("")} aria-label="Close share popup"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button data-copy type="button" onClick={copyUrl} className="btn-ghost"><Copy className="h-4 w-4" /> Copy URL</button>
              <a className="btn-ghost" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4" /> Facebook</a>
              <a className="btn-ghost" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4" /> LinkedIn</a>
            </div>
            <p role="status" className="mt-3 text-xs text-cyber-200">{feedback}</p>
            {manualCopy && <input aria-label="Result URL for manual copying" readOnly value={url}
              onFocus={(event) => event.currentTarget.select()} className="input-cyber mt-2" />}
          </div>
        </div>, document.body
      )}
    </>
  );
}
