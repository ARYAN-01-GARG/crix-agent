/**
 * Truncates text to a character limit, preserving whole lines.
 * Removes from the middle (oldest content) to keep the start and end intact.
 */
export const truncateToLimit = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;

  const lines = text.split("\n");
  let result = lines;

  while (result.join("\n").length > maxChars && result.length > 1) {
    const mid = Math.floor(result.length / 2);
    result = [...result.slice(0, mid - 1), "... [truncated] ...", ...result.slice(mid + 2)];
  }

  return result.join("\n");
};

export const truncateSuffix = (text: string, maxChars: number, suffix = "..."): string => {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - suffix.length) + suffix;
};
