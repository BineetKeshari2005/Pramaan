import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pramaan — evidence-based triage for GitHub",
  description: "Evidence-based triage for GitHub issues and pull requests.",
};

const REPO_URL = "https://github.com/BineetKeshari2005/Pramaan";

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="pramaan-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c1c1f" />
          <stop offset="1" stopColor="#0b0b0c" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#pramaan-mark)" />
      <circle cx="25" cy="7" r="3" fill="#f15a24" />
      <path
        d="M9 16.5l4.5 4.5L23 11.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" className="brand" aria-label="Pramaan home">
              <BrandMark />
              Pramaan
              <span className="brand-tag">Evidence-based triage</span>
            </a>
            <nav className="site-nav" aria-label="Main">
              <a href="/#how" className="nav-secondary">
                How it works
              </a>
              <a href="/queue" className="nav-secondary">
                Triage queue
              </a>
              <a href="/jobs/sample" className="nav-secondary">
                Sample report
              </a>
              <a href="/#analyse" className="nav-cta">
                Try it
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>
              <strong>Pramaan</strong> · AI reads, code decides. It suggests labels and never closes anything.
            </span>
            <span>
              Built by team Black Coffee ·{" "}
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                Source on GitHub
              </a>{" "}
              · MIT
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
