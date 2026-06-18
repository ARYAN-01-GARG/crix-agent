export interface DiffColors {
  added: string;
  removed: string;
  header: string;
}

export interface StatusBarColors {
  background: string;
  text: string;
  modePlan: string;
  modeWork: string;
  modeReview: string;
  branch: string;
  agent: string;
}

export interface InputColors {
  border: string;
  borderFocused: string;
  text: string;
  placeholder: string;
  cursor: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  background: string;
  userMessage: string;
  agentMessage: string;
  toolCall: string;
  diff: DiffColors;
  statusBar: StatusBarColors;
  input: InputColors;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

export type ThemeName =
  | "default"
  | "light"
  | "dracula"
  | "nord"
  | "catppuccin"
  | "tokyo-night";
