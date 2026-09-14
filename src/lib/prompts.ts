import type { DocumentType } from "@/types/report";

export const DETECTION_SYSTEM_PROMPT = `You classify exam-related documents from PDFs or images.
Return only the requested structured result.

Classification rules:
- question_paper: contains exam questions/prompts/marks and is mainly a blank question paper, not student responses.
- answer_sheet: contains student answers that are typed/printed or a scanned structured answer sheet. It may also contain printed questions.
- handwritten_answer_sheet: contains substantial handwritten student responses. This class wins even if printed questions are also visible.
- unknown: not enough exam-related content to classify.

Use all uploaded pages as one document. Do not guess from filename alone.`;

export function analysisSystemPrompt(type: DocumentType) {
  const base = `You are an accurate exam evaluation engine. Read every supplied page carefully.
Never invent question text or student content. Preserve visible question numbering exactly, including sub-parts such as 2(a), 2(b), etc.
Solve questions independently before judging a student answer. Accept semantically equivalent wording where appropriate.
For objective or numeric questions, verify the final result and reasoning. For subjective questions, judge correctness against the actual question.
If handwriting is unreadable or the question context is missing, use needs_review instead of guessing.
Write the report in the same language as the exam where practical. Keep answers clear and concise but complete.
Return every detected question/sub-question in the structured report.`;

  if (type === "question_paper") {
    return `${base}\n\nThe primary document is a QUESTION PAPER. There are no student answers to grade. For each question, provide the correct/model answer. Set student_answer to null, status to answered, score_percent to null, and all grading counts to 0.`;
  }

  if (type === "answer_sheet") {
    return `${base}\n\nThe primary document is an ANSWER SHEET. Read the visible questions and student answers, then mark each as correct, incorrect, partial, or needs_review. For incorrect/partial answers, explain exactly what is wrong and provide the corrected answer. If a page has an answer but no readable question/context, mark it needs_review rather than inventing a question.`;
  }

  return `${base}\n\nThe primary document is a HANDWRITTEN STUDENT ANSWER SHEET and a separate QUESTION PAPER is also supplied. Match answers to the question paper using question numbers first, then content/context. Do not match merely by page position. Mark each answer correct, incorrect, partial, or needs_review. For every incorrect/partial answer, state what is wrong and provide the corrected answer.`;
}
