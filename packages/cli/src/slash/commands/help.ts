import { slashRegistry } from "../registry.js";

slashRegistry.register({
  name: "help",
  description: "Show available commands",
  usage: "/help",
  takesArgs: false,
  execute(_args, ctx) {
    const commands = slashRegistry.all();
    const lines = [
      "Available commands:",
      ...commands.map((c) => `  /${c.name.padEnd(10)} — ${c.description}`),
    ];
    ctx.addMessage("system", lines.join("\n"));
  },
});
