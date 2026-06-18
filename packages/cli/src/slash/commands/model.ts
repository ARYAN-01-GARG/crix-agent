import { slashRegistry } from "../registry.js";

slashRegistry.register({
  name: "model",
  description: "Show active model (configuration only in v1)",
  usage: "/model",
  takesArgs: false,
  execute(_args, ctx) {
    ctx.addMessage("system", `Active model: ${ctx.getModel()}\n\nTo change the model, update your crix.config.js and restart.`);
  },
});
