import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nextVersion, parseFragment, release, section, withSection, withVersion } from "../scripts/release.ts";

const fragment = (name: string) => parseFragment(name, "- entry")!;

describe("release fragments", () => {
  it("reads the kind from the file name and ignores other files", () => {
    expect(parseFragment("fix-date.md", "  - a fix \n")).toEqual({ name: "fix-date.md", kind: "fix", text: "- a fix" });
    expect(parseFragment("README.md", "text")).toBeNull();
    expect(parseFragment("feature-empty.md", " \n")).toBeNull();
  });

  it("makes a minor version for a feature or a visual change and a patch otherwise", () => {
    expect(nextVersion("1.54.2", [fragment("fix-a.md"), fragment("internal-b.md")])).toBe("1.54.3");
    expect(nextVersion("1.54.2", [fragment("fix-a.md"), fragment("feature-b.md")])).toBe("1.55.0");
    expect(nextVersion("1.54.2", [fragment("visual-a.md")])).toBe("1.55.0");
  });

  it("orders a section by kind, then by name, and puts it under the title", () => {
    const text = section("1.55.0", "2026-10-18", [parseFragment("fix-b.md", "- B")!, parseFragment("feature-z.md", "- Z")!, parseFragment("feature-a.md", "- A")!]);
    expect(text).toBe("## 1.55.0 – 2026-10-18\n\n- A\n\n- Z\n\n- B\n");
    expect(withSection("# Changelog\n\n## 1.54.0 – x\n", text)).toBe(`# Changelog\n\n${text}\n## 1.54.0 – x\n`);
    expect(() => withSection("no title", text)).toThrow("must start with");
  });

  it("replaces only the version in package.json", () => {
    expect(withVersion('{\n  "name": "a",\n  "version": "1.2.3",\n  "x": 1\n}', "1.3.0")).toBe('{\n  "name": "a",\n  "version": "1.3.0",\n  "x": 1\n}');
  });

  it("writes the release and deletes the fragments, or does nothing without fragments", () => {
    const root = mkdtempSync(join(tmpdir(), "release-"));
    const cwd = process.cwd();
    try {
      process.chdir(root);
      mkdirSync("changelog.d");
      writeFileSync("package.json", '{\n  "version": "1.0.0"\n}\n');
      writeFileSync("CHANGELOG.md", "# Changelog\n\n## 1.0.0 – old\n\n- old\n");
      writeFileSync("changelog.d/README.md", "docs");
      expect(release("changelog.d", "2026-10-18")).toBeNull();
      writeFileSync("changelog.d/feature-x.md", "- **X.** It does X.\n");
      expect(release("changelog.d", "2026-10-18")).toBe("1.1.0");
      expect(readFileSync("package.json", "utf8")).toContain('"version": "1.1.0"');
      expect(readFileSync("CHANGELOG.md", "utf8")).toBe("# Changelog\n\n## 1.1.0 – 2026-10-18\n\n- **X.** It does X.\n\n## 1.0.0 – old\n\n- old\n");
      expect(readFileSync("notes.md", "utf8")).toBe("- **X.** It does X.\n");
      expect(readdirSync("changelog.d")).toEqual(["README.md"]);
    } finally {
      process.chdir(cwd);
    }
  });
});
