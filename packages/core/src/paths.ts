import { join } from "node:path";

export const getCrixDir = (projectPath: string): string =>
  join(projectPath, ".crix");

export const getDbPath = (projectPath: string): string =>
  join(projectPath, ".crix", "crix.db");

export const getProjectMdPath = (projectPath: string): string =>
  join(projectPath, ".crix", "project.md");

export const getTreeStructurePath = (projectPath: string): string =>
  join(projectPath, ".crix", "tree-structure.md");

export const getContextMdPath = (projectPath: string): string =>
  join(projectPath, ".crix", "context.md");

export const getCodePracticesPath = (projectPath: string): string =>
  join(projectPath, ".crix", "code-practices.md");
