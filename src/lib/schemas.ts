export const detectionSchema = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      enum: [
        "question_paper",
        "answer_sheet",
        "handwritten_answer_sheet",
        "unknown"
      ]
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    label: { type: "string" }
  },
  required: ["document_type", "confidence", "label"],
  additionalProperties: false
} as const;

export const reportSchema = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      enum: ["question_paper", "answer_sheet", "handwritten_answer_sheet"]
    },
    title: { type: "string" },
    score_percent: { anyOf: [{ type: "number", minimum: 0, maximum: 100 }, { type: "null" }] },
    correct_count: { type: "integer", minimum: 0 },
    incorrect_count: { type: "integer", minimum: 0 },
    partial_count: { type: "integer", minimum: 0 },
    total_questions: { type: "integer", minimum: 0 },
    overall_feedback: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_number: { type: "string" },
          question: { type: "string" },
          student_answer: { anyOf: [{ type: "string" }, { type: "null" }] },
          status: {
            type: "string",
            enum: ["correct", "incorrect", "partial", "answered", "needs_review"]
          },
          correct_answer: { type: "string" },
          explanation: { type: "string" },
          mistakes: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "question_number",
          "question",
          "student_answer",
          "status",
          "correct_answer",
          "explanation",
          "mistakes"
        ],
        additionalProperties: false
      }
    }
  },
  required: [
    "document_type",
    "title",
    "score_percent",
    "correct_count",
    "incorrect_count",
    "partial_count",
    "total_questions",
    "overall_feedback",
    "questions"
  ],
  additionalProperties: false
} as const;
