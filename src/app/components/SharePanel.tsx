"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "../../core/types";
import { issueCommentUrl, shareContent } from "../lib/share";

interface SharePanelProps {
  report: Report;
}

type TabKey = "markdown" | "reply";

export default function SharePanel({ report }: SharePanelProps) {
  const content = shareContent(report);
  const commentUrl = issueCommentUrl(report);

  const [activeTab, setActiveTab] = useState<TabKey>("markdown");
  const [copiedTab, setCopiedTab] = useState<TabKey | null>(null);
  const [fallbackTab, setFallbackTab] = useState<TabKey | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownTabRef = useRef<HTMLButtonElement>(null);
  const replyTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (activeTab === "markdown") {
        setActiveTab("reply");
        replyTabRef.current?.focus();
      } else {
        setActiveTab("markdown");
        markdownTabRef.current?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (activeTab === "reply") {
        setActiveTab("markdown");
        markdownTabRef.current?.focus();
      } else {
        setActiveTab("reply");
        replyTabRef.current?.focus();
      }
    }
  };

  const handleCopy = async (
    text: string,
    tab: TabKey,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    label: string,
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const triggerFallback = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
      setCopiedTab(null);
      setFallbackTab(tab);
      setStatusMessage("Press Ctrl/Cmd+C to copy");
      timeoutRef.current = setTimeout(() => {
        setFallbackTab(null);
        setStatusMessage("");
      }, 3500);
    };

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      triggerFallback();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setFallbackTab(null);
      setCopiedTab(tab);
      setStatusMessage(`${label} copied to clipboard.`);
      timeoutRef.current = setTimeout(() => {
        setCopiedTab(null);
        setStatusMessage("");
      }, 2000);
    } catch {
      triggerFallback();
    }
  };

  const markdownButtonLabel =
    copiedTab === "markdown"
      ? "Copied ✓"
      : fallbackTab === "markdown"
        ? "Press Ctrl/Cmd+C to copy"
        : "Copy Markdown";

  const replyButtonLabel =
    copiedTab === "reply"
      ? "Copied ✓"
      : fallbackTab === "reply"
        ? "Press Ctrl/Cmd+C to copy"
        : "Copy reply";

  return (
    <section className="share-panel" aria-labelledby="share-heading">
      <div className="share-panel-header">
        <h2 id="share-heading">Share with GitHub</h2>
        <p className="share-notice">
          Nothing is posted automatically — review the text, then paste it yourself.
        </p>
      </div>

      <div role="tablist" aria-label="Share format" className="share-tablist">
        <button
          ref={markdownTabRef}
          id="tab-markdown"
          role="tab"
          type="button"
          aria-selected={activeTab === "markdown"}
          aria-controls="panel-markdown"
          tabIndex={activeTab === "markdown" ? 0 : -1}
          className={`share-tab ${activeTab === "markdown" ? "active" : ""}`}
          onClick={() => setActiveTab("markdown")}
          onKeyDown={handleTabKeyDown}
        >
          Evidence report (Markdown)
        </button>
        <button
          ref={replyTabRef}
          id="tab-reply"
          role="tab"
          type="button"
          aria-selected={activeTab === "reply"}
          aria-controls="panel-reply"
          tabIndex={activeTab === "reply" ? 0 : -1}
          className={`share-tab ${activeTab === "reply" ? "active" : ""}`}
          onClick={() => setActiveTab("reply")}
          onKeyDown={handleTabKeyDown}
        >
          Reply to reporter
        </button>
      </div>

      {/* Screen reader live region for copy announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {/* Panel 1: Markdown */}
      <div
        id="panel-markdown"
        role="tabpanel"
        aria-labelledby="tab-markdown"
        hidden={activeTab !== "markdown"}
        className="share-tabpanel"
      >
        <label htmlFor="share-markdown-textarea" className="sr-only">
          Evidence report (Markdown)
        </label>
        <textarea
          id="share-markdown-textarea"
          ref={markdownTextareaRef}
          readOnly
          rows={14}
          spellCheck={false}
          value={content.markdown}
          className="share-textarea"
        />
        <div className="share-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              handleCopy(
                content.markdown,
                "markdown",
                markdownTextareaRef,
                "Evidence report",
              )
            }
          >
            {markdownButtonLabel}
          </button>
          <a
            href={commentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary share-github-link"
          >
            Open on GitHub ↗
          </a>
        </div>
      </div>

      {/* Panel 2: Reply */}
      <div
        id="panel-reply"
        role="tabpanel"
        aria-labelledby="tab-reply"
        hidden={activeTab !== "reply"}
        className="share-tabpanel"
      >
        {content.reply !== null ? (
          <>
            <label htmlFor="share-reply-textarea" className="sr-only">
              Reply to reporter
            </label>
            <textarea
              id="share-reply-textarea"
              ref={replyTextareaRef}
              readOnly
              rows={14}
              spellCheck={false}
              value={content.reply}
              className="share-textarea"
            />
            <div className="share-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  handleCopy(
                    content.reply!,
                    "reply",
                    replyTextareaRef,
                    "Reporter reply",
                  )
                }
              >
                {replyButtonLabel}
              </button>
              <a
                href={commentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary share-github-link"
              >
                Open on GitHub ↗
              </a>
            </div>
          </>
        ) : (
          <div className="share-empty-state">
            <p className="share-empty-reason">{content.replyReason}</p>
            <div className="share-actions">
              <a
                href={commentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary share-github-link"
              >
                Open on GitHub ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
