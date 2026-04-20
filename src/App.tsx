import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { exportQuotesToCsv, parseQuotesFromCsv } from "./csv";
import {
  deleteQuoteFromDb,
  loadQuotesFromStorage,
  replaceQuotesInDb,
  saveQuoteToDb
} from "./quoteStorage";
import {
  dateFormatter,
  emptyForm,
  formatMoney,
  getLowestValueByItem,
  makeId,
  normalizeText,
  parseMoney
} from "./quoteUtils";
import { Quote, QuoteForm, QuoteStatus } from "./types";

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemFilter, setItemFilter] = useState("todos");

  useEffect(() => {
    let isMounted = true;

    async function loadQuotes() {
      try {
        const loadedQuotes = await loadQuotesFromStorage();
        if (isMounted) setQuotes(loadedQuotes);
      } catch (error) {
        console.error("Erro ao carregar o banco de dados", error);
        if (isMounted) setQuotes([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadQuotes();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const hasExampleQuotes = quotes.some((quote) => quote.id.startsWith("exemplo-"));

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    await saveQuoteToDb(nextQuote);

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

  async function deleteQuote(id: string) {
    const quote = quotes.find((current) => current.id === id);
    const confirmed = window.confirm(`Excluir a cotação de ${quote?.empresa ?? "esta empresa"}?`);
    if (!confirmed) return;
    await deleteQuoteFromDb(id);
    setQuotes((current) => current.filter((item) => item.id !== id));
    if (editingId === id) closeForm();
  }

  async function clearExampleQuotes() {
    const confirmed = window.confirm("Apagar somente os dados de exemplo?");
    if (!confirmed) return;
    const realQuotes = quotes.filter((quote) => !quote.id.startsWith("exemplo-"));
    await replaceQuotesInDb(realQuotes);
    setQuotes(realQuotes);
  }

  function openCsvImporter() {
    fileInputRef.current?.click();
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const csv = await file.text();
    const importedQuotes = parseQuotesFromCsv(csv);

    if (!importedQuotes.length) {
      window.alert("Não encontrei cotações válidas neste arquivo CSV.");
      return;
    }

    const replaceCurrent = window.confirm(
      "Importar CSV\n\nOK = substituir tudo pelos dados do arquivo.\nCancelar = adicionar aos dados atuais."
    );
    const nextQuotes = replaceCurrent ? importedQuotes : [...importedQuotes, ...quotes];

    await replaceQuotesInDb(nextQuotes);
    setQuotes(nextQuotes);
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Controle local</p>
          <h1>Orçamentos</h1>
        </div>
        <div className="top-actions">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
          {hasExampleQuotes && (
            <button type="button" className="secondary-button" onClick={clearExampleQuotes}>
              Apagar exemplos
            </button>
          )}
          <button type="button" className="secondary-button" onClick={openCsvImporter}>
            Importar CSV
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => exportQuotesToCsv(quotes)}
            disabled={!quotes.length}
          >
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

        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando banco de dados.</strong>
            <p>Estou abrindo as cotações salvas neste navegador.</p>
          </div>
        ) : filteredQuotes.length ? (
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
            <p>Cadastre a primeira cotação ou importe um backup CSV.</p>
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
