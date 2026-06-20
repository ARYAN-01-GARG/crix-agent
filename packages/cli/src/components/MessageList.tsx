import type { Theme } from "@crix/themes";
import { Box, Text } from "ink";
import type React from "react";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface Props {
  messages: Message[];
  theme: Theme;
  streamingContent?: string;
}

/** Strip markdown syntax markers so raw `**bold**`, `## Heading` etc. don't appear in terminal. */
function stripMarkdown(text: string): string {
  return (
    text
      // fenced code blocks — keep content, drop backtick fences
      .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code: string) => code.trim())
      // bold + italic combinations
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      // bold
      .replace(/\*\*(.+?)\*\*/g, "$1")
      // italic
      .replace(/\*(.+?)\*/g, "$1")
      // ATX headings (## Heading)
      .replace(/^#{1,6}\s+/gm, "")
      // inline code — keep content
      .replace(/`(.+?)`/g, "$1")
      // horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "─".repeat(40))
      // blockquotes
      .replace(/^>\s*/gm, "  ")
      // unordered list markers
      .replace(/^[-*+]\s+/gm, "• ")
      .trim()
  );
}

function UserMessage({ content, theme }: { content: string; theme: Theme }): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.colors.textMuted}>You</Text>
      <Box borderStyle="round" borderColor={theme.colors.userMessage} paddingX={1}>
        <Text color={theme.colors.text} wrap="wrap">
          {content}
        </Text>
      </Box>
    </Box>
  );
}

function AssistantMessage({
  content,
  theme,
}: { content: string; theme: Theme }): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.colors.primary} bold>
        crix
      </Text>
      <Box borderStyle="round" borderColor={theme.colors.agentMessage} paddingX={1}>
        <Text color={theme.colors.text} wrap="wrap">
          {stripMarkdown(content)}
        </Text>
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

export function MessageList({ messages, theme, streamingContent }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1} overflowY="hidden">
      {messages.map((msg) => {
        switch (msg.role) {
          case "user":
            return <UserMessage key={msg.id} content={msg.content} theme={theme} />;
          case "assistant":
            return <AssistantMessage key={msg.id} content={msg.content} theme={theme} />;
          case "system":
            return <SystemMessage key={msg.id} content={msg.content} theme={theme} />;
        }
      })}
      {streamingContent && <AssistantMessage content={`${streamingContent}▋`} theme={theme} />}
    </Box>
  );
}
