import type { Theme } from "@crix/themes";
import { Box, Text, useInput } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface Props {
  onSubmit: (value: string) => void;
  isProcessing: boolean;
  theme: Theme;
  activity?: string;
}

export function InputBar({ onSubmit, isProcessing, theme, activity }: Props): React.ReactElement {
  const [value, setValue] = useState("");
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const t = setInterval(() => setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(t);
  }, [isProcessing]);

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

    if (key.ctrl && input === "c") return;

    if (!key.ctrl && !key.meta && input) {
      setValue((prev) => prev + input);
    }
  });

  const spinner = SPINNER_FRAMES[spinnerFrame] ?? "⠋";
  const activityText = activity || "Working...";

  return (
    <Box
      borderStyle="single"
      borderColor={isProcessing ? theme.colors.warning : theme.colors.input.border}
      paddingX={1}
      marginTop={1}
    >
      {isProcessing ? (
        <>
          <Text color={theme.colors.warning}>{spinner} </Text>
          <Text color={theme.colors.textMuted}>{activityText}</Text>
        </>
      ) : (
        <>
          <Text color={theme.colors.primary}>&gt; </Text>
          <Text color={theme.colors.primary}>{"█"}</Text>
          {value ? (
            <Text color={theme.colors.text} wrap="wrap">
              {value}
            </Text>
          ) : (
            <Text color={theme.colors.textMuted} dimColor>
              {"  Type a prompt or /help for commands"}
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
