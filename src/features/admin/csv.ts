export type CsvRow = Record<string, string>;

export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') { if (quoted && input[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[index + 1] === "\n") index++; row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const [headers, ...data] = rows; if (!headers) return [];
  return data.map(values => Object.fromEntries(headers.map((header,index) => [header.trim().toLowerCase(), values[index] ?? ""])));
}

export function required(row: CsvRow, key: string) { const value = row[key]?.trim(); if (!value) throw new Error(`Missing ${key}`); return value; }
export function numberValue(row: CsvRow, key: string, fallback?: number) { const text = row[key]?.trim(); if (!text && fallback !== undefined) return fallback; const value = Number(text); if (!Number.isFinite(value)) throw new Error(`Invalid ${key}`); return value; }
