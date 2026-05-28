import { describe, expect, it } from "vitest";
import {
  createDefaultBindings,
  findDuplicateKey,
  getDisplayBindingsForString,
  getFingeredBindingIds,
  normalizeKey,
  selectHighestPressedBinding,
  supportsVibrato,
  updateBindingKey,
} from "./keymap";

describe("keymap", () => {
  it("creates the default cello layout", () => {
    const bindings = createDefaultBindings();

    expect(bindings).toHaveLength(20);
    expect(bindings.slice(0, 5).map((binding) => `${binding.key}=${binding.note}`)).toEqual([
      "5=C2",
      "4=D2",
      "3=D#2",
      "2=E2",
      "1=F2",
    ]);
    expect(bindings.slice(15).map((binding) => `${binding.key}=${binding.note}`)).toEqual([
      "B=A3",
      "V=B3",
      "C=C4",
      "X=C#4",
      "Z=D4",
    ]);
  });

  it("normalizes printable keys", () => {
    expect(normalizeKey("a")).toBe("A");
    expect(normalizeKey(" ")).toBe("Space");
  });

  it("updates a custom key assignment", () => {
    const bindings = createDefaultBindings();
    const updated = updateBindingKey(bindings, "C-C2", "9");

    expect(updated.find((binding) => binding.id === "C-C2")?.key).toBe("9");
  });

  it("rejects duplicate key assignments", () => {
    const bindings = createDefaultBindings();

    expect(findDuplicateKey(bindings, "4", "C-C2")?.note).toBe("D2");
    expect(() => updateBindingKey(bindings, "C-C2", "4")).toThrow(
      "4 is already assigned to D2",
    );
  });

  it("selects the highest pitch from pressed keys", () => {
    const bindings = createDefaultBindings();
    const bindingsByKey = new Map(bindings.map((binding) => [binding.key, binding]));

    expect(selectHighestPressedBinding(["3", "2"], bindingsByKey)?.note).toBe("E2");
    expect(selectHighestPressedBinding(["2", "3"], bindingsByKey)?.note).toBe("E2");
  });

  it("mirrors each string for fingerboard display", () => {
    const bindings = createDefaultBindings();

    expect(getDisplayBindingsForString(bindings, "A").map((binding) => binding.note)).toEqual([
      "D4",
      "C#4",
      "C4",
      "B3",
      "A3",
    ]);
  });

  it("returns the fingered natural path plus the active target", () => {
    const bindings = createDefaultBindings();
    const activeBinding = bindings.find((binding) => binding.note === "D4")!;
    const fingeredIds = getFingeredBindingIds(bindings, activeBinding);

    expect(
      bindings
        .filter((binding) => fingeredIds.has(binding.id))
        .map((binding) => binding.note),
    ).toEqual(["A3", "B3", "C4", "D4"]);
  });

  it("includes an active accidental in the fingered path", () => {
    const bindings = createDefaultBindings();
    const activeBinding = bindings.find((binding) => binding.note === "C#4")!;
    const fingeredIds = getFingeredBindingIds(bindings, activeBinding);

    expect(fingeredIds.has("A-C#4")).toBe(true);
  });

  it("disables vibrato for open strings", () => {
    const bindings = createDefaultBindings();

    expect(supportsVibrato(bindings.find((binding) => binding.note === "C2")!)).toBe(false);
    expect(supportsVibrato(bindings.find((binding) => binding.note === "E2")!)).toBe(true);
  });
});
