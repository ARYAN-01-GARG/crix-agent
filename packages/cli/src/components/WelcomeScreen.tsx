import type { Theme } from "@crix/themes";
import { Box, Text, useStdout } from "ink";
import type React from "react";
import { InputBar } from "./InputBar.js";

interface Props {
  theme: Theme;
  onSubmit: (value: string) => void;
  mode: string;
  model: string;
}

export function WelcomeScreen({ theme, onSubmit, mode, model }: Props): React.ReactElement {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      justifyContent="center"
      alignItems="center"
    >
      {/* ── Logo block ── */}
      <Box flexDirection="column" alignItems="center">
        <Text color={theme.colors.primary} bold>
          {"  ██████╗██████╗ ██╗██╗  ██╗  "}
        </Text>
        <Text color={theme.colors.primary} bold>
          {" ██╔════╝██╔══██╗██║╚██╗██╔╝  "}
        </Text>
        <Text color={theme.colors.primary} bold>
          {" ██║     ██████╔╝██║ ╚███╔╝   "}
        </Text>
        <Text color={theme.colors.primary} bold>
          {" ██║     ██╔══██╗██║ ██╔██╗   "}
        </Text>
        <Text color={theme.colors.primary} bold>
          {" ╚██████╗██║  ██║██║██╔╝ ██╗  "}
        </Text>
        <Text color={theme.colors.primary} bold>
          {"  ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝  "}
        </Text>
        <Box marginTop={1}>
          <Text color={theme.colors.textMuted}>Context-Routed Index eXecutor</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.info} dimColor>
            context-aware coding AI, built for your codebase from day one
          </Text>
        </Box>
      </Box>

      {/* ── Input card — boxed so it stands out ── */}
      <Box
        marginTop={4}
        width={64}
        borderStyle="single"
        borderColor={theme.colors.border}
        borderLeftColor={theme.colors.primary}
        paddingX={1}
        paddingY={1}
      >
        <InputBar
          onSubmit={onSubmit}
          isProcessing={false}
          theme={theme}
          variant="welcome"
          mode={mode}
          model={model}
        />
      </Box>
    </Box>
  );
}
