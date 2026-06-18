import type { Theme, ThemeName } from "./types.js";
import {
  catppuccinTheme,
  defaultTheme,
  draculaTheme,
  lightTheme,
  nordTheme,
  tokyoNightTheme,
} from "./themes/index.js";

const BUILT_IN_THEMES: Record<ThemeName, Theme> = {
  default: defaultTheme,
  light: lightTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  catppuccin: catppuccinTheme,
  "tokyo-night": tokyoNightTheme,
};

export const getBuiltInThemeNames = (): ThemeName[] =>
  Object.keys(BUILT_IN_THEMES) as ThemeName[];

/**
 * Resolves a theme by name. Falls back to default if the name is not recognised.
 * Merges a partial custom theme over the resolved base when provided.
 */
export const resolveTheme = (name: string, custom?: Partial<Theme>): Theme => {
  const base = BUILT_IN_THEMES[name as ThemeName] ?? defaultTheme;

  if (!custom) return base;

  return {
    name: custom.name ?? base.name,
    colors: {
      ...base.colors,
      ...custom.colors,
      diff: { ...base.colors.diff, ...custom.colors?.diff },
      statusBar: { ...base.colors.statusBar, ...custom.colors?.statusBar },
      input: { ...base.colors.input, ...custom.colors?.input },
    },
  };
};

export const isValidThemeName = (name: string): name is ThemeName =>
  name in BUILT_IN_THEMES;
