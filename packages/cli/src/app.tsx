import React, { useState, useCallback } from "react";
import { Box, useApp, useInput } from "ink";
import { resolveTheme } from "@crix/themes";
import type { ThemeName } from "@crix/themes";
import { generateId } from "@crix/shared";
import type { CrixConfig } from "@crix/shared";
import type { Orchestrator } from "@crix/orchestrator";
import type { ModeStateMachine } from "@crix/core";
import { StatusBar } from "./components/StatusBar.js";
import { MessageList } from "./components/MessageList.js";
import type { Message } from "./components/MessageList.js";
import { InputBar } from "./components/InputBar.js";
import { parseSlash } from "./slash/parser.js";
import { slashRegistry } from "./slash/registry.js";
// Side-effect: register all slash commands
import "./slash/commands/help.js";
import "./slash/commands/mode.js";
import "./slash/commands/theme.js";
import "./slash/commands/model.js";
import "./slash/commands/exit.js";

interface Props {
  config: CrixConfig;
  orchestrator: Orchestrator;
  mode: ModeStateMachine;
  sessionId: string;
  projectPath: string;
  resumed?: boolean;
}

export function App({ config, orchestrator, mode, sessionId, projectPath, resumed }: Props): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId("msg"),
      role: "system",
      content: resumed
        ? `Session resumed. Mode: ${mode.get()} | Type /help for commands.`
        : `Welcome to crix. Mode: ${mode.get()} | Type /help for commands.`,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [themeName, setThemeName] = useState<string>(config.model ? "default" : "default");
  const [currentMode, setCurrentMode] = useState<"plan" | "work" | "review">(mode.get());

  const theme = resolveTheme(themeName as ThemeName);

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: generateId("msg") }]);
  }, []);

  // Ctrl+D / Ctrl+C to exit
  useInput((_input, key) => {
    if ((key.ctrl && (_input === "d" || _input === "c")) && !isProcessing) {
      exit();
    }
  });

  const slashCtx = {
    setMode: (m: string) => {
      const typed = m as "plan" | "work" | "review";
      mode.set(typed);
      setCurrentMode(typed);
    },
    setTheme: (t: string) => setThemeName(t),
    getModel: () => config.model,
    getMode: () => currentMode,
    getTheme: () => themeName,
    exit,
    addMessage: (role: "system", content: string) => addMessage({ role, content }),
  };

  const handleSubmit = useCallback(
    async (input: string) => {
      // Check slash command
      const parsed = parseSlash(input);
      if (parsed) {
        const cmd = slashRegistry.get(parsed.command);
        if (cmd) {
          await cmd.execute(parsed.args, slashCtx);
        } else {
          addMessage({ role: "system", content: `Unknown command: /${parsed.command}. Try /help.` });
        }
        return;
      }

      // Regular message — route to orchestrator
      addMessage({ role: "user", content: input });
      setIsProcessing(true);

      try {
        const result = await orchestrator.process(input, sessionId, mode);
        addMessage({ role: "assistant", content: result.summary });
      } catch (err) {
        addMessage({
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [orchestrator, sessionId, mode, addMessage, slashCtx]
  );

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        mode={currentMode}
        model={config.model}
        theme={theme}
        projectPath={projectPath}
      />
      <MessageList messages={messages} theme={theme} />
      <InputBar onSubmit={handleSubmit} isProcessing={isProcessing} theme={theme} />
    </Box>
  );
}
