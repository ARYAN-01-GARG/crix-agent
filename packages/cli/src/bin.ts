#!/usr/bin/env node
import { program, Command } from "commander";
import { resolve } from "node:path";
import { start } from "./index.js";
import { cmdInit } from "./commands/init.js";
import { cmdSessionList, cmdSessionResume } from "./commands/session.js";

program
  .name("crix")
  .description("Context-Routed Index eXecutor — an enterprise TUI coding agent")
  .version("0.1.0");

// Default action: launch TUI
program
  .option("-p, --project <path>", "project path (defaults to cwd)")
  .option("--debug", "enable debug logging")
  .action((opts: { project?: string; debug?: boolean }) => {
    start({ projectPath: opts.project, debug: opts.debug }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

// crix init [path]
program
  .command("init [path]")
  .description("initialise .crix/ and index the project (run once per project)")
  .option("--no-llm", "skip LLM summarisation — AST structure only")
  .action((path: string | undefined, opts: { llm: boolean }) => {
    cmdInit({ projectPath: path ? resolve(path) : process.cwd(), llm: opts.llm }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

// crix session <subcommand>
const session = new Command("session").description("manage saved sessions");

session
  .command("list [path]")
  .description("list saved sessions for a project")
  .action((path: string | undefined) => {
    cmdSessionList({ projectPath: path ? resolve(path) : process.cwd() }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

session
  .command("resume <id>")
  .description("resume a previous session by ID")
  .option("-p, --project <path>", "project path (defaults to cwd)")
  .action((id: string, opts: { project?: string }) => {
    cmdSessionResume({
      sessionId: id,
      projectPath: opts.project ? resolve(opts.project) : process.cwd(),
    }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.addCommand(session);

program.parse();
