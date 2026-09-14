"use client";

import { useRef, useState } from "react";
import type { ExamReport, QuestionStatus } from "@/types/report";
import { downloadReportPdf, printReportElement } from "@/lib/reportExport";
import {
  AlertIcon,
  CheckIcon,
  DownloadIcon,
  PrintIcon
} from "@/components/Icons";

const labels: Record<QuestionStatus, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  partial: "Partially Correct",
  answered: "Answer",
  needs_review: "Needs Review"
};

function safeFileName(value: string) {
  const clean = value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return clean || "ExamAI Report";
}

export default function ReportView({
  report,
  variant = "current"
}: {
  report: ExamReport;
  variant?: "current" | "previous";
}) {
  const isQuestionPaper = report.document_type === "question_paper";
  const reportRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  async function downloadPdf() {
    if (!reportRef.current || exporting) return;
    setExporting(true);

    try {
      const prefix = variant === "previous" ? "Previous" : "ExamAI";
      await downloadReportPdf(
        reportRef.current,
        `${prefix} - ${safeFileName(report.title)}.pdf`
      );
    } catch {
      if (reportRef.current) printReportElement(reportRef.current, safeFileName(report.title));
    } finally {
      setExporting(false);
    }
  }

  function printReport() {
    if (!reportRef.current) return;
    printReportElement(reportRef.current, safeFileName(report.title));
  }

  return (
    <section
      id={variant === "current" ? "report" : "previous-report"}
      className={`reportSection ${variant === "previous" ? "previousReport" : ""}`}
      ref={reportRef}
    >
      <div className="reportToolbar" data-export-ignore="true">
        <span>{variant === "previous" ? "Previous Report" : "New Report"}</span>
        <div className="reportActions">
          <button type="button" className="reportActionButton" onClick={downloadPdf} disabled={exporting}>
            <DownloadIcon size={17} />{exporting ? "Preparing..." : "PDF"}
          </button>
          <button type="button" className="reportActionButton" onClick={printReport}>
            <PrintIcon size={17} />Print
          </button>
        </div>
      </div>

      <div className="reportHeader">
        <div>
          <span className="eyebrow">{variant === "previous" ? "Previous Report" : "AI Report"}</span>
          <h2>{report.title || "Exam Analysis"}</h2>
          <p>{report.overall_feedback}</p>
        </div>
        {!isQuestionPaper && report.score_percent !== null && (
          <div
            className="scoreRing"
            style={{ background: `conic-gradient(#1cad78 0 ${Math.max(0, Math.min(100, report.score_percent))}%, #e1ebf7 ${Math.max(0, Math.min(100, report.score_percent))}% 100%)` }}
            aria-label={`Score ${Math.round(report.score_percent)} percent`}
          >
            <strong>{Math.round(report.score_percent)}%</strong>
            <span>Score</span>
          </div>
        )}
      </div>

      {!isQuestionPaper && (
        <div className="statGrid">
          <div className="statCard good"><strong>{report.correct_count}</strong><span>Correct</span></div>
          <div className="statCard bad"><strong>{report.incorrect_count}</strong><span>Incorrect</span></div>
          <div className="statCard partial"><strong>{report.partial_count}</strong><span>Partial</span></div>
          <div className="statCard"><strong>{report.total_questions}</strong><span>Total</span></div>
        </div>
      )}

      <div className="questionList">
        {report.questions.map((item, index) => (
          <article className="questionCard" key={`${item.question_number}-${index}`}>
            <div className="questionTop">
              <div className="questionNumber">{item.question_number || index + 1}</div>
              <span className={`statusPill status-${item.status}`}>
                {item.status === "correct" || item.status === "answered" ? <CheckIcon size={15} /> : <AlertIcon size={15} />}
                {labels[item.status]}
              </span>
            </div>

            <h3>{item.question}</h3>

            {item.student_answer !== null && (
              <div className="answerBlock studentAnswer">
                <span>Your Answer</span>
                <p>{item.student_answer || "No answer detected"}</p>
              </div>
            )}

            <div className="answerBlock correctAnswer">
              <span>{isQuestionPaper ? "Answer" : "Correct Answer"}</span>
              <p>{item.correct_answer}</p>
            </div>

            {item.explanation && (
              <div className="explanationBlock">
                <span>{item.status === "incorrect" || item.status === "partial" ? "Correction" : "Explanation"}</span>
                <p>{item.explanation}</p>
              </div>
            )}

            {item.mistakes.length > 0 && (
              <div className="mistakeBlock">
                <span>What needs fixing</span>
                <ul>
                  {item.mistakes.map((mistake, mistakeIndex) => (
                    <li key={mistakeIndex}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
