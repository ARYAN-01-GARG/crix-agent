import { slashRegistry } from "../registry.js";

const VALID_MODES = ["plan", "work", "review"] as const;

slashRegistry.register({
  name: "mode",
  description: "Switch agent mode: plan | work | review",
  usage: "/mode <plan|work|review>",
  takesArgs: true,
  execute(args, ctx) {
    if (!args) {
      ctx.addMessage("system", `Current mode: ${ctx.getMode()}\nUsage: /mode <plan|work|review>`);
      return;
    }
    const mode = args.toLowerCase();
    if (!VALID_MODES.includes(mode as (typeof VALID_MODES)[number])) {
      ctx.addMessage("system", `Unknown mode: "${args}". Valid modes: plan, work, review`);
      return;
    }
    ctx.setMode(mode);
    ctx.addMessage("system", `Mode switched to: ${mode}`);
  },
});
