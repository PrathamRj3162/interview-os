import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extractResumeText, sniffType } from "@/lib/resume/extract";
import { makePdf, SAMPLE_RESUME } from "../e2e/make-pdf";

describe("resume extraction", () => {
  it("extracts text from a real PDF", async () => {
    const { kind, text } = await extractResumeText(new Uint8Array(makePdf(SAMPLE_RESUME)));
    expect(kind).toBe("pdf");
    expect(text).toContain("DenseNet121");
    expect(text).toContain("EXPERIENCE");
  });
  it("rejects non-resume files by content, not extension", async () => {
    expect(sniffType(new TextEncoder().encode("hello"))).toBeNull();
    await expect(extractResumeText(new TextEncoder().encode("x".repeat(500)))).rejects.toThrow(/Only PDF and DOCX/);
    await expect(extractResumeText(new Uint8Array())).rejects.toThrow(/empty/);
  });
  it("rejects PDFs without readable text", async () => {
    await expect(extractResumeText(new Uint8Array(makePdf(["hi"])))).rejects.toThrow(/readable text/);
  });
});
