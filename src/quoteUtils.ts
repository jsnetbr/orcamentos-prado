import { Quote, QuoteForm } from "./types";

export const emptyForm: QuoteForm = {
  empresa: "",
  contato: "",
  item: "",
  quantidade: "1",
  valor: "",
  loja: "",
  observacoes: "",
  status: "pendente"
};

export const initialQuotes: Quote[] = [
  {
    id: "exemplo-1",
    empresa: "BR tapetes e capacho",
    contato: "41 9527-7302",
    item: "tapete entrada de loja, capacho",
    quantidade: 2,
    valor: 528,
    loja: "2",
    observacoes: "Exemplo baseado na planilha.",
    status: "pendente",
    criadoEm: new Date().toISOString()
  },
  {
    id: "exemplo-2",
    empresa: "comercial Kapforte tapete",
    contato: "47 3021-6667",
    item: "tapete entrada de loja, capacho",
    quantidade: 2,
    valor: 996,
    loja: "2",
    observacoes: "",
    status: "pendente",
    criadoEm: new Date().toISOString()
  },
  {
    id: "exemplo-3",
    empresa: "floripa Comunicação Visual",
    contato: "48 9163-4456",
    item: "tapete entrada de loja, capacho",
    quantidade: 2,
    valor: 1756,
    loja: "2",
    observacoes: "",
    status: "pendente",
    criadoEm: new Date().toISOString()
  },
  {
    id: "exemplo-4",
    empresa: "dois anjos",
    contato: "4891040062",
    item: "tapete entrada de loja, capacho",
    quantidade: 2,
    valor: 791.56,
    loja: "2",
    observacoes: "",
    status: "pendente",
    criadoEm: new Date().toISOString()
  }
];

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR");

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function parseMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

export function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getLowestValueByItem(quotes: Quote[]) {
  return quotes.reduce<Record<string, number>>((acc, quote) => {
    const itemKey = normalizeText(quote.item);
    const current = acc[itemKey];
    acc[itemKey] = current === undefined ? quote.valor : Math.min(current, quote.valor);
    return acc;
  }, {});
}
