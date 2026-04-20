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

## Onde os dados ficam salvos

Os dados ficam salvos no banco interno do navegador, usando IndexedDB.
Isso não envia suas cotações para a internet e não precisa de login.

Como esse banco pertence ao navegador, o backup recomendado é usar os botões:

- `Exportar CSV`
- `Importar CSV`

Assim você pode guardar uma planilha de segurança e restaurar depois se precisar.

## O que o app faz

- Cadastra cotações com empresa, contato, item, quantidade, valor, loja, observações e status.
- Salva os dados no IndexedDB do navegador.
- Migra automaticamente dados antigos que estavam em `localStorage`.
- Destaca o menor preço para itens com mais de uma cotação.
- Permite buscar, filtrar, importar CSV e exportar CSV.
- Permite apagar somente os dados de exemplo.
