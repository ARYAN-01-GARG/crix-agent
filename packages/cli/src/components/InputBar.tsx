import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Theme } from "@crix/themes";

interface Props {
  onSubmit: (value: string) => void;
  isProcessing: boolean;
  theme: Theme;
}

export function InputBar({ onSubmit, isProcessing, theme }: Props): React.ReactElement {
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (isProcessing) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
        setValue("");
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      return;
    }

    if (key.ctrl && input === "c") return; // handled by Ink globally

    if (!key.ctrl && !key.meta && input) {
      setValue((prev) => prev + input);
    }
  });

  const placeholder = isProcessing
    ? "Processing..."
    : 'Type a message or /help for commands';

  return (
    <Box
      borderStyle="single"
      borderColor={isProcessing ? theme.colors.warning : theme.colors.input.border}
      paddingX={1}
      marginTop={1}
    >
      <Text color={theme.colors.primary}>&gt; </Text>
      <Text color={value ? theme.colors.text : theme.colors.textMuted} wrap="wrap">
        {value || placeholder}
      </Text>
      {!isProcessing && (
        <Text color={theme.colors.primary}>
          {"█"}
        </Text>
      )}
    </Box>
  );
}
