import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPreset, updateBindingKey } from "./keymap";
import {
  KEYMAP_STORAGE_KEY,
  clearSavedKeymap,
  loadKeymapPreset,
  saveKeymapPreset,
} from "./storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads defaults when no saved preset exists", () => {
    expect(loadKeymapPreset().bindings[0]).toMatchObject({
      key: "5",
      note: "C2",
    });
  });

  it("saves and loads a custom preset", () => {
    const preset = createDefaultPreset();
    const customPreset = {
      ...preset,
      bindings: updateBindingKey(preset.bindings, "C-C2", "9"),
    };

    saveKeymapPreset(customPreset);

    expect(loadKeymapPreset().bindings[0].key).toBe("9");
  });

  it("clears a saved preset and falls back to defaults", () => {
    window.localStorage.setItem(KEYMAP_STORAGE_KEY, JSON.stringify({ bindings: [] }));

    clearSavedKeymap();

    expect(loadKeymapPreset().bindings[0].key).toBe("5");
  });
});
