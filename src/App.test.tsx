import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const audioMethods = {
  startNote: vi.fn(),
  stopNote: vi.fn(),
  updateBow: vi.fn(),
  setVibrato: vi.fn(),
  setVolume: vi.fn(),
};

vi.mock("./domain/audioEngine", () => ({
  AudioEngine: vi.fn(() => audioMethods),
}));

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("selects left hand notes and toggles vibrato from keyboard input", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "5" });
    expect(screen.getByText("C 弦 C2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("关闭")).toBeInTheDocument();
    expect(screen.getByText("空弦不支持揉弦")).toBeInTheDocument();
    expect(audioMethods.setVibrato).toHaveBeenCalledWith(false);

    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByText("C 弦 E2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("开启")).toBeInTheDocument();
    expect(audioMethods.setVibrato).toHaveBeenCalledWith(true);

    fireEvent.keyUp(window, { key: " " });
    expect(screen.getByText("关闭")).toBeInTheDocument();
    expect(audioMethods.setVibrato).toHaveBeenCalledWith(false);
  });

  it("uses the highest pitch when multiple left-hand keys are held", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "3" });
    expect(screen.getByText("C 弦 D#2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByText("C 弦 E2")).toBeInTheDocument();

    fireEvent.keyUp(window, { key: "2" });
    expect(screen.getByText("C 弦 D#2")).toBeInTheDocument();
  });

  it("renders strings as a mirrored cello fingerboard", () => {
    const { container } = render(<App />);
    const cStringNotes = Array.from(
      container.querySelectorAll(".string-row:first-child .note-name"),
    ).map((element) => element.textContent);

    expect(cStringNotes).toEqual(["F2", "E2", "D#2", "D2", "C2"]);
  });

  it("highlights the fingered path on the active string", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "z" });

    expect(screen.getByText("A 弦 D4")).toBeInTheDocument();
    expect(screen.getByTitle("修改 A3 键位")).toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 B3 键位")).toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 C4 键位")).toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 C#4 键位")).not.toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 D4 键位")).toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 D4 键位")).toHaveClass("is-active");
  });

  it("includes the active accidental when fingering an accidental note", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "x" });

    expect(screen.getByTitle("修改 C#4 键位")).toHaveClass("is-fingered");
    expect(screen.getByTitle("修改 C#4 键位")).toHaveClass("is-active");
  });

  it("starts sound from bow movement instead of pointer down alone", () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "2" });

    const bowPad = screen.getByRole("button", { name: "弓弦演奏区" });
    fireEvent.pointerDown(bowPad, {
      button: 0,
      clientX: 20,
      clientY: 60,
      pointerId: 1,
    });

    expect(audioMethods.startNote).not.toHaveBeenCalled();
    expect(screen.getByText("左键下弓 0%")).toBeInTheDocument();

    fireEvent.pointerMove(bowPad, {
      clientX: 160,
      clientY: 60,
      pointerId: 1,
    });

    expect(audioMethods.startNote).toHaveBeenCalledWith(
      expect.objectContaining({ note: "E2" }),
      "down",
      expect.any(Number),
    );

    fireEvent.pointerUp(bowPad, { button: 0, pointerId: 1 });
    expect(audioMethods.stopNote).toHaveBeenCalled();
  });

  it("prevents the context menu used by right-hand bowing", () => {
    render(<App />);

    const contextMenuEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);
  });

  it("edits, saves, and reloads a custom key binding", () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByTitle("修改 C2 键位"));
    fireEvent.keyDown(window, { key: "9" });

    expect(within(screen.getByTitle("修改 C2 键位")).getByText("9")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("保存布局"));
    unmount();

    render(<App />);

    expect(within(screen.getByTitle("修改 C2 键位")).getByText("9")).toBeInTheDocument();
  });

  it("rejects duplicate key bindings", () => {
    render(<App />);
    fireEvent.click(screen.getByTitle("修改 C2 键位"));
    fireEvent.keyDown(window, { key: "4" });

    expect(screen.getByText("4 is already assigned to D2")).toBeInTheDocument();
    expect(within(screen.getByTitle("修改 C2 键位")).getByText("...")).toBeInTheDocument();
  });
});
