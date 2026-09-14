import { NextResponse } from "next/server";
import { readFiles, validateFiles } from "@/lib/files";
import { deleteOpenAIFile, filesToModelParts, structuredResponse } from "@/lib/openai";
import { DETECTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { detectionSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cleanupIds: string[] = [];

  try {
    const formData = await request.formData();
    const files = readFiles(formData, "files");
    validateFiles(files, "Exam material");

    const fileParts = await filesToModelParts(files, cleanupIds);
    const result = await structuredResponse({
      model: process.env.OPENAI_DETECT_MODEL || "gpt-5.6-luna",
      system: DETECTION_SYSTEM_PROMPT,
      content: [
        {
          type: "input_text",
          text: "Classify these uploaded pages as one exam document."
        },
        ...fileParts
      ],
      schemaName: "exam_document_detection",
      schema: detectionSchema,
      maxOutputTokens: 300
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to detect the document.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    await Promise.all(cleanupIds.map(deleteOpenAIFile));
  }
}
