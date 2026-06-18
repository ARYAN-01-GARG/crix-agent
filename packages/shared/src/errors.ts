export class CrixError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "CrixError";
  }
}

export class ConfigError extends CrixError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class HarnessPermissionError extends CrixError {
  constructor(tool: string, pattern: string) {
    super(`Tool "${tool}" is denied for pattern "${pattern}"`, "HARNESS_PERMISSION_DENIED");
    this.name = "HarnessPermissionError";
  }
}

export class SessionError extends CrixError {
  constructor(message: string) {
    super(message, "SESSION_ERROR");
    this.name = "SessionError";
  }
}

export class IndexerError extends CrixError {
  constructor(message: string) {
    super(message, "INDEXER_ERROR");
    this.name = "IndexerError";
  }
}

export class AuthError extends CrixError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class AgentError extends CrixError {
  constructor(
    message: string,
    public readonly taskId: string
  ) {
    super(message, "AGENT_ERROR");
    this.name = "AgentError";
  }
}
