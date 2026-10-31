"use client";

import { useEffect, useRef, useState } from "react";
import { renderGitHubComment } from "../../core/report";
import type { Report } from "../../core/types";

interface CopyCommentButtonProps {
  report: Report;
  small?: boolean;
}

/** Copies the ready-to-paste GitHub comment. It only touches the clipboard; nothing is posted. */
export default function CopyCommentButton({ report, small = false }: CopyCommentButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(renderGitHubComment(report));
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2500);
  }

  const label =
    state === "copied"
      ? "Copied ✓"
      : state === "failed"
        ? "Copy blocked: use the Share panel"
        : small
          ? "Copy comment"
          : "Copy as GitHub comment";

  return (
    <>
      <button
        type="button"
        className={small ? "btn btn-secondary btn-sm" : "btn btn-primary"}
        onClick={() => void copy()}
      >
        {label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "GitHub comment copied to clipboard." : ""}
      </span>
    </>
  );
}
