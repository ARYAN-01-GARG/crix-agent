import type { Theme } from "@crix/themes";
import { Box, Text, useStdout } from "ink";
import type React from "react";

export interface ToolEntry {
  tool: string;
  target: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Raw streaming text stored silently — shown as collapsed thinking block */
  thinking?: string;
  /** Which specialist agent produced this response */
  agentRole?: string;
  /** Aggregated tool calls made during this response */
  toolCalls?: ToolEntry[];
}

interface Props {
  messages: Message[];
  theme: Theme;
  /** Terminal rows available for the message list (used for tail-slicing) */
  availableRows: number;
}

const TOOL_VERB: Record<string, string> = {
  read_file: "Read",
  write_file: "Wrote",
  create_file: "Created",
  delete_file: "Deleted",
  list_files: "Listed",
  run_shell: "Ran",
  git_ops: "Git",
  search_code: "Searched",
};

/** Remove the done block (and partial streaming ones) before rendering */
function stripDoneBlock(text: string): string {
  let out = text.replace(/\n?```done[\s\S]*?```/g, "");
  out = out.replace(/\n?```done[\s\S]*$/, "");
  return out.trim();
}

/** Strip markdown syntax so raw `**bold**`, `## Heading` etc. don't show */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code: string) => code.trim())
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, "─".repeat(40))
    .replace(/^>\s*/gm, "  ")
    .replace(/^[-*+]\s+/gm, "• ")
    .trim();
}

/** Count how many terminal rows a string occupies when wrapped to `width` */
function countWrappedLines(text: string, width: number): number {
  if (width <= 0) return 1;
  return text
    .split("\n")
    .reduce((acc, line) => acc + Math.max(1, Math.ceil((line.length || 1) / width)), 0);
}

/** Estimate terminal rows a message will consume */
function estimateHeight(msg: Message, cols: number): number {
  if (msg.role === "user") {
    // left border (1) + paddingX=2 on each side (4) = 5 chars overhead
    const usable = Math.max(1, cols - 5);
    return countWrappedLines(msg.content, usable) + 1; // +1 marginBottom
  }

  if (msg.role === "assistant") {
    const toolGroups = buildToolGroups(msg.toolCalls ?? []);
    const hasThinking = (msg.thinking?.trim().length ?? 0) > 0;
    let count = 1; // role label
    for (const g of toolGroups) count += 1 + g.targets.length;
    if (hasThinking) count += 1;
    if (toolGroups.length > 0 || hasThinking) count += 1; // marginTop before content
    const content = stripMarkdown(stripDoneBlock(msg.content));
    count += countWrappedLines(content, Math.max(1, cols - 2));
    count += 1; // marginBottom
    return count;
  }

  // system
  return countWrappedLines(msg.content, Math.max(1, cols - 2)) + 1;
}

/** Group tool calls by verb and collect unique targets */
function buildToolGroups(calls: ToolEntry[]): Array<{ label: string; targets: string[] }> {
  const map = new Map<string, string[]>();
  for (const c of calls) {
    const verb = TOOL_VERB[c.tool] ?? c.tool;
    const existing = map.get(verb) ?? [];
    if (c.target && !existing.includes(c.target)) existing.push(c.target);
    map.set(verb, existing);
  }
  return [...map.entries()].map(([label, targets]) => ({ label, targets }));
}

function UserMessage({ content, theme }: { content: string; theme: Theme }): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="single"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderLeft={true}
        borderLeftColor={theme.colors.userMessage}
        paddingX={2}
      >
        <Text color={theme.colors.text}>{content}</Text>
      </Box>
    </Box>
  );
}

function AssistantMessage({ msg, theme }: { msg: Message; theme: Theme }): React.ReactElement {
  const roleLabel = msg.agentRole ?? "crix";
  const toolGroups = msg.toolCalls ? buildToolGroups(msg.toolCalls) : [];
  const hasThinking = msg.thinking && msg.thinking.trim().length > 0;
  const thinkingLen = msg.thinking?.trim().length ?? 0;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Agent label */}
      <Text color={theme.colors.primary} bold>
        {roleLabel}
      </Text>

      {/* Tool call summary — shown before the response text */}
      {toolGroups.map((g) => (
        <Box key={g.label} flexDirection="column" marginLeft={2} marginBottom={0}>
          <Text color={theme.colors.textMuted}>
            {g.label}
            {g.targets.length > 0
              ? ` ${g.targets.length} file${g.targets.length > 1 ? "s" : ""}`
              : ""}
          </Text>
          {g.targets.map((t) => (
            <Box key={t} marginLeft={2}>
              <Text color={theme.colors.border}>{"└ "}</Text>
              <Text color={theme.colors.textMuted}>{t}</Text>
            </Box>
          ))}
        </Box>
      ))}

      {/* Collapsed thinking indicator */}
      {hasThinking && (
        <Box marginLeft={2} marginBottom={0}>
          <Text color={theme.colors.border}>{"▸ "}</Text>
          <Text color={theme.colors.textMuted} dimColor>
            {"thinking  "}
          </Text>
          <Text color={theme.colors.border} dimColor>
            {`${thinkingLen} chars`}
          </Text>
        </Box>
      )}

      {/* Main response — plain text, no box */}
      <Box marginTop={toolGroups.length > 0 || hasThinking ? 1 : 0}>
        <Box flexDirection="column">
          {stripMarkdown(msg.content)
            .split("\n")
            .map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static content lines
              <Text key={i} color={theme.colors.text} wrap="wrap">
                {line}
              </Text>
            ))}
        </Box>
      </Box>
    </Box>
  );
}

function SystemMessage({ content, theme }: { content: string; theme: Theme }): React.ReactElement {
  return (
    <Box marginBottom={1} paddingX={1}>
      <Text color={theme.colors.info} dimColor>
        {content}
      </Text>
    </Box>
  );
}

export function MessageList({ messages, theme, availableRows }: Props): React.ReactElement {
  const { stdout } = useStdout();
  // Guard against 0 — would make every line a separate row and explode estimates
  const cols = Math.max(20, stdout?.columns ?? 80);

  // Walk messages newest→oldest, collect the tail that fits in availableRows.
  // Always show at least the most recent message so the screen is never blank.
  let displayMessages = messages;
  if (availableRows > 0 && messages.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees last element
    let totalLines = estimateHeight(messages[messages.length - 1]!, cols);
    let startIdx = messages.length - 1;
    for (let i = messages.length - 2; i >= 0; i--) {
      // biome-ignore lint/style/noNonNullAssertion: index is within bounds
      const h = estimateHeight(messages[i]!, cols);
      if (totalLines + h > availableRows) break;
      totalLines += h;
      startIdx = i;
    }
    displayMessages = messages.slice(startIdx);
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {displayMessages.map((msg) => {
        switch (msg.role) {
          case "user":
            return <UserMessage key={msg.id} content={msg.content} theme={theme} />;
          case "assistant":
            return <AssistantMessage key={msg.id} msg={msg} theme={theme} />;
          case "system":
            return <SystemMessage key={msg.id} content={msg.content} theme={theme} />;
        }
      })}
    </Box>
  );
}
