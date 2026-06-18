import type { Theme } from "../types.js";

export const tokyoNightTheme: Theme = {
  name: "tokyo-night",
  colors: {
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    text: "#c0caf5",
    textMuted: "#565f89",
    success: "#9ece6a",
    warning: "#e0af68",
    error: "#f7768e",
    info: "#7dcfff",
    border: "#3b4261",
    background: "#1a1b26",
    userMessage: "#7aa2f7",
    agentMessage: "#c0caf5",
    toolCall: "#bb9af7",
    diff: {
      added: "#9ece6a",
      removed: "#f7768e",
      header: "#7aa2f7",
    },
    statusBar: {
      background: "#24283b",
      text: "#c0caf5",
      modePlan: "#7dcfff",
      modeWork: "#9ece6a",
      modeReview: "#e0af68",
      branch: "#bb9af7",
      agent: "#7aa2f7",
    },
    input: {
      border: "#3b4261",
      borderFocused: "#7aa2f7",
      text: "#c0caf5",
      placeholder: "#565f89",
      cursor: "#7aa2f7",
    },
  },
};
