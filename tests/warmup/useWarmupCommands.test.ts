import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWarmupCommands } from "@/hooks/useWarmupCommands";

describe("useWarmupCommands", () => {
  const mockHandlers = {
    onStart: vi.fn(),
    onNext: vi.fn(),
    onRepeat: vi.fn(),
    onQuit: vi.fn(),
    onHelp: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("English commands", () => {
    it("matches warmupStart commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("start")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("begin")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("ready")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("go")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("let's go")).toBe("warmupStart");
    });

    it("matches warmupNext commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("next")).toBe("warmupNext");
      expect(result.current.matchWarmupCommand("next exercise")).toBe("warmupNext");
      expect(result.current.matchWarmupCommand("skip")).toBe("warmupNext");
      expect(result.current.matchWarmupCommand("move on")).toBe("warmupNext");
    });

    it("matches warmupRepeat commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("repeat")).toBe("warmupRepeat");
      expect(result.current.matchWarmupCommand("again")).toBe("warmupRepeat");
      expect(result.current.matchWarmupCommand("one more")).toBe("warmupRepeat");
      expect(result.current.matchWarmupCommand("one more time")).toBe("warmupRepeat");
    });

    it("matches warmupQuit commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("quit")).toBe("warmupQuit");
      expect(result.current.matchWarmupCommand("exit")).toBe("warmupQuit");
      expect(result.current.matchWarmupCommand("done")).toBe("warmupQuit");
      expect(result.current.matchWarmupCommand("i'm done")).toBe("warmupQuit");
    });

    it("matches warmupHelp commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("help")).toBe("warmupHelp");
      expect(result.current.matchWarmupCommand("what do i do")).toBe("warmupHelp");
      expect(result.current.matchWarmupCommand("instructions")).toBe("warmupHelp");
    });

    it("returns null for non-matching text", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("hello world")).toBeNull();
      expect(result.current.matchWarmupCommand("random text")).toBeNull();
    });
  });

  describe("checkCommand", () => {
    it("calls onStart when start command is recognized", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("start");
      });

      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });

    it("calls onNext when next command is recognized", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("next exercise");
      });

      expect(mockHandlers.onNext).toHaveBeenCalledTimes(1);
    });

    it("calls onRepeat when repeat command is recognized", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("again");
      });

      expect(mockHandlers.onRepeat).toHaveBeenCalledTimes(1);
    });

    it("calls onQuit when quit command is recognized", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("exit");
      });

      expect(mockHandlers.onQuit).toHaveBeenCalledTimes(1);
    });

    it("calls onHelp when help command is recognized", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("help");
      });

      expect(mockHandlers.onHelp).toHaveBeenCalledTimes(1);
    });

    it("returns the matched command", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      let command: string | null = null;
      act(() => {
        command = result.current.checkCommand("start");
      });

      expect(command).toBe("warmupStart");
    });

    it("returns null for unrecognized text", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      let command: string | null = null;
      act(() => {
        command = result.current.checkCommand("gibberish text");
      });

      expect(command).toBeNull();
      expect(mockHandlers.onStart).not.toHaveBeenCalled();
      expect(mockHandlers.onNext).not.toHaveBeenCalled();
    });

    it("debounces rapid commands", async () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "en", ...mockHandlers })
      );

      act(() => {
        result.current.checkCommand("start");
        result.current.checkCommand("start");
        result.current.checkCommand("start");
      });

      // Only first command should register due to debounce
      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("German commands", () => {
    it("matches German warmup commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "de", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("start")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("beginnen")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("nächste")).toBe("warmupNext");
      expect(result.current.matchWarmupCommand("wiederholen")).toBe("warmupRepeat");
      expect(result.current.matchWarmupCommand("beenden")).toBe("warmupQuit");
      expect(result.current.matchWarmupCommand("hilfe")).toBe("warmupHelp");
    });
  });

  describe("Spanish commands", () => {
    it("matches Spanish warmup commands", () => {
      const { result } = renderHook(() =>
        useWarmupCommands({ commandLanguage: "es", ...mockHandlers })
      );

      expect(result.current.matchWarmupCommand("empieza")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("vamos")).toBe("warmupStart");
      expect(result.current.matchWarmupCommand("siguiente")).toBe("warmupNext");
      expect(result.current.matchWarmupCommand("repite")).toBe("warmupRepeat");
      expect(result.current.matchWarmupCommand("salir")).toBe("warmupQuit");
      expect(result.current.matchWarmupCommand("ayuda")).toBe("warmupHelp");
    });
  });
});
