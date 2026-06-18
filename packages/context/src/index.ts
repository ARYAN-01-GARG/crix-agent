export { ContextManager } from "./context-manager.js";
export type { ContextHashes } from "./context-manager.js";
export {
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
export { sliceTreeForTask, getTreeSectionsForFiles, mergeSectionsIntoTree } from "./slicer.js";
export {
  estimateTokens,
  availableContextTokens,
  trimToBudget,
  buildContextBlock,
  DEFAULT_BUDGET,
} from "./budget.js";
export type { ContextBudget, ContextSlice } from "./budget.js";
