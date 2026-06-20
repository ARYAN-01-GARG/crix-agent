import type { Theme } from "@crix/themes";
import { Box, Text, useStdout } from "ink";
import type React from "react";
import { InputBar } from "./InputBar.js";

interface Props {
  theme: Theme;
  onSubmit: (value: string) => void;
}

export function WelcomeScreen({ theme, onSubmit }: Props): React.ReactElement {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={rows} justifyContent="center" alignItems="center">
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
            your enterprise-grade AI coding agent
          </Text>
        </Box>
      </Box>
      <Box marginTop={3} width={60}>
        <InputBar onSubmit={onSubmit} isProcessing={false} theme={theme} />
      </Box>
    </Box>
  );
}
