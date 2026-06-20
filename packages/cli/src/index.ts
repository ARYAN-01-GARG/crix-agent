import { resolve } from "node:path";
import { ContextManager } from "@crix/context";
import { loadConfig } from "@crix/core";
import { ModeStateMachine, SessionStore } from "@crix/core";
import { getDbPath } from "@crix/core";
import { createEventEmitter } from "@crix/events";
import { Harness } from "@crix/harness";
import { Orchestrator } from "@crix/orchestrator";
import { render } from "ink";
import React from "react";
import { App } from "./app.js";

export interface StartOptions {
  projectPath?: string;
  debug?: boolean;
  /** Resume an existing session instead of creating a new one. */
  resumeSessionId?: string;
}

export async function start(opts: StartOptions = {}): Promise<void> {
  const projectPath = resolve(opts.projectPath ?? process.cwd());

  // Silence all logging in TUI mode — logs corrupt Ink's stdout renderer.
  if (!opts.debug) {
    process.env.LOG_LEVEL = "silent";
  }

  // Enter alternate screen buffer so crix owns a clean full screen
  // and the user's shell history is restored on exit.
  const useAltScreen = process.stdout.isTTY && !opts.debug;
  if (useAltScreen) {
    process.stdout.write("\x1b[?1049h"); // enter alternate screen
    process.stdout.write("\x1b[H"); // move cursor to top-left
  }
  const restoreScreen = () => {
    if (useAltScreen) process.stdout.write("\x1b[?1049l");
  };
  process.on("exit", restoreScreen);
  process.on("SIGTERM", () => {
    restoreScreen();
    process.exit(0);
  });

  const config = await loadConfig(projectPath);

  const context = new ContextManager(projectPath, config.contextLimits);
  context.init();

  const sessionStore = new SessionStore(getDbPath(projectPath));

  const session = opts.resumeSessionId
    ? (sessionStore.get(opts.resumeSessionId) ?? sessionStore.create(projectPath))
    : sessionStore.create(projectPath);

  const emitter = createEventEmitter("local");
  const mode = new ModeStateMachine(session.mode, emitter, session.id);

  const harness = new Harness({
    projectPath,
    sessionId: session.id,
    mode,
    emitter,
    permissions: config.harness.permissions,
  });

  const orchestrator = new Orchestrator({
    config,
    harness,
    emitter,
    sessionStore,
    projectPath,
  });

  const { waitUntilExit } = render(
    React.createElement(App, {
      config,
      orchestrator,
      mode,
      sessionId: session.id,
      projectPath,
      emitter,
      resumed: !!opts.resumeSessionId,
    }),
    { exitOnCtrlC: false }
  );

  await waitUntilExit();
  sessionStore.close();
  restoreScreen();
}
