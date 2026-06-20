import type React from "react";
import { Box, Text } from "ink";
import type { Theme } from "@crix/themes";

interface Props {
  mode: string;
  model: string;
  theme: Theme;
  projectPath: string;
}

export function StatusBar({ mode, model, theme, projectPath }: Props): React.ReactElement {
  const shortPath = projectPath.split("/").slice(-2).join("/");

  return (
    <Box
      borderStyle="single"
      borderColor={theme.colors.border}
      paddingX={1}
      justifyContent="space-between"
    >
      <Text
        color={
          mode === "plan"
            ? theme.colors.statusBar.modePlan
            : mode === "review"
              ? theme.colors.statusBar.modeReview
              : theme.colors.statusBar.modeWork
        }
        bold
      >
        {`[${mode.toUpperCase()}]`}
      </Text>
      <Text color={theme.colors.statusBar.text}> {shortPath} </Text>
      <Text color={theme.colors.textMuted}>{model}</Text>
    </Box>
  );
}
