import { slashRegistry } from "../registry.js";

slashRegistry.register({
  name: "exit",
  description: "Exit crix",
  usage: "/exit",
  takesArgs: false,
  execute(_args, ctx) {
    ctx.exit();
  },
});
