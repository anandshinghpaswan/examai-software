import { isImage, isPdf } from "@/lib/files";

type ModelContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_file"; file_id: string; detail?: "low" | "high" | "auto" }
  | { type: "input_image"; image_url: string; detail?: "low" | "high" | "auto" };

const OPENAI_BASE = "https://api.openai.com/v1";

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return key;
}

async function openaiJson(path: string, init: RequestInit) {
  const response = await fetch(`${OPENAI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

async function uploadFile(file: File) {
  const body = new FormData();
  body.append("purpose", "user_data");
  body.append("file", file, file.name);

  return openaiJson("/files", {
    method: "POST",
    body
  });
}

export async function deleteOpenAIFile(id: string) {
  try {
    await openaiJson(`/files/${id}`, { method: "DELETE" });
  } catch {
    // Cleanup failure must not hide a successful exam result.
  }
}

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function filesToModelParts(files: File[], cleanupIds: string[]) {
  const parts: ModelContentPart[] = [];

  for (const file of files) {
    if (isPdf(file)) {
      const uploaded = await uploadFile(file);
      cleanupIds.push(uploaded.id);
      parts.push({ type: "input_file", file_id: uploaded.id, detail: "high" });
      continue;
    }

    if (isImage(file)) {
      parts.push({
        type: "input_image",
        image_url: await fileToDataUrl(file),
        detail: "high"
      });
      continue;
    }

    throw new Error(`Unsupported file: ${file.name}`);
  }

  return parts;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const chunks: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function structuredResponse(args: {
  model: string;
  system: string;
  content: ModelContentPart[];
  schemaName: string;
  schema: object;
  maxOutputTokens?: number;
}) {
  const data = await openaiJson("/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      input: [
        { role: "system", content: args.system },
        { role: "user", content: args.content }
      ],
      max_output_tokens: args.maxOutputTokens || 8000,
      text: {
        format: {
          type: "json_schema",
          name: args.schemaName,
          strict: true,
          schema: args.schema
        }
      }
    })
  });

  const text = outputText(data);
  if (!text) throw new Error("The AI returned an empty result.");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The AI returned an invalid structured result. Please try again.");
  }
}
