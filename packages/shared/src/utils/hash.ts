import { createHash } from "node:crypto";

export const hashContent = (content: string): string =>
  createHash("sha256").update(content).digest("hex").slice(0, 16);
