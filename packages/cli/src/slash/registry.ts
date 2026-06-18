export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  /** If true, the command takes arguments after the name */
  takesArgs: boolean;
  execute: (args: string, ctx: SlashContext) => void | Promise<void>;
}

export interface SlashContext {
  setMode: (mode: string) => void;
  setTheme: (name: string) => void;
  getModel: () => string;
  getMode: () => string;
  getTheme: () => string;
  exit: () => void;
  addMessage: (role: "system", content: string) => void;
}

class SlashRegistry {
  private readonly commands = new Map<string, SlashCommand>();

  register(cmd: SlashCommand): void {
    this.commands.set(cmd.name, cmd);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  all(): SlashCommand[] {
    return [...this.commands.values()];
  }
}

export const slashRegistry = new SlashRegistry();
