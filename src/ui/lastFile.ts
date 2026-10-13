/* The last opened file, kept in the browser's IndexedDB (localStorage is too small for a GEDCOM file). It never leaves the browser. */

const DB = "arbora";
const STORE = "files";
const KEY = "last";

/** What is kept: the file name (null for the sample) and the file's bytes as they were opened. */
export interface LastFile { name: string | null; bytes: ArrayBuffer }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs one request on the store; the database is closed afterwards. */
async function run<T>(mode: IDBTransactionMode, make: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = make(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

/** Remembers the file; storage may be blocked (private window, no space), then nothing is kept. */
export async function rememberFile(name: string | null, bytes: ArrayBuffer): Promise<boolean> {
  try { await run("readwrite", (s) => s.put({ name, bytes } satisfies LastFile, KEY)); return true; } catch { return false; }
}

/** The remembered file, or null when there is none or the storage cannot be read. */
export async function recallFile(): Promise<LastFile | null> {
  try {
    const f = await run<LastFile | undefined>("readonly", (s) => s.get(KEY));
    return f && f.bytes instanceof ArrayBuffer && (f.name === null || typeof f.name === "string") ? f : null;
  } catch { return null; }
}

export async function forgetFile(): Promise<void> {
  try { await run("readwrite", (s) => s.delete(KEY)); } catch { /* nothing to forget */ }
}
