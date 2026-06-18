import type { Theme } from "../types.js";

export const lightTheme: Theme = {
  name: "light",
  colors: {
    primary: "#0066cc",
    secondary: "#7c3aed",
    text: "#1a202c",
    textMuted: "#718096",
    success: "#276749",
    warning: "#975a16",
    error: "#c53030",
    info: "#2b6cb0",
    border: "#cbd5e0",
    background: "#f7fafc",
    userMessage: "#0066cc",
    agentMessage: "#1a202c",
    toolCall: "#7c3aed",
    diff: {
      added: "#276749",
      removed: "#c53030",
      header: "#2b6cb0",
    },
    statusBar: {
      background: "#e2e8f0",
      text: "#1a202c",
      modePlan: "#2b6cb0",
      modeWork: "#276749",
      modeReview: "#975a16",
      branch: "#7c3aed",
      agent: "#0066cc",
    },
    input: {
      border: "#cbd5e0",
      borderFocused: "#0066cc",
      text: "#1a202c",
      placeholder: "#a0aec0",
      cursor: "#0066cc",
    },
  },
};
