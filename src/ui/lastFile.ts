/* The last opened file, kept in the browser's IndexedDB (localStorage is too small for a GEDCOM file). It never leaves the browser. */

const DB = "arbora";
const STORE = "files";
const KEY = "last";
const LOG = "log";

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

/** A short fingerprint of the file's bytes (FNV-1a), to tell that a kept edit log belongs to exactly this file. */
export function fingerprint(bytes: ArrayBuffer): string {
  let h = 0x811c9dc5;
  for (const b of new Uint8Array(bytes)) h = Math.imul(h ^ b, 0x01000193);
  return `${bytes.byteLength}:${(h >>> 0).toString(16)}`;
}

/** The edits made to the remembered file and not (or not all) forgotten: the log of core edits, see history.ts. */
export interface EditLog { of: string; ops: unknown[]; at: number; saved: number | null }

/** Remembers the file; storage may be blocked (private window, no space), then nothing is kept. */
export async function rememberFile(name: string | null, bytes: ArrayBuffer): Promise<boolean> {
  try {
    // a different original has no edits yet
    await run("readwrite", (s) => { s.delete(LOG); return s.put({ name, bytes } satisfies LastFile, KEY); });
    return true;
  } catch { return false; }
}

/** The remembered file, or null when there is none or the storage cannot be read. */
export async function recallFile(): Promise<LastFile | null> {
  try {
    const f = await run<LastFile | undefined>("readonly", (s) => s.get(KEY));
    return f && f.bytes instanceof ArrayBuffer && (f.name === null || typeof f.name === "string") ? f : null;
  } catch { return null; }
}

export async function forgetFile(): Promise<void> {
  try { await run("readwrite", (s) => { s.delete(LOG); return s.delete(KEY); }); } catch { /* nothing to forget */ }
}

/** Keeps the edit log beside the remembered file; storage may be blocked, then it is simply lost. */
export async function saveLog(log: EditLog): Promise<boolean> {
  try { await run("readwrite", (s) => s.put(log, LOG)); return true; } catch { return false; }
}

/** The kept edit log when it belongs to the remembered file `f`, else null. */
export async function recallLog(f: LastFile): Promise<EditLog | null> {
  try {
    const l = await run<EditLog | undefined>("readonly", (s) => s.get(LOG));
    const ok = l && l.of === fingerprint(f.bytes) && Array.isArray(l.ops) && Number.isInteger(l.at)
      && l.at >= 0 && l.at <= l.ops.length && (l.saved === null || Number.isInteger(l.saved));
    return ok ? l : null;
  } catch { return null; }
}

export async function clearLog(): Promise<void> {
  try { await run("readwrite", (s) => s.delete(LOG)); } catch { /* nothing to clear */ }
}
