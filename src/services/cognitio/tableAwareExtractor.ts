// ============================================================
// Table-Aware Extractor — Detects, classifies and transforms
// tables into pedagogical building blocks
// ============================================================

export interface DetectedTable {
  id: string;
  start_line: number;
  end_line: number;
  raw_text: string;
  table_type: TableType;
  headers: string[];
  rows: string[][];
  pedagogical_blocks: PedagogicalTableBlock[];
  confidence: number;
}

export type TableType =
  | "comparison"       // Compare 2+ items (e.g., "Drug A vs Drug B")
  | "criteria"         // List of criteria/properties (e.g., diagnostic criteria)
  | "classification"   // Taxonomy/classification (e.g., stages of disease)
  | "synthesis"        // Summary/recap table
  | "differential"     // Differential diagnosis or similar
  | "timeline"         // Chronological progression
  | "unknown";

export interface PedagogicalTableBlock {
  block_type: "comparison_pair" | "criteria_list" | "classification_group" | "key_value_set" | "sequence_step";
  title: string;
  content: string;
  concepts_referenced: string[];
  pedagogical_value: number; // 0-1
}

export interface TableExtractionResult {
  detected_tables: DetectedTable[];
  detected_tables_count: number;
  extracted_blocks_count: number;
  total_pedagogical_value: number;
}

// ---------- Table Detection Patterns ----------

const TABLE_SEPARATOR_PATTERN = /^[\s|+\-=]{3,}$/;
const TABLE_PIPE_PATTERN = /\|.*\|/;
const TABLE_TAB_PATTERN = /\t.*\t/;
const TABLE_ARROW_PATTERN = /\s*[→⟶⟹⇒=>]\s*/;

// Common table header keywords
const TABLE_HEADER_KEYWORDS = [
  /^(?:type|classe?|catégorie|stade|grade|phase)/i,
  /^(?:critères?|caractéristiques?|propriétés?|paramètres?)/i,
  /^(?:avantages?|inconvénients?|indications?|contre-indications?)/i,
  /^(?:traitement|diagnostic|étiologie|symptômes?)/i,
  /^(?:définition|description|exemple)/i,
  /^(?:nom|agent|substance|molécule|médicament)/i,
];

// ---------- Main Extraction ----------

/**
 * Detect and extract tables from document text lines.
 * Transforms them into pedagogical building blocks.
 */
export function extractTables(lines: string[]): TableExtractionResult {
  const tables: DetectedTable[] = [];
  let tableId = 0;

  // Strategy 1: Pipe-delimited tables
  let i = 0;
  while (i < lines.length) {
    if (TABLE_PIPE_PATTERN.test(lines[i])) {
      const tableStart = i;
      while (i < lines.length && (TABLE_PIPE_PATTERN.test(lines[i]) || TABLE_SEPARATOR_PATTERN.test(lines[i]))) {
        i++;
      }
      if (i - tableStart >= 2) {
        const table = parsePipeTable(lines.slice(tableStart, i), tableStart, `table_${tableId++}`);
        if (table) tables.push(table);
      }
    } else {
      i++;
    }
  }

  // Strategy 2: Tab-delimited tables
  i = 0;
  while (i < lines.length) {
    if (TABLE_TAB_PATTERN.test(lines[i]) && !tables.some((t) => i >= t.start_line && i <= t.end_line)) {
      const tableStart = i;
      while (i < lines.length && TABLE_TAB_PATTERN.test(lines[i])) {
        i++;
      }
      if (i - tableStart >= 2) {
        const table = parseTabTable(lines.slice(tableStart, i), tableStart, `table_${tableId++}`);
        if (table) tables.push(table);
      }
    } else {
      i++;
    }
  }

  // Strategy 3: Colon/arrow-based structured data
  i = 0;
  while (i < lines.length) {
    if (
      TABLE_ARROW_PATTERN.test(lines[i]) &&
      !tables.some((t) => i >= t.start_line && i <= t.end_line)
    ) {
      const tableStart = i;
      while (
        i < lines.length &&
        (TABLE_ARROW_PATTERN.test(lines[i]) || /^\s*[-•]\s/.test(lines[i]))
      ) {
        i++;
      }
      if (i - tableStart >= 3) {
        const table = parseArrowTable(lines.slice(tableStart, i), tableStart, `table_${tableId++}`);
        if (table) tables.push(table);
      }
    } else {
      i++;
    }
  }

  // Generate pedagogical blocks for each table
  for (const table of tables) {
    table.pedagogical_blocks = generatePedagogicalBlocks(table);
  }

  const extractedBlocksCount = tables.reduce((sum, t) => sum + t.pedagogical_blocks.length, 0);
  const totalPedagogicalValue = tables.reduce(
    (sum, t) => sum + t.pedagogical_blocks.reduce((s, b) => s + b.pedagogical_value, 0),
    0
  ) / Math.max(1, extractedBlocksCount);

  return {
    detected_tables: tables,
    detected_tables_count: tables.length,
    extracted_blocks_count: extractedBlocksCount,
    total_pedagogical_value: totalPedagogicalValue,
  };
}

