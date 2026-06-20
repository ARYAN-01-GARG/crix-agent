import { loadConfig } from "@crix/core";
import { ContextManager } from "@crix/context";
import { fullIndex } from "@crix/indexer";

export interface InitOptions {
  projectPath: string;
  llm: boolean;
}

export async function cmdInit({ projectPath, llm }: InitOptions): Promise<void> {
  const config = await loadConfig(projectPath);

  process.stdout.write(`[crix] Initialising project at ${projectPath}\n`);

  const ctx = new ContextManager(projectPath, config.contextLimits);
  ctx.init();

  process.stdout.write("[crix] Context files ready (.crix/)\n");
  process.stdout.write(`[crix] Indexing source files${llm ? " with LLM summaries" : " (AST only)"}...\n`);

  let lastDone = 0;
  await fullIndex({
    projectPath,
    limits: config.contextLimits,
    apiKey: llm ? config.apiKey : undefined,
    onProgress(done, total) {
      if (done !== lastDone) {
        process.stdout.write(`\r[crix] Indexed ${done}/${total} files`);
        lastDone = done;
      }
    },
  });

  process.stdout.write("\n[crix] Done. Run \`crix\` to start the TUI.\n");
}
