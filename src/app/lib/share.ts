import { buildReporterReply, renderGitHubComment, renderReportMarkdown } from "../../core/report";
import type { Report } from "../../core/types";

export function shareContent(report: Report): {
  comment: string;
  markdown: string;
  reply: string | null;
  replyReason: string;
} {
  const comment = renderGitHubComment(report);
  const markdown = renderReportMarkdown(report);
  const reply = buildReporterReply(report);
  const replyReason =
    reply === null
      ? "No questions for the reporter: every checkable claim was settled."
      : "";

  return { comment, markdown, reply, replyReason };
}

export function issueCommentUrl(report: Report): string {
  const base = report.target.url.replace(/#.*$/, "");
  return `${base}#issuecomment-new`;
}
