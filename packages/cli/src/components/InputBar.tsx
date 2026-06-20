import type { Theme } from "@crix/themes";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type React from "react";
import { useEffect, useState } from "react";
import { slashRegistry } from "../slash/registry.js";
import { SlashMenu } from "./SlashMenu.js";

interface Props {
  onSubmit: (value: string) => void;
  isProcessing: boolean;
  theme: Theme;
  placeholder?: string;
  /** "welcome" renders the left-accent card style; "chat" renders the standard prompt bar */
  variant?: "chat" | "welcome";
  mode?: string;
  model?: string;
}

export function InputBar({
  onSubmit,
  isProcessing,
  theme,
  placeholder,
  variant = "chat",
  mode,
  model,
}: Props): React.ReactElement {
  const [value, setValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allCommands = slashRegistry.all();
  const slashFilter = value.startsWith("/") ? value.slice(1) : null;
  const filteredCommands =
    slashFilter !== null ? allCommands.filter((c) => c.name.startsWith(slashFilter)) : [];
  const isMenuOpen = slashFilter !== null && !isProcessing && filteredCommands.length > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on filter change only
  useEffect(() => {
    setSelectedIndex(0);
  }, [slashFilter]);

  // Up/Down navigate the menu; Escape clears the input; Tab autocompletes
  useInput(
    (_input, key) => {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
      } else if (key.escape) {
        setValue("");
      } else if (key.tab) {
        const cmd = filteredCommands[selectedIndex];
        if (cmd) setValue(cmd.takesArgs ? `/${cmd.name} ` : `/${cmd.name}`);
      }
    },
    { isActive: isMenuOpen }
  );

  function handleSubmit(val: string) {
    // When menu is open, Enter selects the highlighted command
    if (isMenuOpen) {
      const cmd = filteredCommands[selectedIndex];
      if (cmd) {
        if (cmd.takesArgs) {
          // Fill the command name so user can type the argument
          setValue(`/${cmd.name} `);
        } else {
          setValue("");
          onSubmit(`/${cmd.name}`);
        }
      }
      return;
    }
    const trimmed = val.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue("");
    }
  }

  if (variant === "welcome") {
    return (
      <Box flexDirection="column" width="100%">
        {isMenuOpen && (
          <SlashMenu commands={filteredCommands} selectedIndex={selectedIndex} theme={theme} />
        )}
        <Box width="100%" paddingX={2} paddingY={1}>
          <Box flexDirection="column" width="100%">
            <TextInput
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              placeholder={placeholder ?? 'Ask anything... "Fix a bug in the codebase"'}
              focus={!isProcessing}
              showCursor={!isProcessing}
            />
            <Box marginTop={1} gap={1}>
              <Text color={theme.colors.primary}>{mode ?? "work"}</Text>
              <Text color={theme.colors.textMuted}>›</Text>
              <Text color={theme.colors.textMuted}>{model ?? ""}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── chat variant ─────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" width="100%">
      {isMenuOpen && (
        <SlashMenu commands={filteredCommands} selectedIndex={selectedIndex} theme={theme} />
      )}
      <Box
        width="100%"
        borderStyle="single"
        borderColor={isProcessing ? theme.colors.warning : theme.colors.input.border}
        paddingX={1}
      >
        <Text color={theme.colors.primary}>&gt; </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder ?? "Type a prompt or /help for commands"}
          focus={!isProcessing}
          showCursor={!isProcessing}
        />
      </Box>
    </Box>
  );
}
