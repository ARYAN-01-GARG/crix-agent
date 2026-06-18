import type { Theme } from "../types.js";

export const nordTheme: Theme = {
  name: "nord",
  colors: {
    primary: "#88c0d0",
    secondary: "#b48ead",
    text: "#eceff4",
    textMuted: "#4c566a",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
    info: "#81a1c1",
    border: "#3b4252",
    background: "#2e3440",
    userMessage: "#88c0d0",
    agentMessage: "#eceff4",
    toolCall: "#b48ead",
    diff: {
      added: "#a3be8c",
      removed: "#bf616a",
      header: "#81a1c1",
    },
    statusBar: {
      background: "#3b4252",
      text: "#eceff4",
      modePlan: "#81a1c1",
      modeWork: "#a3be8c",
      modeReview: "#ebcb8b",
      branch: "#b48ead",
      agent: "#88c0d0",
    },
    input: {
      border: "#3b4252",
      borderFocused: "#88c0d0",
      text: "#eceff4",
      placeholder: "#4c566a",
      cursor: "#88c0d0",
    },
  },
};
