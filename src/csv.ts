import { Quote, QuoteStatus } from "./types";
import { dateFormatter, makeId, parseMoney } from "./quoteUtils";

function toCsvValue(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export function exportQuotesToCsv(quotes: Quote[]) {
  const headers = [
    "Empresa",
    "Contato",
    "Orçamento",
    "Quantidade",
    "Valor",
    "Loja",
    "Observações",
    "Status",
    "Data"
  ];

  const rows = quotes.map((quote) => [
    quote.empresa,
    quote.contato,
    quote.item,
    quote.quantidade,
    quote.valor.toFixed(2).replace(".", ","),
    quote.loja,
    quote.observacoes,
    quote.status,
    dateFormatter.format(new Date(quote.criadoEm))
  ]);

  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orcamentos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (day && month && year) return new Date(year, month - 1, day).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function parseQuotesFromCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const [
      empresa = "",
      contato = "",
      item = "",
      quantidade = "1",
      valor = "0",
      loja = "",
      observacoes = "",
      status = "pendente",
      criadoEm = ""
    ] = parseCsvLine(line);

    const normalizedStatus = status.toLowerCase() as QuoteStatus;

    return {
      id: makeId(),
      empresa: empresa.trim(),
      contato: contato.trim(),
      item: item.trim(),
      quantidade: Math.max(Number(quantidade) || 1, 1),
      valor: parseMoney(valor),
      loja: loja.trim(),
      observacoes: observacoes.trim(),
      status: ["pendente", "escolhido", "recusado"].includes(normalizedStatus)
        ? normalizedStatus
        : "pendente",
      criadoEm: criadoEm ? parseDate(criadoEm) : new Date().toISOString()
    };
  });
}
