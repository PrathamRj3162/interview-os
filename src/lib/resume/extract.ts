import "server-only";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeFileError extends Error {}

/** Detects type from magic bytes — never trusts the browser-supplied MIME type or extension. */
export function sniffType(buf: Uint8Array): "pdf" | "docx" | null {
  if (buf.length >= 5 && String.fromCharCode(...buf.slice(0, 5)) === "%PDF-") return "pdf";
  // DOCX is a ZIP; require the ZIP signature plus a word/ entry name near the start or in the central directory.
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    const head = new TextDecoder("latin1").decode(buf.length > 2_000_000 ? buf.slice(-200_000) : buf);
    if (head.includes("word/document.xml")) return "docx";
  }
  return null;
}

export async function extractResumeText(buf: Uint8Array): Promise<{ kind: "pdf" | "docx"; text: string }> {
  if (buf.byteLength === 0) throw new ResumeFileError("The file is empty.");
  if (buf.byteLength > MAX_RESUME_BYTES) throw new ResumeFileError("The file is larger than 5 MB.");
  const kind = sniffType(buf);
  if (!kind) throw new ResumeFileError("Only PDF and DOCX resumes are supported.");

  let text = "";
  try {
    if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      if (pdf.numPages > 10) throw new ResumeFileError("That PDF has more than 10 pages — is it really a resume?");
      const out = await extractText(pdf, { mergePages: false });
      text = (out.text as string[]).join("\n\n");
    } else {
      const mammoth = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      text = out.value;
    }
  } catch (e) {
    if (e instanceof ResumeFileError) throw e;
    throw new ResumeFileError("We couldn't read that file. It may be corrupted or password-protected.");
  }

  text = normalizeText(text);
  if (text.replace(/\s/g, "").length < 200)
    throw new ResumeFileError(
      "We couldn't find readable text in this file. If it's a scanned image, export it as a text-based PDF — ATS systems can't read image-only resumes either.",
    );
  return { kind, text: text.slice(0, 60_000) };
}

export function normalizeText(t: string): string {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
