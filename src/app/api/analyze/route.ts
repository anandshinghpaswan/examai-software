import { NextResponse } from "next/server";
import { readFiles, validateFiles } from "@/lib/files";
import { deleteOpenAIFile, filesToModelParts, structuredResponse } from "@/lib/openai";
import { analysisSystemPrompt } from "@/lib/prompts";
import { reportSchema } from "@/lib/schemas";
import type { DocumentType } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set<DocumentType>([
  "question_paper",
  "answer_sheet",
  "handwritten_answer_sheet"
]);

export async function POST(request: Request) {
  const cleanupIds: string[] = [];

  try {
    const formData = await request.formData();
    const files = readFiles(formData, "files");
    const questionPaperFiles = readFiles(formData, "questionPaperFiles");
    const documentType = String(formData.get("documentType") || "") as DocumentType;

    validateFiles(files, "Exam material");
    if (!ALLOWED.has(documentType)) {
      throw new Error("Please upload a valid exam document first.");
    }

    if (documentType === "handwritten_answer_sheet") {
      validateFiles(questionPaperFiles, "Question paper");
    }

    const primaryParts = await filesToModelParts(files, cleanupIds);
    const content: any[] = [
      {
        type: "input_text",
        text: `PRIMARY DOCUMENT (${documentType}): Read all pages below as one document.`
      },
      ...primaryParts
    ];

    if (questionPaperFiles.length) {
      const questionParts = await filesToModelParts(questionPaperFiles, cleanupIds);
      content.push(
        {
          type: "input_text",
          text: "QUESTION PAPER: Use these pages as the authoritative source for question numbers and question text."
        },
        ...questionParts
      );
    }

    const result = await structuredResponse({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      system: analysisSystemPrompt(documentType),
      content,
      schemaName: "exam_evaluation_report",
      schema: reportSchema,
      maxOutputTokens: 12000
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the exam material.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    await Promise.all(cleanupIds.map(deleteOpenAIFile));
  }
}
