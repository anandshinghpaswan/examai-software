export type DocumentType =
  | "question_paper"
  | "answer_sheet"
  | "handwritten_answer_sheet"
  | "unknown";

export type QuestionStatus =
  | "correct"
  | "incorrect"
  | "partial"
  | "answered"
  | "needs_review";

export type ExamQuestionResult = {
  question_number: string;
  question: string;
  student_answer: string | null;
  status: QuestionStatus;
  correct_answer: string;
  explanation: string;
  mistakes: string[];
};

export type ExamReport = {
  document_type: Exclude<DocumentType, "unknown">;
  title: string;
  score_percent: number | null;
  correct_count: number;
  incorrect_count: number;
  partial_count: number;
  total_questions: number;
  overall_feedback: string;
  questions: ExamQuestionResult[];
};

export type DetectionResult = {
  document_type: DocumentType;
  confidence: number;
  label: string;
};
