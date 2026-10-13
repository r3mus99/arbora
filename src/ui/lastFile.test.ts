import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";
import { clearLog, fingerprint, forgetFile, recallFile, recallLog, rememberFile, saveLog } from "./lastFile";

const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
const text = (b: ArrayBuffer) => new TextDecoder().decode(b);

describe("last opened file", () => {
  beforeEach(forgetFile);

  test("nothing is remembered at first", async () => {
    expect(await recallFile()).toBeNull();
  });

  test("a remembered file comes back with its name and bytes", async () => {
    expect(await rememberFile("tree.ged", bytes("0 HEAD\n0 TRLR\n"))).toBe(true);
    const f = await recallFile();
    expect(f?.name).toBe("tree.ged");
    expect(text(f!.bytes)).toBe("0 HEAD\n0 TRLR\n");
  });

  test("the sample is remembered without a name", async () => {
    await rememberFile(null, bytes("0 HEAD\n"));
    expect((await recallFile())?.name).toBeNull();
  });

  test("the newest file replaces the older one", async () => {
    await rememberFile("a.ged", bytes("a"));
    await rememberFile("b.ged", bytes("b"));
    const f = await recallFile();
    expect(f?.name).toBe("b.ged");
    expect(text(f!.bytes)).toBe("b");
  });

  test("a forgotten file is gone", async () => {
    await rememberFile("a.ged", bytes("a"));
    await forgetFile();
    expect(await recallFile()).toBeNull();
  });

  test("without IndexedDB nothing breaks", async () => {
    const saved = globalThis.indexedDB;
    // @ts-expect-error simulate a browser with storage blocked
    globalThis.indexedDB = undefined;
    try {
      expect(await rememberFile("a.ged", bytes("a"))).toBe(false);
      expect(await recallFile()).toBeNull();
      await expect(forgetFile()).resolves.toBeUndefined();
    } finally { globalThis.indexedDB = saved; }
  });
});

describe("edit log", () => {
  const file = (name: string | null, s: string) => ({ name, bytes: bytes(s) });
  const log = (f: { bytes: ArrayBuffer }, at = 1) => ({ of: fingerprint(f.bytes), ops: [[], []], at, saved: 0 });
  beforeEach(forgetFile);

  test("comes back for exactly the file it belongs to", async () => {
    const f = file("a.ged", "abc");
    await rememberFile(f.name, f.bytes);
    await saveLog(log(f));
    expect((await recallLog(f))?.at).toBe(1);
    expect(await recallLog(file("a.ged", "abd"))).toBeNull();
  });

  test("a different original (new file) drops it", async () => {
    const f = file("a.ged", "abc");
    await saveLog(log(f));
    await rememberFile("a.ged", f.bytes);
    expect(await recallLog(f)).toBeNull();
  });

  test("forgetting the file and clearing drop it", async () => {
    const f = file(null, "abc");
    await saveLog(log(f));
    await clearLog();
    expect(await recallLog(f)).toBeNull();
    await saveLog(log(f));
    await forgetFile();
    expect(await recallLog(f)).toBeNull();
  });

  test("a log with a cursor outside its edits is ignored", async () => {
    const f = file(null, "abc");
    await saveLog(log(f, 5));
    expect(await recallLog(f)).toBeNull();
  });

  test("blocked storage fails quietly", async () => {
    const saved = globalThis.indexedDB;
    // @ts-expect-error simulate a browser with storage blocked
    globalThis.indexedDB = undefined;
    try {
      const f = file(null, "x");
      expect(await saveLog(log(f))).toBe(false);
      expect(await recallLog(f)).toBeNull();
      await expect(clearLog()).resolves.toBeUndefined();
    } finally { globalThis.indexedDB = saved; }
  });
});
