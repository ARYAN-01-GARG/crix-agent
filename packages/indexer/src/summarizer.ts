import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ParsedFile, ParsedSymbol } from "./parser.js";

export interface SymbolSummary {
  name: string;
  summary: string;
}

export interface FileSummary {
  filePath: string;
  symbols: SymbolSummary[];
}

function buildSummarizePrompt(filePath: string, symbols: ParsedSymbol[], sourceSnippet: string): string {
  const symbolList = symbols
    .map((s) => {
      const sig = s.params !== undefined ? `${s.name}(${s.params})` : s.name;
      return `- ${s.kind} \`${sig}\` (line ${s.line})`;
    })
    .join("\n");

  return `You are a code documentation assistant. Given a source file and its top-level symbols, write a concise 1-2 sentence description for each symbol.

File: ${filePath}

Symbols to document:
${symbolList}

Source (first 60 lines for context):
\`\`\`
${sourceSnippet}
\`\`\`

Respond with ONLY a JSON array in this exact shape (no markdown, no explanation):
[
  { "name": "<symbol_name>", "summary": "<1-2 sentence description>" },
  ...
]

Keep each summary under 120 characters. Describe what the symbol does, not what language feature it uses.`;
}

function parseResponse(text: string, symbols: ParsedSymbol[]): SymbolSummary[] {
  try {
    // Strip any markdown code fences the model might add
    const cleaned = text.replace(/```(?:json)?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Array<{ name: string; summary: string }>;
    return parsed.map((item) => ({
      name: item.name,
      summary: item.summary ?? "",
    }));
  } catch {
    // Fallback: return symbols with empty summaries
    return symbols.map((s) => ({ name: s.name, summary: "" }));
  }
}

export async function summarizeFile(
  parsed: ParsedFile,
  sourceSnippet: string,
  apiKey?: string
): Promise<FileSummary> {
  if (parsed.symbols.length === 0) {
    return { filePath: parsed.filePath, symbols: [] };
  }

  const anthropic = createAnthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: buildSummarizePrompt(parsed.filePath, parsed.symbols, sourceSnippet),
      maxTokens: 1024,
    });

    return {
      filePath: parsed.filePath,
      symbols: parseResponse(text, parsed.symbols),
    };
  } catch {
    // Don't fail the whole index if LLM is unavailable — return empty summaries
    return {
      filePath: parsed.filePath,
      symbols: parsed.symbols.map((s) => ({ name: s.name, summary: "" })),
    };
  }
}

export async function summarizeBatch(
  files: Array<{ parsed: ParsedFile; sourceSnippet: string }>,
  apiKey?: string,
  concurrency = 5
): Promise<FileSummary[]> {
  const results: FileSummary[] = [];

  // Process in batches of `concurrency` to avoid rate limits
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(({ parsed, sourceSnippet }) => summarizeFile(parsed, sourceSnippet, apiKey))
    );
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
    }
  }

  return results;
}
