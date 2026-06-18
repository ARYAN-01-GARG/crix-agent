import { readFileSync } from "node:fs";
import { extname } from "node:path";
// tree-sitter has no bundled type declarations — we use dynamic require in ESM via createRequire
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface ParsedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "method";
  line: number;
  /** Raw parameter list string (e.g. "payload: JwtPayload, secret: string") */
  params?: string;
}

export interface ParsedFile {
  filePath: string;
  symbols: ParsedSymbol[];
  parseError?: string;
}

type SyntaxNode = {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SyntaxNode[];
  childForFieldName: (name: string) => SyntaxNode | null;
  namedChildren: SyntaxNode[];
};

const LANG_MAP: Record<string, string> = {
  ".ts": "tree-sitter-typescript/typescript",
  ".tsx": "tree-sitter-typescript/tsx",
  ".js": "tree-sitter-javascript",
  ".jsx": "tree-sitter-javascript",
  ".py": "tree-sitter-python",
  ".go": "tree-sitter-go",
};

function loadParser(ext: string): { parser: { parse: (code: string) => { rootNode: SyntaxNode } } } | null {
  const langModule = LANG_MAP[ext];
  if (!langModule) return null;

  try {
    const Parser = require("tree-sitter");
    const lang = require(langModule);
    const parser = new Parser();
    // tree-sitter-typescript exports { typescript, tsx }, others export the grammar directly
    parser.setLanguage(lang.typescript ?? lang.tsx ?? lang);
    return { parser };
  } catch {
    return null;
  }
}

function getSymbolName(node: SyntaxNode, ...fieldNames: string[]): string | null {
  for (const field of fieldNames) {
    const child = node.childForFieldName(field);
    if (child) return child.text;
  }
  return null;
}

function extractParamText(node: SyntaxNode): string | undefined {
  const params = node.childForFieldName("parameters");
  if (!params) return undefined;
  // Strip outer parens: "(a: string, b: number)" → "a: string, b: number"
  return params.text.replace(/^\(|\)$/g, "").trim() || undefined;
}

function visitNode(node: SyntaxNode, symbols: ParsedSymbol[], topLevelOnly = true): void {
  switch (node.type) {
    case "export_statement": {
      // Recurse into the exported declaration
      for (const child of node.namedChildren) {
        visitNode(child, symbols, false);
      }
      return;
    }
    case "function_declaration":
    case "generator_function_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({
          name,
          kind: "function",
          line: node.startPosition.row + 1,
          params: extractParamText(node),
        });
      }
      return;
    }
    case "class_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "class", line: node.startPosition.row + 1 });
        // Extract methods from class body
        const body = node.childForFieldName("body");
        if (body) {
          for (const member of body.namedChildren) {
            visitNode(member, symbols, false);
          }
        }
      }
      return;
    }
    case "method_definition": {
      const name = getSymbolName(node, "name");
      if (name && name !== "constructor") {
        symbols.push({
          name,
          kind: "method",
          line: node.startPosition.row + 1,
          params: extractParamText(node),
        });
      }
      return;
    }
    case "interface_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "interface", line: node.startPosition.row + 1 });
      }
      return;
    }
    case "type_alias_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "type", line: node.startPosition.row + 1 });
      }
      return;
    }
    case "lexical_declaration":
    case "variable_declaration": {
      // Catch: const myFn = (...) => ...  and  const MY_CONST = ...
      for (const declarator of node.namedChildren) {
        if (declarator.type !== "variable_declarator") continue;
        const name = getSymbolName(declarator, "name");
        if (!name) continue;
        const value = declarator.childForFieldName("value");
        if (value && (value.type === "arrow_function" || value.type === "function")) {
          symbols.push({
            name,
            kind: "function",
            line: declarator.startPosition.row + 1,
            params: extractParamText(value),
          });
        } else if (value) {
          symbols.push({ name, kind: "const", line: declarator.startPosition.row + 1 });
        }
      }
      return;
    }
    // Python
    case "function_definition": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({
          name,
          kind: "function",
          line: node.startPosition.row + 1,
          params: extractParamText(node),
        });
      }
      return;
    }
    case "class_definition": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "class", line: node.startPosition.row + 1 });
      }
      return;
    }
    // Go
    case "function_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "function", line: node.startPosition.row + 1 });
      }
      return;
    }
    case "method_declaration": {
      const name = getSymbolName(node, "name");
      if (name) {
        symbols.push({ name, kind: "method", line: node.startPosition.row + 1 });
      }
      return;
    }
    default: {
      if (topLevelOnly) return;
      // Don't recurse into nested scopes (function bodies etc.)
    }
  }
}

export function parseFile(filePath: string): ParsedFile {
  const ext = extname(filePath);
  const loaded = loadParser(ext);

  if (!loaded) {
    return { filePath, symbols: [], parseError: `No parser for extension: ${ext}` };
  }

  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (err) {
    return { filePath, symbols: [], parseError: String(err) };
  }

  try {
    const { parser } = loaded;
    const tree = parser.parse(source);
    const symbols: ParsedSymbol[] = [];

    for (const child of tree.rootNode.namedChildren) {
      visitNode(child, symbols, true);
    }

    return { filePath, symbols };
  } catch (err) {
    return { filePath, symbols: [], parseError: String(err) };
  }
}
