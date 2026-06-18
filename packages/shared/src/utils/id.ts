import { randomBytes } from "node:crypto";

export const generateId = (prefix?: string): string => {
  const random = randomBytes(8).toString("hex");
  return prefix ? `${prefix}_${random}` : random;
};
