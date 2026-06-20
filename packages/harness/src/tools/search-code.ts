import { readFileSync } from "node:fs";
import { z } from "zod";
import fg from "fast-glob";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  query: z.string().describe("Text or regex pattern to search for"),
  pattern: z
    .string()
    .default("**/*")
    .describe("Glob pattern to scope the search (e.g. 'src/**/*.ts')"),
  isRegex: z.boolean().default(false).describe("Treat query as a regular expression"),
  maxResults: z.number().int().min(1).max(200).default(50).describe("Maximum number of matches"),
});

const execute = async (args: z.infer<typeof parameters>, ctx: ToolContext): Promise<ToolResult> => {
  const files = await fg(args.pattern, {
    cwd: ctx.projectPath,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    onlyFiles: true,
  });

  const regex = args.isRegex
    ? new RegExp(args.query)
    : new RegExp(args.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const matches: string[] = [];

  for (const file of files) {
    if (matches.length >= args.maxResults) break;
    try {
      const lines = readFileSync(`${ctx.projectPath}/${file}`, "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= args.maxResults) break;
        const line = lines[i];
        if (line !== undefined && regex.test(line)) {
          matches.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  if (matches.length === 0) {
    return { content: `No matches found for: ${args.query}` };
  }

  const truncated = matches.length >= args.maxResults;
  return {
    content:
      matches.join("\n") + (truncated ? `\n\n... (showing first ${args.maxResults} matches)` : ""),
    truncated,
  };
};

export const searchCodeTool: ToolDefinition<typeof parameters> = {
  name: "search_code",
  description: "Search for text or a regex pattern across source files in the project.",
  parameters,
  execute,
};
