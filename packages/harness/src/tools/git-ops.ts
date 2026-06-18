import { z } from "zod";
import { simpleGit } from "simple-git";
import { HarnessPermissionError } from "@crix/shared";
import { trimOutput } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  operation: z
    .enum(["status", "diff", "log", "branch", "add", "commit"])
    .describe("Git operation to perform"),
  args: z
    .array(z.string())
    .default([])
    .describe("Additional arguments (e.g. file paths for add, message for commit)"),
});

const WRITE_OPS = new Set(["add", "commit"]);

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  if (WRITE_OPS.has(args.operation) && !ctx.mode.canWrite()) {
    throw new HarnessPermissionError("git_ops", `mode:${ctx.mode.get()}`);
  }

  const git = simpleGit(ctx.projectPath);
  let output = "";

  switch (args.operation) {
    case "status": {
      const s = await git.status();
      output = [
        `Branch: ${s.current}`,
        s.staged.length ? `Staged: ${s.staged.join(", ")}` : "",
        s.modified.length ? `Modified: ${s.modified.join(", ")}` : "",
        s.not_added.length ? `Untracked: ${s.not_added.join(", ")}` : "",
        s.deleted.length ? `Deleted: ${s.deleted.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    }
    case "diff": {
      output = await git.diff(args.args);
      break;
    }
    case "log": {
      const log = await git.log({ maxCount: 10, ...Object.fromEntries(args.args.map((a, i) => [i, a])) });
      output = log.all
        .map((c) => `${c.hash.slice(0, 7)} ${c.date.slice(0, 10)} ${c.message}`)
        .join("\n");
      break;
    }
    case "branch": {
      const branches = await git.branch();
      output = Object.values(branches.branches)
        .map((b) => `${b.current ? "* " : "  "}${b.name}`)
        .join("\n");
      break;
    }
    case "add": {
      await git.add(args.args.length ? args.args : ["."]);
      output = `Staged: ${args.args.length ? args.args.join(", ") : "all changes"}`;
      break;
    }
    case "commit": {
      const message = args.args[0] ?? "chore: update";
      const result = await git.commit(message);
      output = `Committed: ${result.commit} — ${message}`;
      break;
    }
  }

  return trimOutput(output || "(no output)");
};

export const gitOpsTool: ToolDefinition<typeof parameters> = {
  name: "git_ops",
  description:
    "Run a git operation: status, diff, log, branch (read-only), or add/commit (work mode only).",
  parameters,
  execute,
};
