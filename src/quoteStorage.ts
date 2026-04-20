import { Quote } from "./types";
import { initialQuotes } from "./quoteUtils";

const LEGACY_STORAGE_KEY = "orcamentos-cotacoes-v1";
const MIGRATION_KEY = "orcamentos-cotacoes-indexeddb-migrated-v1";
const DB_NAME = "orcamentos-cotacoes-db";
const DB_VERSION = 1;
const QUOTES_STORE = "quotes";

function readLegacyQuotes() {
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!saved) return initialQuotes;
    const parsed = JSON.parse(saved) as Quote[];
    return Array.isArray(parsed) ? parsed : initialQuotes;
  } catch {
    return initialQuotes;
  }
}

function openQuotesDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUOTES_STORE)) {
        db.createObjectStore(QUOTES_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function getAllQuotesFromDb() {
  const db = await openQuotesDb();

  try {
    return await new Promise<Quote[]>((resolve, reject) => {
      const transaction = db.transaction(QUOTES_STORE, "readonly");
      const store = transaction.objectStore(QUOTES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as Quote[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveQuoteToDb(quote: Quote) {
  const db = await openQuotesDb();

  try {
    const transaction = db.transaction(QUOTES_STORE, "readwrite");
    transaction.objectStore(QUOTES_STORE).put(quote);
    await waitForTransaction(transaction);
  } finally {
    db.close();
  }
}

export async function deleteQuoteFromDb(id: string) {
  const db = await openQuotesDb();

  try {
    const transaction = db.transaction(QUOTES_STORE, "readwrite");
    transaction.objectStore(QUOTES_STORE).delete(id);
    await waitForTransaction(transaction);
  } finally {
    db.close();
  }
}

export async function replaceQuotesInDb(quotes: Quote[]) {
  const db = await openQuotesDb();

  try {
    const transaction = db.transaction(QUOTES_STORE, "readwrite");
    const store = transaction.objectStore(QUOTES_STORE);
    store.clear();
    quotes.forEach((quote) => store.put(quote));
    await waitForTransaction(transaction);
  } finally {
    db.close();
  }
}

export async function loadQuotesFromStorage() {
  const dbQuotes = await getAllQuotesFromDb();
  const alreadyMigrated = localStorage.getItem(MIGRATION_KEY) === "true";

  if (alreadyMigrated) return dbQuotes;

  const legacyQuotes = readLegacyQuotes();
  const quotesToUse = dbQuotes.length ? dbQuotes : legacyQuotes;
  await replaceQuotesInDb(quotesToUse);
  localStorage.setItem(MIGRATION_KEY, "true");
  return quotesToUse;
}
