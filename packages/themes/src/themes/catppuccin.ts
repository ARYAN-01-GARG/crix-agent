import type { Theme } from "../types.js";

export const catppuccinTheme: Theme = {
  name: "catppuccin",
  colors: {
    primary: "#89b4fa",
    secondary: "#cba6f7",
    text: "#cdd6f4",
    textMuted: "#585b70",
    success: "#a6e3a1",
    warning: "#f9e2af",
    error: "#f38ba8",
    info: "#89dceb",
    border: "#313244",
    background: "#1e1e2e",
    userMessage: "#89b4fa",
    agentMessage: "#cdd6f4",
    toolCall: "#cba6f7",
    diff: {
      added: "#a6e3a1",
      removed: "#f38ba8",
      header: "#89b4fa",
    },
    statusBar: {
      background: "#313244",
      text: "#cdd6f4",
      modePlan: "#89dceb",
      modeWork: "#a6e3a1",
      modeReview: "#f9e2af",
      branch: "#cba6f7",
      agent: "#89b4fa",
    },
    input: {
      border: "#313244",
      borderFocused: "#89b4fa",
      text: "#cdd6f4",
      placeholder: "#585b70",
      cursor: "#89b4fa",
    },
  },
};
