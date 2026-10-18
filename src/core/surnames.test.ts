import { expect, test } from "vitest";
import { surnameForSex, surnamesFor } from "./surnames";

const FILE = ["Dlhý", "Hrabová", "Modrá", "Rybár", "Skála", "Zelený"];

test("a woman gets female forms, male ones are turned into female", () => {
  expect(surnamesFor(FILE, "F", "sk")).toEqual(["Hrabová", "Modrá", "Skála", "Dlhá", "Rybárová", "Zelená"]);
});

test("a man gets male forms, female ones are turned into male", () => {
  expect(surnamesFor(FILE, "M", "sk")).toEqual(["Dlhý", "Rybár", "Skála", "Zelený", "Hrab", "Modrý"]);
});

test("a form that already exists is not offered twice", () => {
  expect(surnamesFor(["Hrab", "Hrabová"], "F", "sk")).toEqual(["Hrabová"]);
  expect(surnamesFor(["Hrab", "Hrabová"], "M", "sk")).toEqual(["Hrab"]);
});

test("unknown sex keeps the list as it is", () => {
  expect(surnamesFor(FILE, "", "sk")).toBe(FILE);
  expect(surnamesFor(FILE, "U", "sk")).toBe(FILE);
});

test("languages without gendered surnames are unchanged", () => {
  expect(surnamesFor(["Smith", "Brown"], "F", "en")).toEqual(["Smith", "Brown"]);
});

test("the file itself can tell that surnames are gendered, whatever the UI language", () => {
  expect(surnamesFor(["Rybár", "Hrabová"], "F", "en")).toEqual(["Hrabová", "Rybárová"]);
});

test("Polish -ski / -ska", () => {
  expect(surnamesFor(["Lasek", "Wolski"], "F", "pl")).toEqual(["Lasek", "Wolska"]);
  expect(surnamesFor(["Lasek", "Wolska"], "M", "pl")).toEqual(["Lasek", "Wolski"]);
});

test("upper case surnames keep their case", () => {
  expect(surnamesFor(["RYBÁR"], "F", "sk")).toEqual(["RYBÁROVÁ"]);
});

test("a child gets the father's surname in the form of the child's sex", () => {
  expect(surnameForSex("Rybár", "F", FILE, "sk")).toBe("Rybárová");
  expect(surnameForSex("Rybár", "M", FILE, "sk")).toBe("Rybár");
  expect(surnameForSex("Zelený", "F", FILE, "sk")).toBe("Zelená");
  expect(surnameForSex("Hrabová", "M", FILE, "sk")).toBe("Hrab");
  expect(surnameForSex("Rybár", "", FILE, "sk")).toBe("Rybár");
  expect(surnameForSex("Smith", "F", ["Smith"], "en")).toBe("Smith");
});
