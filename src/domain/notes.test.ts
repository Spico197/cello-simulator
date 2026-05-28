import { describe, expect, it } from "vitest";
import { noteToFrequency } from "./notes";

describe("noteToFrequency", () => {
  it("converts common cello notes to frequencies", () => {
    expect(noteToFrequency("A4")).toBe(440);
    expect(noteToFrequency("C2")).toBe(65.406);
    expect(noteToFrequency("G2")).toBe(97.999);
    expect(noteToFrequency("D3")).toBe(146.832);
    expect(noteToFrequency("A3")).toBe(220);
  });

  it("rejects malformed notes", () => {
    expect(() => noteToFrequency("H2")).toThrow("Invalid note");
  });
});