// ---------- Table Parsers ----------

function parsePipeTable(tableLines: string[], startLine: number, id: string): DetectedTable | null {
  const dataLines = tableLines.filter((l) => !TABLE_SEPARATOR_PATTERN.test(l));
  if (dataLines.length < 2) return null;

  const parseRow = (line: string): string[] =>
    line.split("|").map((cell) => cell.trim()).filter((cell) => cell.length > 0);

  const headers = parseRow(dataLines[0]);
  const rows = dataLines.slice(1).map(parseRow);

  if (headers.length < 2) return null;

  const tableType = classifyTable(headers, rows);

  return {
    id,
    start_line: startLine,
    end_line: startLine + tableLines.length - 1,
    raw_text: tableLines.join("\n"),
    table_type: tableType,
    headers,
    rows,
    pedagogical_blocks: [],
    confidence: 0.9,
  };
}

function parseTabTable(tableLines: string[], startLine: number, id: string): DetectedTable | null {
  const parseRow = (line: string): string[] =>
    line.split("\t").map((cell) => cell.trim()).filter((cell) => cell.length > 0);

  const rows = tableLines.map(parseRow);
  if (rows.length < 2 || rows[0].length < 2) return null;

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const tableType = classifyTable(headers, dataRows);

  return {
    id,
    start_line: startLine,
    end_line: startLine + tableLines.length - 1,
    raw_text: tableLines.join("\n"),
    table_type: tableType,
    headers,
    rows: dataRows,
    pedagogical_blocks: [],
    confidence: 0.8,
  };
}

function parseArrowTable(tableLines: string[], startLine: number, id: string): DetectedTable | null {
  const rows: string[][] = [];
  for (const line of tableLines) {
    const parts = line.split(TABLE_ARROW_PATTERN).map((p) => p.replace(/^\s*[-•]\s*/, "").trim());
    if (parts.length >= 2 && parts[0].length > 0) {
      rows.push(parts);
    }
  }

  if (rows.length < 2) return null;

  return {
    id,
    start_line: startLine,
    end_line: startLine + tableLines.length - 1,
    raw_text: tableLines.join("\n"),
    table_type: "criteria",
    headers: ["Élément", "Description"],
    rows,
    pedagogical_blocks: [],
    confidence: 0.65,
  };
}

// ---------- Table Classification ----------

