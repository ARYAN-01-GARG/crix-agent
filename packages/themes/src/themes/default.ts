import type { Theme } from "../types.js";

export const defaultTheme: Theme = {
  name: "default",
  colors: {
    primary: "#00d4ff",
    secondary: "#9d4edd",
    text: "#e2e8f0",
    textMuted: "#718096",
    success: "#48bb78",
    warning: "#ed8936",
    error: "#fc8181",
    info: "#63b3ed",
    border: "#2d3748",
    background: "#1a202c",
    userMessage: "#00d4ff",
    agentMessage: "#e2e8f0",
    toolCall: "#9d4edd",
    diff: {
      added: "#48bb78",
      removed: "#fc8181",
      header: "#63b3ed",
    },
    statusBar: {
      background: "#2d3748",
      text: "#e2e8f0",
      modePlan: "#63b3ed",
      modeWork: "#48bb78",
      modeReview: "#ed8936",
      branch: "#9d4edd",
      agent: "#00d4ff",
    },
    input: {
      border: "#4a5568",
      borderFocused: "#00d4ff",
      text: "#e2e8f0",
      placeholder: "#718096",
      cursor: "#00d4ff",
    },
  },
};
