"use client";

import { useEffect, useMemo, useState } from "react";
import UploadZone from "@/components/UploadZone";
import ReportView from "@/components/ReportView";
import {
  AlertIcon,
  ChartIcon,
  CheckIcon,
  FileIcon,
  PenIcon,
  SparkleIcon,
  UploadIcon
} from "@/components/Icons";
import type { DetectionResult, DocumentType, ExamReport } from "@/types/report";

const LAST_REPORT_KEY = "examai:last-report:v1";

const TYPE_LABELS: Record<DocumentType, string> = {
  question_paper: "Question Paper",
  answer_sheet: "Answer Sheet",
  handwritten_answer_sheet: "Student Handwritten Answer Sheet",
  unknown: "Unknown Document"
};

async function postForm<T>(url: string, form: FormData): Promise<T> {
  const response = await fetch(url, { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data as T;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [questionPaperFiles, setQuestionPaperFiles] = useState<File[]>([]);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ExamReport | null>(null);
  const [previousReport, setPreviousReport] = useState<ExamReport | null>(null);

  const needsQuestionPaper = detection?.document_type === "handwritten_answer_sheet";

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_REPORT_KEY);
      if (saved) setPreviousReport(JSON.parse(saved) as ExamReport);
    } catch {
      window.localStorage.removeItem(LAST_REPORT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!files.length) {
      setDetection(null);
      setQuestionPaperFiles([]);
      setReport((current) => {
        if (current) setPreviousReport(current);
        return null;
      });
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setDetecting(true);
      setDetection(null);
      setQuestionPaperFiles([]);
      setReport((current) => {
        if (current) setPreviousReport(current);
        return null;
      });
      setError("");

      try {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        const result = await postForm<DetectionResult>("/api/detect", form);
        if (!controller.signal.aborted) setDetection(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not detect document type.");
        }
      } finally {
        if (!controller.signal.aborted) setDetecting(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [files]);

  const canProcess = useMemo(() => {
    if (!files.length || detecting || processing || !detection) return false;
    if (detection.document_type === "unknown") return false;
    if (needsQuestionPaper && !questionPaperFiles.length) return false;
    return true;
  }, [files, detecting, processing, detection, needsQuestionPaper, questionPaperFiles]);

  async function analyze() {
    if (!canProcess || !detection) return;
    setProcessing(true);
    setError("");
    if (report) setPreviousReport(report);
    setReport(null);

    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      questionPaperFiles.forEach((file) => form.append("questionPaperFiles", file));
      form.append("documentType", detection.document_type);

      const result = await postForm<ExamReport>("/api/analyze", form);
      setReport(result);
      window.localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(result));
      setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze the document.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="appShell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">E</div>
          <div>
            <div className="brandName">Exam<span>AI</span></div>
            <div className="brandSub">AI Exam Evaluation</div>
          </div>
        </div>
        <div className="topbarLabel">AI-Powered Evaluation</div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <a className="navItem active" href="#upload"><UploadIcon size={23} />Upload</a>
          <a className="navItem" href="#reports"><ChartIcon size={23} />Report</a>
        </aside>

        <section className="content" id="upload">
          <div className="mainColumn">
            <div className="pageHeading">
              <h1>Upload Exam Material</h1>
              <p>Upload any exam-related document. AI will detect the type automatically.</p>
            </div>

            <UploadZone files={files} onFiles={setFiles} disabled={processing} />

            {detecting && (
              <div className="infoBanner detectingBanner">
                <div className="loader" />
                <div><strong>Detecting document type...</strong></div>
              </div>
            )}

            {detection && detection.document_type !== "unknown" && !detecting && (
              <div className="infoBanner successBanner">
                <div className="bannerIcon success"><CheckIcon size={24} /></div>
                <div>
                  <strong>File uploaded successfully!</strong>
                  <span>Detected as: <b>{TYPE_LABELS[detection.document_type]}</b></span>
                </div>
                <button type="button" className="changeButton" onClick={() => setFiles([])}>Change</button>
              </div>
            )}

            {detection?.document_type === "unknown" && !detecting && (
              <div className="infoBanner errorBanner">
                <div className="bannerIcon danger"><AlertIcon size={22} /></div>
                <div>
                  <strong>Exam document not detected</strong>
                  <span>Please upload a question paper, answer sheet, or handwritten student sheet.</span>
                </div>
              </div>
            )}

            {needsQuestionPaper && (
              <div className="questionPaperRequest">
                <div className="requestTitle">
                  <div className="bannerIcon danger"><AlertIcon size={22} /></div>
                  <div>
                    <strong>Please upload the Question Paper</strong>
                    <span>It is required to match question numbers and evaluate the handwritten answers.</span>
                  </div>
                </div>
                <UploadZone
                  compact
                  files={questionPaperFiles}
                  onFiles={setQuestionPaperFiles}
                  title="Upload Question Paper"
                  subtitle="PDF, JPG, JPEG, PNG, WEBP"
                  disabled={processing}
                />
              </div>
            )}

            {error && <div className="errorMessage"><AlertIcon size={18} />{error}</div>}

            <button className="processButton" type="button" disabled={!canProcess} onClick={analyze}>
              {processing ? <><span className="buttonLoader" />Analyzing...</> : <><SparkleIcon size={19} />Process with AI</>}
            </button>

            {(report || previousReport) && (
              <div id="reports" className="reportsStack">
                {report && <ReportView report={report} variant="current" />}
                {previousReport && <ReportView report={previousReport} variant="previous" />}
              </div>
            )}
          </div>

          <aside className="rightColumn">
            <div className="sideCard">
              <div className="sideCardTitle"><div className="roundCheck"><CheckIcon size={19} /></div>Supported Inputs</div>
              <div className="supportedItem">
                <div className="supportIcon blue"><FileIcon size={24} /></div>
                <div><strong>Question Paper</strong><span>Printed, scanned or PDF</span></div>
              </div>
              <div className="supportedItem">
                <div className="supportIcon pink"><FileIcon size={24} /></div>
                <div><strong>Answer Sheet</strong><span>Scanned or PDF</span></div>
              </div>
              <div className="supportedItem">
                <div className="supportIcon violet"><PenIcon size={24} /></div>
                <div><strong>Student Handwritten Sheet</strong><span>Image or PDF</span></div>
              </div>
            </div>

            <div className="sideCard howCard">
              <div className="sideCardTitle"><span className="bulb">💡</span>How It Works?</div>
              <div className="step"><span>1</span><div><strong>Upload</strong><p>Add exam material in the single upload section.</p></div></div>
              <div className="step"><span>2</span><div><strong>Auto-Detect</strong><p>AI identifies the document type.</p></div></div>
              <div className="step"><span>3</span><div><strong>Match</strong><p>Handwritten sheets are matched with the question paper.</p></div></div>
              <div className="step"><span>4</span><div><strong>Evaluate</strong><p>Get answers, correct/incorrect results and corrections.</p></div></div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
