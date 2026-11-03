import { describe, expect, test } from "vitest";
import { compareByListName, listName, surnameOf } from "./listName";

const p = (name: string, given: string) => ({ name, given });

describe("names in the people lists", () => {
  test("surname comes first", () => {
    expect(listName(p("Adam Novak", "Adam"))).toBe("Novak, Adam");
    expect(listName(p("Anna Kralova Zahorska", "Anna"))).toBe("Kralova Zahorska, Anna");
    expect(surnameOf(p("Anna Kralova Zahorska", "Anna"))).toBe("Kralova Zahorska");
  });

  test("a person without a surname or name stays readable", () => {
    expect(listName(p("Anna", "Anna"))).toBe("Anna");
    expect(listName(p("", ""))).toBe("?");
  });

  test("sorted by surname, then given name, in Slovak order, nameless surnames last", () => {
    const people = [
      p("Anna", "Anna"), p("Peter Chudy", "Peter"), p("Jan Hruby", "Jan"), p("Eva Cerna", "Eva"),
      p("Adam Cerny", "Adam"), p("Zuzana Cerny", "Zuzana"), p("Maria Horvath", "Maria"),
      p("Karol Čierny", "Karol"), p("Dobroslav Cmuk", "Dobroslav"),
    ];
    const order = people.sort(compareByListName).map(listName);
    expect(order).toEqual([
      "Cerna, Eva", "Cerny, Adam", "Cerny, Zuzana", "Cmuk, Dobroslav", "Čierny, Karol",
      "Horvath, Maria", "Hruby, Jan", "Chudy, Peter", "Anna",
    ]);
  });
});
