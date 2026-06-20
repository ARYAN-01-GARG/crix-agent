import type { Theme } from "@crix/themes";
import { Box, Text } from "ink";
import type React from "react";
import type { SlashCommand } from "../slash/registry.js";

interface Props {
  commands: SlashCommand[];
  selectedIndex: number;
  theme: Theme;
}

export function SlashMenu({ commands, selectedIndex, theme }: Props): React.ReactElement | null {
  if (commands.length === 0) return null;

  const maxLen = Math.max(...commands.map((c) => c.name.length));

  return (
    <Box flexDirection="column" width="100%" marginBottom={1}>
      {commands.map((cmd, i) => {
        const selected = i === selectedIndex;
        const cmdCol = `/${cmd.name}`.padEnd(maxLen + 2);

        return (
          <Box key={cmd.name} paddingX={1}>
            {selected ? (
              // Single Text so backgroundColor covers the entire row including spaces
              <Text backgroundColor={theme.colors.info} color={theme.colors.background} bold>
                {` ${cmdCol}  ${cmd.description} `}
              </Text>
            ) : (
              <>
                <Text color={theme.colors.primary}>{cmdCol}</Text>
                <Text color={theme.colors.textMuted}>
                  {"  "}
                  {cmd.description}
                </Text>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
