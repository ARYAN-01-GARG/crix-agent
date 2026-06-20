export const QUEUE_NAMES = {
  AGENT: "crix:agent",
} as const;

export const REDIS_CHANNELS = {
  session: (sessionId: string) => `crix:session:${sessionId}`,
} as const;
