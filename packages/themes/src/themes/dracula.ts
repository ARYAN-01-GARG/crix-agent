import type { Theme } from "../types.js";

export const draculaTheme: Theme = {
  name: "dracula",
  colors: {
    primary: "#bd93f9",
    secondary: "#ff79c6",
    text: "#f8f8f2",
    textMuted: "#6272a4",
    success: "#50fa7b",
    warning: "#f1fa8c",
    error: "#ff5555",
    info: "#8be9fd",
    border: "#44475a",
    background: "#282a36",
    userMessage: "#bd93f9",
    agentMessage: "#f8f8f2",
    toolCall: "#ff79c6",
    diff: {
      added: "#50fa7b",
      removed: "#ff5555",
      header: "#8be9fd",
    },
    statusBar: {
      background: "#44475a",
      text: "#f8f8f2",
      modePlan: "#8be9fd",
      modeWork: "#50fa7b",
      modeReview: "#f1fa8c",
      branch: "#ff79c6",
      agent: "#bd93f9",
    },
    input: {
      border: "#44475a",
      borderFocused: "#bd93f9",
      text: "#f8f8f2",
      placeholder: "#6272a4",
      cursor: "#bd93f9",
    },
  },
};
