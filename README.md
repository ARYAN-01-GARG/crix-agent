# crix — Context-Routed Index eXecutor

An enterprise-grade **terminal UI** coding agent — runs in your terminal, routes every task to the right specialist agent using an indexed map of your codebase.

```
╭─ crix ──────────────────────────────────────────────────────────────╮
│  ● work mode   ◆ backend   ⎇ develop   ~/projects/my-app            │
╰─────────────────────────────────────────────────────────────────────╯

  [orchestrator] task classified: medium → backend specialist
  [backend] reading src/routes/user.ts, src/middleware/...
  [backend] writing src/middleware/auth.ts ──────────── +87 lines
  [backend] updating src/routes/user.ts ─────────────  ~14 lines

  ─── Summary ──────────────────────────────────────────────────────
  Added JWT middleware and wired it into the user routes.
  Run `crix done` or type /done to update the project index.

──────────────────────────────────────────────────────────────────────
❯ _                                           type / for commands
```

---

## What makes crix different

Most coding agents send your entire codebase to the LLM every time. crix builds and maintains a **hybrid AST + semantic index** of your project, then routes each task to the right specialist with only the relevant slice of that index. Small changes stay cheap. Large changes stay clean.

| | Generic coding agents | crix |
|---|---|---|
| Context for a 1-file fix | Entire codebase | That file's index entry only |
| Agent model | One general agent | Orchestrator + domain specialists |
| Token cost on repeat calls | Full price every time | ~10% via prompt caching |
| UI | CLI output | Full TUI — streams, diffs, themes |
| Infrastructure | Local only | Local TUI or self-hosted server |

---

## The TUI

crix is not a traditional CLI. You launch it once and stay inside — just like Claude Code. Your project context, session history, and agent state are all live in the TUI.

```
╭─ crix ──────────────────────────────────────────────────────────────╮
│  ● plan mode   ◆ orchestrator   ⎇ main   ~/projects/my-app          │
╰─────────────────────────────────────────────────────────────────────╯

  > design a database schema for user preferences

  [orchestrator] plan mode — no files will be written

  Here's the schema I'd propose:

  Table: user_preferences
  ┌──────────────────┬───────────┬──────────────────────────────────┐
  │ column           │ type      │ notes                            │
  ├──────────────────┼───────────┼──────────────────────────────────┤
  │ id               │ uuid      │ primary key                      │
  │ user_id          │ uuid      │ FK → users.id                    │
  │ key              │ text      │ preference key                   │
  │ value            │ jsonb     │ flexible value storage           │
  │ created_at       │ timestamp │                                  │
  └──────────────────┴───────────┴──────────────────────────────────┘

──────────────────────────────────────────────────────────────────────
❯ _
```

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `↑ / ↓` | Navigate message history |
| `Ctrl+C` | Cancel current agent task |
| `Ctrl+L` | Clear screen |
| `Ctrl+D` | Exit crix |
| `Tab` | Autocomplete slash command |
| `Esc` | Cancel input / close overlay |

---

## Slash commands

Type `/` at the input prompt to see all available commands — Tab to autocomplete. Every meta-operation is a slash command; nothing is hidden in CLI flags.

**Shipping in v1:**

| Command | Description |
|---|---|
| `/help` | Show all slash commands with descriptions |
| `/mode` | Show current mode |
| `/mode <plan\|work\|review>` | Switch mode |
| `/theme` | List available themes |
| `/theme <name>` | Switch theme (e.g. `/theme dracula`) |
| `/model` | Show current model and provider |
| `/exit` | Exit crix |

**Planned (subsequent releases):**

| Command | Description |
|---|---|
| `/model <name>` | Switch model at runtime |
| `/done` | Mark task complete — triggers index update for changed files |
| `/clear` | Clear the conversation from the screen |
| `/session` | List sessions |
| `/session new` | Start a fresh session |
| `/session resume <id>` | Resume a previous session |
| `/index` | Show project index summary |
| `/index rebuild` | Force full re-scan and index rebuild |
| `/context` | Show all four `.crix/` context files |
| `/context edit <file>` | Open a context file for manual editing |
| `/cost` | Show token usage and estimated cost for this session |
| `/agents` | List available specialist agents |
| `/config` | Show current configuration |
| `/init` | Re-initialise the project index in `.crix/` |
| `/login` | Authenticate with crix |
| `/logout` | Sign out and revoke token |
| `/whoami` | Show the currently authenticated user |

---

## Themes

