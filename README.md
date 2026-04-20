# Orçamentos e Cotações

Web app local para cadastrar, anotar e comparar cotações/orçamentos.

## Como rodar no computador

Instale as dependências:

```bash
npm install
```

Inicie o app:

```bash
npm run dev -- --port 5173
```

Depois abra:

```text
http://127.0.0.1:5173
```

## O que o app faz

- Cadastra cotações com empresa, contato, item, quantidade, valor, loja, observações e status.
- Salva os dados automaticamente no navegador usando `localStorage`.
- Destaca o menor preço para itens com mais de uma cotação.
- Permite buscar, filtrar e exportar os dados em CSV.
