import { getBuiltInThemeNames, isValidThemeName } from "@crix/themes";
import { slashRegistry } from "../registry.js";

slashRegistry.register({
  name: "theme",
  description: "Switch color theme",
  usage: "/theme <name>",
  takesArgs: true,
  execute(args, ctx) {
    if (!args) {
      const names = getBuiltInThemeNames().join(", ");
      ctx.addMessage("system", `Current theme: ${ctx.getTheme()}\nAvailable: ${names}`);
      return;
    }
    if (!isValidThemeName(args)) {
      const names = getBuiltInThemeNames().join(", ");
      ctx.addMessage("system", `Unknown theme: "${args}". Available: ${names}`);
      return;
    }
    ctx.setTheme(args);
    ctx.addMessage("system", `Theme switched to: ${args}`);
  },
});
