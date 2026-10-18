/**
 * Release notes from fragments. A pull request adds one file `changelog.d/<kind>-<slug>.md` (kind = feature, visual,
 * fix or internal) holding the CHANGELOG bullet(s); it never touches `package.json` or `CHANGELOG.md`, so two open pull
 * requests cannot conflict there. The release workflow turns the fragments of a push into the next version.
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

export const KINDS = ["feature", "visual", "fix", "internal"] as const;
export type Kind = (typeof KINDS)[number];
export interface Fragment { name: string; kind: Kind; text: string }

/** The fragment of a file, or null when the name does not start with a known kind. */
export function parseFragment(name: string, text: string): Fragment | null {
  const kind = KINDS.find((k) => name.startsWith(`${k}-`) && name.endsWith(".md"));
  const body = text.trim();
  return kind && body ? { name, kind, text: body } : null;
}

/** A feature or a visual change makes a minor version, everything else a patch (the way versions have been counted so far). */
export function nextVersion(version: string, fragments: Fragment[]): string {
  const [major, minor, patch] = version.split(".").map(Number);
  return fragments.some((f) => f.kind === "feature" || f.kind === "visual") ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}

/** The new CHANGELOG section: features first, then visual changes, fixes and internal work; the files by name within a kind. */
export function section(version: string, date: string, fragments: Fragment[]): string {
  const sorted = [...fragments].sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.name.localeCompare(b.name));
  return `## ${version} – ${date}\n\n${sorted.map((f) => f.text).join("\n\n")}\n`;
}

/** The changelog with the section right under its title. */
export function withSection(changelog: string, newSection: string): string {
  const head = "# Changelog\n\n";
  if (!changelog.startsWith(head)) throw new Error("CHANGELOG.md must start with '# Changelog'");
  return `${head}${newSection}\n${changelog.slice(head.length)}`;
}

/** The package.json text with the version replaced and everything else left as written. */
export function withVersion(pkg: string, version: string): string {
  return pkg.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`);
}

/** Reads `dir`, bumps `package.json`, writes `CHANGELOG.md` and `notes.md`, deletes the fragments; returns the version or null when there are none. */
export function release(dir = "changelog.d", date = new Date().toISOString().slice(0, 10)): string | null {
  const fragments = readdirSync(dir).flatMap((name) => parseFragment(name, readFileSync(`${dir}/${name}`, "utf8")) ?? []);
  if (!fragments.length) return null;
  const pkg = readFileSync("package.json", "utf8");
  const version = nextVersion(JSON.parse(pkg).version, fragments);
  const text = section(version, date, fragments);
  writeFileSync("package.json", withVersion(pkg, version));
  writeFileSync("CHANGELOG.md", withSection(readFileSync("CHANGELOG.md", "utf8"), text));
  writeFileSync("notes.md", text.split("\n").slice(2).join("\n"));
  for (const f of fragments) rmSync(`${dir}/${f.name}`);
  return version;
}

if (process.argv[1]?.endsWith("release.ts")) {
  const version = release();
  console.log(version ?? "");
}
