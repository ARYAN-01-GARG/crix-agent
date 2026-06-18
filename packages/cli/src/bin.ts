#!/usr/bin/env node
import { program } from "commander";
import { start } from "./index.js";

program
  .name("crix")
  .description("Context-Routed Index eXecutor — an enterprise TUI coding agent")
  .version("0.1.0")
  .option("-p, --project <path>", "Project path (defaults to cwd)")
  .option("--debug", "Enable debug logging")
  .action((opts: { project?: string; debug?: boolean }) => {
    start({ projectPath: opts.project, debug: opts.debug }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();
