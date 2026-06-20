import type { ModeStateMachine } from "@crix/core";
import type { IEventEmitter } from "@crix/events";
import type { Orchestrator } from "@crix/orchestrator";
import { generateId } from "@crix/shared";
import type { CrixConfig } from "@crix/shared";
import { resolveTheme } from "@crix/themes";
import type { ThemeName } from "@crix/themes";
import { Box, useApp, useInput } from "ink";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { InputBar } from "./components/InputBar.js";
import { MessageList } from "./components/MessageList.js";
import type { Message } from "./components/MessageList.js";
import { StatusBar } from "./components/StatusBar.js";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
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
  emitter: IEventEmitter;
  resumed?: boolean;
}

export function App({
  config,
  orchestrator,
  mode,
  sessionId,
  projectPath,
  emitter,
  resumed,
}: Props): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<"welcome" | "chat">(resumed ? "chat" : "welcome");
  const [messages, setMessages] = useState<Message[]>(
    resumed
      ? [
          {
            id: generateId("msg"),
            role: "system",
            content: `Session resumed. Mode: ${mode.get()} | Type /help for commands.`,
          },
        ]
      : []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [themeName, setThemeName] = useState<string>("default");
  const [currentMode, setCurrentMode] = useState<"plan" | "work" | "review">(mode.get());

  const theme = resolveTheme(themeName as ThemeName);

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: generateId("msg") }]);
  }, []);

  // Listen for streaming text chunks from agents
  useEffect(() => {
    const handler = (event: import("@crix/events").CrixEvent<"agent:text">) => {
      if (event.sessionId === sessionId) {
        setStreamingContent((prev) => prev + event.payload.chunk);
      }
    };
    emitter.on("agent:text", handler);
    return () => {
      emitter.off("agent:text", handler);
    };
  }, [emitter, sessionId]);

  // Ctrl+D / Ctrl+C to exit
  useInput((_input, key) => {
    if (key.ctrl && (_input === "d" || _input === "c") && !isProcessing) {
      exit();
    }
  });

  const handleSubmit = useCallback(
    async (input: string) => {
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

      // Check slash command
      const parsed = parseSlash(input);
      if (parsed) {
        const cmd = slashRegistry.get(parsed.command);
        if (cmd) {
          await cmd.execute(parsed.args, slashCtx);
        } else {
          addMessage({
            role: "system",
            content: `Unknown command: /${parsed.command}. Try /help.`,
          });
        }
        return;
      }

      // Transition from welcome to chat on first real prompt
      if (screen === "welcome") {
        setScreen("chat");
      }

      addMessage({ role: "user", content: input });
      setIsProcessing(true);
      setStreamingContent("");

      try {
        const result = await orchestrator.process(input, sessionId, mode);
        setStreamingContent("");
        addMessage({ role: "assistant", content: result.response });
      } catch (err) {
        setStreamingContent("");
        addMessage({
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [orchestrator, sessionId, mode, addMessage, config.model, currentMode, themeName, exit, screen]
  );

  if (screen === "welcome") {
    return <WelcomeScreen theme={theme} onSubmit={handleSubmit} />;
  }

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar mode={currentMode} model={config.model} theme={theme} projectPath={projectPath} />
      <MessageList messages={messages} theme={theme} streamingContent={streamingContent} />
      <InputBar onSubmit={handleSubmit} isProcessing={isProcessing} theme={theme} />
    </Box>
  );
}
