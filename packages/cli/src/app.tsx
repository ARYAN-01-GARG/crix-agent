import type { ModeStateMachine } from "@crix/core";
import type { IEventEmitter } from "@crix/events";
import type { Orchestrator } from "@crix/orchestrator";
import { generateId } from "@crix/shared";
import type { CrixConfig } from "@crix/shared";
import { resolveTheme } from "@crix/themes";
import type { ThemeName } from "@crix/themes";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputBar } from "./components/InputBar.js";
import { MessageList } from "./components/MessageList.js";
import type { Message, ToolEntry } from "./components/MessageList.js";
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

const TOOL_LABELS: Record<string, string> = {
  read_file: "Reading",
  write_file: "Writing",
  create_file: "Creating",
  delete_file: "Deleting",
  list_files: "Listing",
  run_shell: "Running",
  git_ops: "Git",
  search_code: "Searching",
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function toolActivity(toolName: string, args: Record<string, unknown>): string {
  const label = TOOL_LABELS[toolName] ?? toolName;
  const target =
    (args.path as string | undefined) ??
    (args.filePath as string | undefined) ??
    (args.command as string | undefined) ??
    (args.query as string | undefined) ??
    "";
  return target ? `${label} ${target}` : `${label}...`;
}

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
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
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
  const [activity, setActivity] = useState("");
  const [activeRole, setActiveRole] = useState<string>("");
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [themeName, setThemeName] = useState<string>("default");
  const [currentMode, setCurrentMode] = useState<"plan" | "work" | "review">(mode.get());
  const [inputPlaceholder, setInputPlaceholder] = useState<string | undefined>(undefined);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Accumulate per-response tool calls and streaming text in refs (no re-render needed)
  const toolCallsRef = useRef<ToolEntry[]>([]);
  const streamingRef = useRef<string>("");

  const theme = resolveTheme(themeName as ThemeName);

  useEffect(() => {
    if (!isProcessing) return;
    const t = setInterval(() => setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(t);
  }, [isProcessing]);

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: generateId("msg") }]);
  }, []);

  // Capture agent role when work starts
  useEffect(() => {
    const handler = (event: import("@crix/events").CrixEvent<"agent:start">) => {
      if (event.sessionId === sessionId) {
        setActiveRole(event.payload.role);
      }
    };
    emitter.on("agent:start", handler);
    return () => emitter.off("agent:start", handler);
  }, [emitter, sessionId]);

  // Stream text chunks — accumulate in ref for thinking storage, also update state for live preview
  useEffect(() => {
    const handler = (event: import("@crix/events").CrixEvent<"agent:text">) => {
      if (event.sessionId === sessionId) {
        streamingRef.current += event.payload.chunk;
        setActivity("Generating...");
      }
    };
    emitter.on("agent:text", handler);
    return () => emitter.off("agent:text", handler);
  }, [emitter, sessionId]);

  // Track tool calls per response
  useEffect(() => {
    const handler = (event: import("@crix/events").CrixEvent<"tool:call">) => {
      if (event.sessionId === sessionId) {
        const target =
          (event.payload.args.path as string | undefined) ??
          (event.payload.args.filePath as string | undefined) ??
          (event.payload.args.command as string | undefined) ??
          (event.payload.args.query as string | undefined) ??
          "";
        toolCallsRef.current.push({ tool: event.payload.tool, target });
        setActivity(toolActivity(event.payload.tool, event.payload.args));
      }
    };
    emitter.on("tool:call", handler);
    return () => emitter.off("tool:call", handler);
  }, [emitter, sessionId]);

  // Ctrl+D / Ctrl+C to exit
  useInput(
    (_input, key) => {
      if (key.ctrl && (_input === "d" || _input === "c")) exit();
    },
    { isActive: true }
  );

  // Cleanup fade timer on unmount
  useEffect(
    () => () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    },
    []
  );

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

      if (screen === "welcome") setScreen("chat");

      addMessage({ role: "user", content: input });
      setIsProcessing(true);
      streamingRef.current = "";
      toolCallsRef.current = [];
      setActiveRole("");
      setActivity("Thinking...");
      setInputPlaceholder(undefined);

      try {
        const result = await orchestrator.process(input, sessionId, mode);

        // Attach thinking + tool calls captured during this response
        const thinkingText = streamingRef.current;
        const toolCalls = [...toolCallsRef.current];

        addMessage({
          role: "assistant",
          content: result.response,
          thinking: thinkingText || undefined,
          agentRole: activeRole || undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });

        setInputPlaceholder(result.nextSteps || undefined);
        setActivity("Done");
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => setActivity(""), 1800);
      } catch (err) {
        setActivity("");
        addMessage({
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [
      orchestrator,
      sessionId,
      mode,
      addMessage,
      config.model,
      currentMode,
      themeName,
      exit,
      screen,
      activeRole,
    ]
  );

  if (screen === "welcome") {
    return (
      <WelcomeScreen
        theme={theme}
        onSubmit={handleSubmit}
        mode={currentMode}
        model={config.model}
      />
    );
  }

  const spinner = SPINNER_FRAMES[spinnerFrame] ?? "⠋";
  // Compose the activity label: include role when known
  const activityLabel = activeRole && isProcessing ? `${activeRole} · ${activity}` : activity;

  // Rows consumed by fixed chrome outside the message list:
  //   1  StatusBar
  //   0|1  activity line
  //   1  marginTop={1} above InputBar
  //   3  InputBar (top border + content + bottom border)
  const fixedRows = 1 + (activityLabel ? 1 : 0) + 1 + 3;
  const availableRows = Math.max(0, rows - fixedRows);

  return (
    <Box flexDirection="column" width="100%" height={rows} overflow="hidden">
      <StatusBar mode={currentMode} model={config.model} theme={theme} projectPath={projectPath} />
      <MessageList messages={messages} theme={theme} availableRows={availableRows} />
      {activityLabel ? (
        <Box paddingX={2}>
          <Text color={theme.colors.textMuted} dimColor>
            {isProcessing ? `${spinner} ` : "✓ "}
            {activityLabel}
          </Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <InputBar
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          theme={theme}
          placeholder={isProcessing ? undefined : inputPlaceholder}
        />
      </Box>
    </Box>
  );
}
