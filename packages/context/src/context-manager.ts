import { hashContent } from "@crix/shared";
import type { ContextLimits } from "@crix/shared";
import {
  initContextFiles,
  readCodePractices,
  readContextMd,
  readProjectMd,
  readTreeStructure,
  writeCodePractices,
  writeContextMd,
  writeProjectMd,
  writeTreeStructure,
} from "./files.js";
import { mergeSectionsIntoTree, sliceTreeForTask } from "./slicer.js";
import {
  DEFAULT_BUDGET,
  buildContextBlock,
  trimToBudget,
} from "./budget.js";
import type { ContextBudget, ContextSlice } from "./budget.js";

export interface ContextHashes {
  projectMd: string;
  contextMd: string;
  codePractices: string;
  treeStructure: string;
}

export class ContextManager {
  constructor(
    private readonly projectPath: string,
    private readonly limits: ContextLimits
  ) {}

  /** Ensures all 4 context files exist (called on `crix init` or first session). */
  init(): void {
    initContextFiles(this.projectPath);
  }

  /** Reads all 4 context files and returns their content. */
  readAll(): { projectMd: string; contextMd: string; codePractices: string; treeStructure: string } {
    return {
      projectMd: readProjectMd(this.projectPath),
      contextMd: readContextMd(this.projectPath),
      codePractices: readCodePractices(this.projectPath),
      treeStructure: readTreeStructure(this.projectPath),
    };
  }

  /** Returns SHA-256 hashes of all 4 files — used to detect drift between sessions. */
  hashes(): ContextHashes {
    const all = this.readAll();
    return {
      projectMd: hashContent(all.projectMd),
      contextMd: hashContent(all.contextMd),
      codePractices: hashContent(all.codePractices),
      treeStructure: hashContent(all.treeStructure),
    };
  }

  /**
   * Builds a context slice for a task — slices the tree, assembles static files,
   * and trims everything to fit the token budget.
   */
  buildSlice(taskPrompt: string, budget: ContextBudget = DEFAULT_BUDGET): string {
    const slice: ContextSlice = {
      projectMd: readProjectMd(this.projectPath),
      codePractices: readCodePractices(this.projectPath),
      contextMd: readContextMd(this.projectPath),
      treeSlice: sliceTreeForTask(this.projectPath, taskPrompt, this.limits.treeStructure),
    };

    return buildContextBlock(trimToBudget(slice, budget));
  }

  /** Updates context.md after a task completes. Appends the summary, then trims to limit. */
  appendTaskSummary(summary: string): void {
    const existing = readContextMd(this.projectPath);
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const entry = `\n## ${timestamp}\n\n${summary.trim()}\n`;
    writeContextMd(this.projectPath, existing + entry, this.limits);
  }

  /** Replaces tree sections for the given files (called by the indexer after re-parsing). */
  updateTreeSections(updatedSections: Map<string, string>): void {
    const merged = mergeSectionsIntoTree(this.projectPath, updatedSections, this.limits);
    writeTreeStructure(this.projectPath, merged, this.limits);
  }

  /** Direct writes — used by `crix context edit` or explicit user updates. */
  updateProjectMd(content: string): void {
    writeProjectMd(this.projectPath, content, this.limits);
  }

  updateCodePractices(content: string): void {
    writeCodePractices(this.projectPath, content, this.limits);
  }

  updateContextMd(content: string): void {
    writeContextMd(this.projectPath, content, this.limits);
  }

  updateTreeStructure(content: string): void {
    writeTreeStructure(this.projectPath, content, this.limits);
  }
}
