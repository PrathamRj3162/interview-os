import "server-only";

/**
 * Reads a PUBLIC GitHub repository through the GitHub REST API (no key needed; GITHUB_TOKEN raises the
 * shared 60-requests-per-hour limit if set). Only metadata, the README and a few manifest files are read —
 * never secrets, never private repos. Everything read is listed in the snapshot.
 */
export type RepoSnapshot = {
  fetchedAt: string;
  fullName: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  pushedAt: string | null;
  languages: { name: string; pct: number }[];
  topDirs: string[];
  fileCount: number;
  signals: { tests: boolean; ci: boolean; docker: boolean; license: boolean };
  dependencies: string[];
  filesRead: string[];
  readme: string;
};

export class RepoError extends Error {}

const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle", "go.mod", "Cargo.toml"];

async function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "interview-os", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" });
}

async function json<T>(path: string): Promise<T> {
  const r = await gh(path).catch(() => null);
  if (!r) throw new RepoError("Couldn't reach GitHub. Try again in a minute.");
  if (r.status === 404) throw new RepoError("Repository not found. It must be public.");
  if (r.status === 403 || r.status === 429) throw new RepoError("GitHub's free API limit for this server is used up for now. Try again later.");
  if (!r.ok) throw new RepoError(`GitHub returned an error (${r.status}).`);
  return r.json() as Promise<T>;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url.trim());
  return m ? { owner: m[1], repo: m[2] } : null;
}

function depsFrom(file: string, text: string): string[] {
  try {
    if (file === "package.json") { const p = JSON.parse(text); return Object.keys({ ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}) }); }
    if (file === "requirements.txt") return text.split("\n").map((l) => l.trim().split(/[=<>~! ;[]/)[0]).filter((l) => l && !l.startsWith("#"));
    if (file === "go.mod") return [...text.matchAll(/^\s*([\w./-]+)\s+v[\d.]+/gm)].map((m) => m[1]);
    if (file === "pom.xml") return [...text.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map((m) => m[1]).slice(1);
  } catch { /* unparsable manifest: ignore */ }
  return [];
}

export async function snapshotRepo(url: string): Promise<RepoSnapshot> {
  const parsed = parseRepoUrl(url);
  if (!parsed) throw new RepoError("Use a URL like https://github.com/owner/repo");
  const base = `/repos/${parsed.owner}/${parsed.repo}`;
  const meta = await json<{ full_name: string; description: string | null; stargazers_count: number; default_branch: string; pushed_at: string | null; private: boolean; license: unknown }>(base);
  if (meta.private) throw new RepoError("Only public repositories can be analysed.");
  const [langs, tree] = await Promise.all([
    json<Record<string, number>>(`${base}/languages`).catch(() => ({} as Record<string, number>)),
    json<{ tree: { path: string; type: string }[]; truncated: boolean }>(`${base}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`).catch(() => ({ tree: [], truncated: false })),
  ]);
  const files = tree.tree.filter((t) => t.type === "blob").map((t) => t.path);
  const total = Object.values(langs).reduce((s, n) => s + n, 0);
  const filesRead: string[] = [];
  const raw = async (path: string, max: number) => {
    const r = await gh(`${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`).catch(() => null);
    if (!r?.ok) return "";
    const d = (await r.json()) as { content?: string; encoding?: string; size?: number };
    if (!d.content || d.encoding !== "base64" || (d.size ?? 0) > 500_000) return "";
    filesRead.push(path);
    return Buffer.from(d.content, "base64").toString("utf8").slice(0, max);
  };
  const readmePath = files.find((f) => /^readme(\.md|\.rst|\.txt)?$/i.test(f)) ?? null;
  const manifests = MANIFESTS.filter((m) => files.includes(m)).slice(0, 2);
  const [readme, ...manifestTexts] = await Promise.all([readmePath ? raw(readmePath, 8000) : Promise.resolve(""), ...manifests.map((m) => raw(m, 20000))]);
  const dependencies = [...new Set(manifests.flatMap((m, i) => depsFrom(m, manifestTexts[i])))].slice(0, 60);
  return {
    fetchedAt: new Date().toISOString(),
    fullName: meta.full_name, description: meta.description, stars: meta.stargazers_count, defaultBranch: meta.default_branch, pushedAt: meta.pushed_at,
    languages: Object.entries(langs).map(([name, n]) => ({ name, pct: total ? Math.round((n / total) * 1000) / 10 : 0 })).sort((a, b) => b.pct - a.pct).slice(0, 8),
    topDirs: [...new Set(files.map((f) => f.split("/")[0]).filter((d) => files.some((f) => f.startsWith(d + "/"))))].slice(0, 20),
    fileCount: files.length,
    signals: {
      tests: files.some((f) => /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$|_test\.(go|py)$|test_.*\.py$/.test(f)),
      ci: files.some((f) => f.startsWith(".github/workflows/") || f === ".gitlab-ci.yml" || f === "Jenkinsfile"),
      docker: files.some((f) => /(^|\/)Dockerfile$|docker-compose\.ya?ml$/.test(f)),
      license: Boolean(meta.license),
    },
    dependencies, filesRead, readme,
  };
}
