import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { splitMeta, spokenFilter, liveOrder } from "@/lib/ai/live";

describe("streamed interviewer replies", () => {
  it("splits the spoken text from the trailing @@META line", () => {
    expect(splitMeta('Good. Why a hash map?\n@@META {"topic":"ds","should_end":false,"advance_phase":true}')).toEqual({ say: "Good. Why a hash map?", meta: { topic: "ds", should_end: false, advance_phase: true } });
    expect(splitMeta("No metadata at all.")).toEqual({ say: "No metadata at all.", meta: {} });
    expect(splitMeta("Text\n@@META not json").meta).toEqual({});
  });
  it("never emits the marker, even when it's split across chunks", () => {
    const out: string[] = [];
    const f = spokenFilter((t) => out.push(t));
    for (const c of ["Hello there. ", "What do you th", "ink?\n@", "@ME", 'TA {"topic":"x"}', " trailing"]) f(c);
    expect(out.join("")).toBe("Hello there. What do you think?\n");
  });
  it("keeps an @ that isn't the marker", () => {
    const out: string[] = [];
    const f = spokenFilter((t) => out.push(t));
    f("Email me @ home"); f(" please.");
    expect(out.join("")).toBe("Email me @ home please.");
  });
  it("orders providers fastest first: Groq, lite Gemini, Gemini, others", () => {
    const p = (id: string, model: string) => ({ id, model, label: "", baseUrl: "" }) as never;
    const order = liveOrder([p("gemini", "gemini-flash-latest"), p("openrouter", "x:free"), p("gemini", "gemini-flash-lite-latest"), p("groq", "gpt-oss")]);
    expect(order.map((x: { model: string }) => x.model)).toEqual(["gpt-oss", "gemini-flash-lite-latest", "gemini-flash-latest", "x:free"]);
  });
});
