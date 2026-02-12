import type { MenuItem } from '../types';
import { MenuCategory, TasteProfile, Season } from '../types';

export interface ColumnMapping {
  csvColumn: string;
  fieldName: keyof MenuItem | '';
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function mapRowToMenuItem(row: string[], headers: string[], mappings: ColumnMapping[]): Partial<MenuItem> {
  const item: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!mapping.fieldName) continue;
    const colIdx = headers.indexOf(mapping.csvColumn);
    if (colIdx === -1) continue;

    const value = row[colIdx] || '';
    switch (mapping.fieldName) {
      case 'cost':
      case 'recommendedPrice':
      case 'process':
      case 'weight':
        item[mapping.fieldName] = Number(value) || 0;
        break;
      case 'isSpicy':
      case 'isUnused':
        item[mapping.fieldName] = value.toLowerCase() === 'true' || value === '1' || value === 'Y';
        break;
      case 'tastes':
        item[mapping.fieldName] = value
          .split(',')
          .map(t => t.trim())
          .filter(Boolean) as TasteProfile[];
        break;
      case 'tags':
        item[mapping.fieldName] = value
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        break;
      case 'category':
        item[mapping.fieldName] = Object.values(MenuCategory).includes(value as MenuCategory)
          ? value
          : MenuCategory.SIDE;
        break;
      case 'season':
        item[mapping.fieldName] = Object.values(Season).includes(value as Season) ? value : Season.ALL;
        break;
      default:
        item[mapping.fieldName] = value;
    }
  }

  return item as Partial<MenuItem>;
}

export function executeImport(
  rows: string[][],
  headers: string[],
  mappings: ColumnMapping[],
  existingIds: Set<string>
): ImportResult {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const result: Partial<MenuItem>[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const item = mapRowToMenuItem(rows[i], headers, mappings);
      if (!item.name) {
        errors.push(`행 ${i + 2}: 이름이 비어있습니다.`);
        skipped++;
        continue;
      }
      if (item.id && existingIds.has(item.id)) {
        skipped++;
        continue;
      }
      if (!item.id) {
        item.id = `imp_${Date.now()}_${i}`;
      }
      result.push(item);
      imported++;
    } catch {
      errors.push(`행 ${i + 2}: 파싱 오류`);
      skipped++;
    }
  }

  return { success: errors.length === 0, imported, skipped, errors };
}
