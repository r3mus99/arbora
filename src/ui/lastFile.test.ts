import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";
import { forgetFile, recallFile, rememberFile } from "./lastFile";

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
