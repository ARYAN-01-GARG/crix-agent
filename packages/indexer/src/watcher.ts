import { watch } from "chokidar";
import type { FSWatcher } from "chokidar";

export type FileChangeHandler = (filePath: string) => void | Promise<void>;

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"];
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.crix/**",
  "**/coverage/**",
];

/**
 * Watches source files in `projectPath` and calls `onChange` for each changed/added file.
 * Returns the watcher so the caller can `.close()` it.
 */
export function watchProject(
  projectPath: string,
  onChange: FileChangeHandler
): FSWatcher {
  const globs = SOURCE_EXTENSIONS.map((ext) => `**/*${ext}`);

  const watcher = watch(globs, {
    cwd: projectPath,
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const handle = (relativePath: string): void => {
    const abs = `${projectPath}/${relativePath}`;
    void Promise.resolve(onChange(abs));
  };

  watcher.on("add", handle);
  watcher.on("change", handle);

  return watcher;
}
