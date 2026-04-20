export type QuoteStatus = "pendente" | "escolhido" | "recusado";

export type Quote = {
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

export type QuoteForm = {
  empresa: string;
  contato: string;
  item: string;
  quantidade: string;
  valor: string;
  loja: string;
  observacoes: string;
  status: QuoteStatus;
};
