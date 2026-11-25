/** Builds a minimal, valid text-based PDF (Helvetica) so tests use a real file, not a mock. */
export function makePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = ["BT", "/F1 10 Tf", "12 TL", "50 780 Td", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

export const SAMPLE_RESUME = [
  "Asha Rao",
  "asha.rao@example.com | +91 98765 43210 | linkedin.com/in/asha-rao | github.com/asharao",
  "",
  "EDUCATION",
  "B.Tech in Computer Science, Example Institute of Technology, 2026. CGPA 8.6/10",
  "",
  "EXPERIENCE",
  "Software Engineering Intern, Acme Retail (May 2025 - Jul 2025)",
  "- Built a Redis caching layer for the product catalog API in Node.js, reducing p95 latency from 420ms to 90ms",
  "- Implemented JWT authentication with refresh tokens across 3 internal services",
  "- Wrote 120 unit tests with Jest, raising coverage from 40% to 85%",
  "",
  "PROJECTS",
  "Pneumonia Detection System | Python, PyTorch, FastAPI, Docker",
  "- Developed an AI-powered pneumonia detection system using DenseNet121 with transfer learning",
  "- Trained on 5,800 chest X-ray images and reached 92% recall on the held-out test set",
  "- Deployed the model as a FastAPI service in a Docker container",
  "Realtime Chat Application | React, Node.js, Socket.IO, PostgreSQL",
  "- Designed a PostgreSQL schema and REST APIs for rooms, members and messages",
  "- Optimized message history loading with cursor pagination, cutting payload size by 60%",
  "- Worked on the React frontend and helped with deployment",
  "",
  "SKILLS",
  "C++, Python, JavaScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, Git, SQL, Data Structures, Algorithms, OOP",
  "",
  "ACHIEVEMENTS",
  "- Solved 400+ problems on competitive programming platforms",
];