crix ships with six built-in themes and supports custom themes via `crix.config.ts`.

Switch theme at any time: `/theme <name>`

| Theme | Style |
|---|---|
| `default` | crix's own dark theme |
| `light` | Clean light theme |
| `dracula` | Dracula colour scheme |
| `nord` | Nord palette |
| `catppuccin` | Catppuccin Mocha |
| `tokyo-night` | Tokyo Night |

**Custom theme in `crix.config.ts`:**

```ts
export default {
  theme: "dracula",

  // or define a fully custom theme:
  customTheme: {
    name: "my-theme",
    colors: {
      primary: "#7aa2f7",
      secondary: "#bb9af7",
      text: "#c0caf5",
      textMuted: "#565f89",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
      info: "#7dcfff",
      border: "#3b4261",
      userMessage: "#7aa2f7",
      agentMessage: "#c0caf5",
      toolCall: "#bb9af7",
      diff: {
        added: "#9ece6a",
        removed: "#f7768e",
        header: "#7aa2f7",
      },
    },
  },
}
```

---

## Core concepts

### The project index (`.crix/`)

Run `crix init` or `/init` to scan your project and create `.crix/` at the root with four knowledge files:

| File | Purpose | Default size |
|---|---|---|
| `project.md` | Project overview, goals, tech stack | 2,500 chars |
| `tree-structure.md` | Every file → all functions/classes with summaries | 8,000 chars |
| `context.md` | Current working context, recent decisions | 2,500 chars |
| `code-practices.md` | Coding standards, patterns, anti-patterns | 2,500 chars |

`tree-structure.md` is generated by combining two layers:
- **AST layer** (tree-sitter) — extracts exact function names, signatures, and types
- **Semantic layer** (LLM, batched per file) — generates 1–2 line summaries

Index files update only when you run `/done` — not on every save.

### Orchestrator → Specialist model

Every request goes through the **orchestrator**, which classifies, routes, and injects only the relevant context slice:

```
Orchestrator (Haiku — fast routing)
  ├─ backend    — API routes, databases, auth, services
  ├─ frontend   — UI components, state, styling
  ├─ tester     — unit tests, integration tests, mocks
  ├─ reviewer   — code review, security checks
  ├─ devops     — CI/CD, Docker, infrastructure
  └─ designer   — UI/UX, design systems
```

### Modes

Switch mode with a slash command — the status bar always shows the active mode.

| Mode | What agents can do |
|---|---|
| `plan` | Read files, propose — no writes |
| `work` | Full read + write + shell access |
| `review` | Read + run tests — no writes |

---

## Authentication

```bash
crix login
```

Opens your browser for authentication. The CLI captures the token automatically — no copy-pasting keys.

```
╭─ crix login ────────────────────────────────────────────────────────╮

  Opening browser for authentication...
  If it didn't open → https://auth.crix.dev/login?state=x9k2m

  ⠋  Waiting for authentication...

  ✓  Logged in as aryan@example.com
     Token stored in system keychain.

╰─────────────────────────────────────────────────────────────────────╯
```

Headless / SSH fallback — device code flow activates automatically:

```
  Cannot open browser.
  Visit : https://auth.crix.dev/device
  Code  : XKCD-4829

  ⠋  Waiting... (times out in 5 min)
```

---

## Getting started

> Requires Node.js 20+ and pnpm.

```bash
npm install -g crix
```

```bash
# Authenticate
crix login

# Initialise a project (scan and index)
cd your-project
crix init

# Launch the TUI
crix
```

---

## Configuration

`crix.config.ts` at your project root (or a parent directory):

```ts
export default {
  provider: "anthropic",          // "anthropic" | "openai" | "google" | "ollama"
  model: "claude-sonnet-4-6",
  apiKey: process.env.ANTHROPIC_API_KEY,

  theme: "default",               // built-in or custom theme name

  contextLimits: {
    projectMd: 2500,
    treeStructure: 8000,
    contextMd: 2500,
    codePractices: 2500,
  },

  agents: {
    enabled: ["backend", "frontend", "tester", "reviewer", "devops"],
  },

  harness: {
    permissions: [
      { tool: "run-shell", pattern: "rm -rf*", level: "deny" },
      { tool: "write-file", pattern: ".env*", level: "ask" },
    ],
  },

  models: {
    router: "claude-haiku-4-5",
    worker: "claude-sonnet-4-6",
  },
}
```

---

## Architecture

