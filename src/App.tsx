import { FormEvent, useEffect, useMemo, useState } from "react";

type QuoteStatus = "pendente" | "escolhido" | "recusado";

type Quote = {
  id: string;
  empresa: string;
  contato: string;
  item: string;
  quantidade: number;
  valor: number;
  loja: string;
  observacoes: string;
  status: QuoteStatus;
  criadoEm: string;
};

type QuoteForm = {
  empresa: string;
  contato: string;
  item: string;
  quantidade: string;
  valor: string;
  loja: string;
  observacoes: string;
  status: QuoteStatus;
};

const STORAGE_KEY = "orcamentos-cotacoes-v1";

const emptyForm: QuoteForm = {
  empresa: "",
  contato: "",
  item: "",
  quantidade: "1",
  valor: "",
  loja: "",
  observacoes: "",
  status: "pendente"
};

const initialQuotes: Quote[] = [
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR");

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredQuotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialQuotes;
    const parsed = JSON.parse(saved) as Quote[];
    return Array.isArray(parsed) ? parsed : initialQuotes;
  } catch {
    return initialQuotes;
  }
}

function toCsvValue(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function exportQuotesToCsv(quotes: Quote[]) {
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

function getLowestValueByItem(quotes: Quote[]) {
  return quotes.reduce<Record<string, number>>((acc, quote) => {
    const itemKey = normalizeText(quote.item);
    const current = acc[itemKey];
    acc[itemKey] = current === undefined ? quote.valor : Math.min(current, quote.valor);
    return acc;
  }, {});
}

function App() {
  const [quotes, setQuotes] = useState<Quote[]>(readStoredQuotes);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [itemFilter, setItemFilter] = useState("todos");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }, [quotes]);

  const items = useMemo(() => {
    const uniqueItems = new Set(quotes.map((quote) => quote.item).filter(Boolean));
    return Array.from(uniqueItems).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [quotes]);

  const lowestValueByItem = useMemo(() => getLowestValueByItem(quotes), [quotes]);

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return quotes.filter((quote) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(`${quote.empresa} ${quote.item} ${quote.loja}`).includes(normalizedSearch);
      const matchesItem = itemFilter === "todos" || quote.item === itemFilter;
      return matchesSearch && matchesItem;
    });
  }, [quotes, search, itemFilter]);

  const summary = useMemo(() => {
    const values = filteredQuotes.map((quote) => quote.valor);
    const lowest = values.length ? Math.min(...values) : 0;
    const highest = values.length ? Math.max(...values) : 0;
    return {
      total: filteredQuotes.length,
      lowest,
      savings: Math.max(highest - lowest, 0)
    };
  }, [filteredQuotes]);

  function updateForm(field: keyof QuoteForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNewQuoteForm() {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuote: Quote = {
      id: editingId ?? makeId(),
      empresa: form.empresa.trim(),
      contato: form.contato.trim(),
      item: form.item.trim(),
      quantidade: Math.max(Number(form.quantidade) || 1, 1),
      valor: parseMoney(form.valor),
      loja: form.loja.trim(),
      observacoes: form.observacoes.trim(),
      status: form.status,
      criadoEm: editingId
        ? quotes.find((quote) => quote.id === editingId)?.criadoEm ?? new Date().toISOString()
        : new Date().toISOString()
    };

    if (editingId) {
      setQuotes((current) => current.map((quote) => (quote.id === editingId ? nextQuote : quote)));
    } else {
      setQuotes((current) => [nextQuote, ...current]);
    }

    closeForm();
  }

  function editQuote(quote: Quote) {
    setEditingId(quote.id);
    setForm({
      empresa: quote.empresa,
      contato: quote.contato,
      item: quote.item,
      quantidade: String(quote.quantidade),
      valor: quote.valor.toFixed(2).replace(".", ","),
      loja: quote.loja,
      observacoes: quote.observacoes,
      status: quote.status
    });
    setIsFormOpen(true);
  }

  function deleteQuote(id: string) {
    const quote = quotes.find((current) => current.id === id);
    const confirmed = window.confirm(`Excluir a cotação de ${quote?.empresa ?? "esta empresa"}?`);
    if (!confirmed) return;
    setQuotes((current) => current.filter((item) => item.id !== id));
    if (editingId === id) closeForm();
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Controle local</p>
          <h1>Orçamentos</h1>
        </div>
        <div className="top-actions">
          <button type="button" className="secondary-button" onClick={() => exportQuotesToCsv(quotes)} disabled={!quotes.length}>
            Exportar CSV
          </button>
          <button type="button" className="primary-button" onClick={openNewQuoteForm}>
            Nova cotação
          </button>
        </div>
      </header>

      <section className="summary-strip" aria-label="Resumo das cotações">
        <div>
          <span>Total filtrado</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Menor valor</span>
          <strong>{formatMoney(summary.lowest)}</strong>
        </div>
        <div>
          <span>Economia possível</span>
          <strong>{formatMoney(summary.savings)}</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace-head">
          <div className="section-title">
            <h2>Cotações cadastradas</h2>
            <p>Compare valores e marque a melhor opção para cada orçamento.</p>
          </div>
          <div className="filters">
            <label>
              Buscar
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Empresa, item ou loja"
              />
            </label>
            <label>
              Filtrar item
              <select value={itemFilter} onChange={(event) => setItemFilter(event.target.value)}>
                <option value="todos">Todos os itens</option>
                {items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredQuotes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Contato</th>
                  <th>Orçamento</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                  <th>Loja</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => {
                  const sameItemCount = quotes.filter(
                    (item) => normalizeText(item.item) === normalizeText(quote.item)
                  ).length;
                  const isLowest =
                    quote.valor === lowestValueByItem[normalizeText(quote.item)] && sameItemCount > 1;

                  return (
                    <tr key={quote.id}>
                      <td>
                        <strong>{quote.empresa}</strong>
                        <span>{dateFormatter.format(new Date(quote.criadoEm))}</span>
                      </td>
                      <td>{quote.contato || "-"}</td>
                      <td>
                        {quote.item}
                        {quote.observacoes && <span>{quote.observacoes}</span>}
                      </td>
                      <td className="compact-cell">{quote.quantidade}</td>
                      <td className="price-cell">
                        <strong>{formatMoney(quote.valor)}</strong>
                        {isLowest && <span className="best-price">Menor preço</span>}
                      </td>
                      <td className="compact-cell">{quote.loja || "-"}</td>
                      <td>
                        <span className={`status ${quote.status}`}>{quote.status}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => editQuote(quote)}>
                            Editar
                          </button>
                          <button type="button" className="danger-button" onClick={() => deleteQuote(quote.id)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <strong>Nenhuma cotação encontrada.</strong>
            <p>Cadastre a primeira cotação ou ajuste a busca para ver os resultados.</p>
            <button type="button" className="primary-button" onClick={openNewQuoteForm}>
              Nova cotação
            </button>
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeForm}>
          <section
            className="quote-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="section-title">
                <h2 id="quote-modal-title">{editingId ? "Editar cotação" : "Nova cotação"}</h2>
                <p>Preencha os dados principais do orçamento recebido.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeForm} aria-label="Fechar">
                ×
              </button>
            </div>

            <form className="quote-form" onSubmit={handleSubmit}>
              <label>
                Empresa
                <input
                  required
                  value={form.empresa}
                  onChange={(event) => updateForm("empresa", event.target.value)}
                  placeholder="Nome da empresa"
                />
              </label>

              <label>
                Contato
                <input
                  value={form.contato}
                  onChange={(event) => updateForm("contato", event.target.value)}
                  placeholder="Telefone, WhatsApp ou e-mail"
                />
              </label>

              <label className="wide-field">
                Item/orçamento
                <input
                  required
                  value={form.item}
                  onChange={(event) => updateForm("item", event.target.value)}
                  placeholder="Ex.: tapete entrada de loja"
                />
              </label>

              <label>
                Quantidade
                <input
                  required
                  min="1"
                  type="number"
                  value={form.quantidade}
                  onChange={(event) => updateForm("quantidade", event.target.value)}
                />
              </label>

              <label>
                Valor
                <input
                  required
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(event) => updateForm("valor", event.target.value)}
                  placeholder="R$ 0,00"
                />
              </label>

              <label>
                Loja
                <input
                  value={form.loja}
                  onChange={(event) => updateForm("loja", event.target.value)}
                  placeholder="Ex.: 2"
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value as QuoteStatus)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="escolhido">Escolhido</option>
                  <option value="recusado">Recusado</option>
                </select>
              </label>

              <label className="wide-field">
                Observações
                <textarea
                  rows={4}
                  value={form.observacoes}
                  onChange={(event) => updateForm("observacoes", event.target.value)}
                  placeholder="Prazo, condições, detalhes do atendimento..."
                />
              </label>

              <div className="form-actions wide-field">
                <button type="submit" className="primary-button">
                  {editingId ? "Salvar edição" : "Adicionar"}
                </button>
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