function classifyTable(headers: string[], rows: string[][]): TableType {
  const headerText = headers.join(" ").toLowerCase();

  // Comparison: headers contain "vs", "versus", or two distinct entity names
  if (/\bvs\.?\b|\bversus\b|\bcomparaison\b/.test(headerText)) return "comparison";
  if (headers.length >= 3 && rows.length >= 2) {
    // Check if column headers look like entity names (not property names)
    const looksLikeComparison = headers.slice(1).every(
      (h) => !TABLE_HEADER_KEYWORDS.some((p) => p.test(h))
    );
    if (looksLikeComparison && headers.length <= 5) return "comparison";
  }

  // Classification: contains stage/grade/class keywords
  if (/\b(?:stade|grade|classe?|type|catégorie|niveau)\b/i.test(headerText)) return "classification";

  // Differential: medical differential diagnosis
  if (/\b(?:différentiel|diagnostics?)\b/i.test(headerText)) return "differential";

  // Timeline
  if (/\b(?:date|année|période|phase|étape|jour|semaine|mois)\b/i.test(headerText)) return "timeline";

  // Criteria: property-like headers
  if (TABLE_HEADER_KEYWORDS.some((p) => headers.some((h) => p.test(h)))) return "criteria";

  // Synthesis: short table with many rows
  if (rows.length >= 5 && headers.length <= 3) return "synthesis";

  return "unknown";
}

// ---------- Pedagogical Block Generation ----------

function generatePedagogicalBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  const blocks: PedagogicalTableBlock[] = [];

  switch (table.table_type) {
    case "comparison":
      blocks.push(...generateComparisonBlocks(table));
      break;
    case "criteria":
    case "differential":
      blocks.push(...generateCriteriaBlocks(table));
      break;
    case "classification":
      blocks.push(...generateClassificationBlocks(table));
      break;
    case "timeline":
      blocks.push(...generateTimelineBlocks(table));
      break;
    default:
      blocks.push(...generateKeyValueBlocks(table));
  }

  return blocks;
}

function generateComparisonBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  const blocks: PedagogicalTableBlock[] = [];

  if (table.headers.length >= 3) {
    // Compare entities column by column
    for (let col = 1; col < table.headers.length; col++) {
      for (let col2 = col + 1; col2 < table.headers.length; col2++) {
        const pairs: string[] = [];
        for (const row of table.rows) {
          if (row[0] && row[col] && row[col2]) {
            pairs.push(`${row[0]}: ${table.headers[col]}="${row[col]}" vs ${table.headers[col2]}="${row[col2]}"`);
          }
        }
        if (pairs.length > 0) {
          blocks.push({
            block_type: "comparison_pair",
            title: `${table.headers[col]} vs ${table.headers[col2]}`,
            content: pairs.join("\n"),
            concepts_referenced: [table.headers[col], table.headers[col2]],
            pedagogical_value: 0.85,
          });
        }
      }
    }
  }

  return blocks;
}

function generateCriteriaBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  return table.rows.map((row) => ({
    block_type: "criteria_list" as const,
    title: row[0] || "Critère",
    content: table.headers.map((h, i) => `${h}: ${row[i] || "—"}`).join("\n"),
    concepts_referenced: [row[0] || ""],
    pedagogical_value: 0.75,
  }));
}

function generateClassificationBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  return [{
    block_type: "classification_group",
    title: `Classification: ${table.headers[0] || "Catégories"}`,
    content: table.rows
      .map((row) => row.join(" — "))
      .join("\n"),
    concepts_referenced: table.rows.map((r) => r[0] || "").filter(Boolean),
    pedagogical_value: 0.8,
  }];
}

function generateTimelineBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  return table.rows.map((row, i) => ({
    block_type: "sequence_step" as const,
    title: `Étape ${i + 1}: ${row[0] || ""}`,
    content: table.headers.map((h, j) => `${h}: ${row[j] || "—"}`).join("\n"),
    concepts_referenced: [row[0] || ""],
    pedagogical_value: 0.7,
  }));
}

function generateKeyValueBlocks(table: DetectedTable): PedagogicalTableBlock[] {
  return [{
    block_type: "key_value_set",
    title: table.headers.join(" / "),
    content: table.rows
      .map((row) => table.headers.map((h, i) => `${h}: ${row[i] || "—"}`).join(" | "))
      .join("\n"),
    concepts_referenced: table.rows.map((r) => r[0] || "").filter(Boolean),
    pedagogical_value: 0.6,
  }];
}