```
packages/
  shared/        Types, logger, errors (base dependency for all packages)
  themes/        Theme definitions, colour palettes, theme resolver
  auth/          Login flow — localhost callback, device code, PKCE, keytar token store
  core/          Sessions (SQLite), mode state machine, config loader (cosmiconfig)
  harness/       Tool execution layer — file/shell/git ops, permissions, hooks
  context/       Manages .crix/ knowledge files; slices and budgets context per task
  indexer/       tree-sitter AST + LLM summarizer → tree-structure.md
  agents/        BaseAgent + specialist implementations (backend, frontend, tester…)
  orchestrator/  Task classifier, router (Haiku), specialist dispatcher, result merger
  cli/           crix binary — Ink TUI, slash command parser, all UI components
  queue/         BullMQ job definitions (server mode)
  cache/         Redis client + caching utilities (server mode)
  events/        Event emitter abstraction (local: EventEmitter / server: Redis Streams)

apps/
  server/        Fastify server — REST API + SSE streaming + BullMQ workers
                 Auth endpoints: /auth/login /auth/callback /auth/device /auth/logout
  worker/        Standalone BullMQ worker process (horizontally scalable)
```

### TUI component tree (`packages/cli`)

```
<App>
  ├─ <StatusBar>          mode badge · active agent · git branch · project path
  ├─ <MessageList>        scrollable history of user + agent messages
  │   ├─ <UserMessage>
  │   ├─ <AgentMessage>   streaming text output
  │   ├─ <ToolCall>       shows tool name + args while executing
  │   ├─ <DiffView>       inline file diffs (added/removed lines)
  │   └─ <AgentSummary>   post-task summary with files changed
  ├─ <SlashCommandMenu>   overlay — shown when user types /
  └─ <InputBar>           prompt input at the bottom (Shift+Enter for newline)
```

### Token efficiency

- **Task classification** — tiny tasks skip the routing LLM call; heuristics assign directly
- **Context slicing** — specialists receive only their relevant index sections
- **Prompt caching** — system prompt + project.md + code-practices.md cached (5 min TTL)
- **Tiered models** — Haiku for routing, Sonnet for actual coding work
- **History compression** — older turns summarised, not sent verbatim

### Harness layer

```
agent tool call
  → permissions.check()    deny → HarnessPermissionError
  → hooks.pre()            user pre-hooks (e.g. backup before write)
  → tool.execute()         actual operation
  → hooks.post()           user post-hooks (e.g. run formatter)
  → return result to agent
```

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Redis (server mode only — Docker Compose provided)

### Setup

```bash
git clone https://github.com/ARYAN-01-GARG/crix-agent
cd crix-agent
pnpm install
pnpm build
```

### Run tests

```bash
pnpm test
```

### Lint and format (Biome)

```bash
pnpm check       # lint + format check
pnpm check --write  # auto-fix
```

### Local development

```bash
pnpm dev                             # build + watch all packages
node packages/cli/dist/index.js      # run TUI from source
docker compose up redis -d           # Redis for server mode
pnpm --filter @crix/server dev       # start the server
```

### Git branches

```
main         Protected — tagged releases only
develop      Integration — all PRs target here
feature/xxx  New features (squash merge → develop)
fix/xxx      Bug fixes   (squash merge → develop)
```

Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `test:` ([Conventional Commits](https://www.conventionalcommits.org/)).

---

## Supported languages (indexer)

TypeScript, JavaScript, Python, Go, Rust, Java, C, C++, Ruby, PHP — auto-detected from file extension via tree-sitter grammars.

---

## Roadmap

- [x] Architecture and tech stack
- [x] Monorepo scaffold (pnpm, turborepo, biome, tsconfig)
- [x] `@crix/shared` — types, errors, logger, utilities
- [ ] `@crix/themes` — theme definitions and resolver (default, light, dracula, nord, catppuccin, tokyo-night)
- [ ] `@crix/core` — sessions, mode state machine, config
- [ ] `@crix/harness` — tool execution layer
- [ ] `@crix/indexer` — AST + LLM project indexer
- [ ] `@crix/context` — context file manager and slicer
- [ ] `@crix/agents` — base agent + specialists
- [ ] `@crix/orchestrator` — task router and dispatcher
- [ ] `@crix/auth` — login flow and token storage
- [ ] `@crix/cli` — Ink TUI, slash commands, all UI components
- [ ] `apps/server` — Fastify + BullMQ + SSE
- [ ] `apps/worker` — standalone worker

---

## License

MIT
