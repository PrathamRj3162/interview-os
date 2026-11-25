import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <Link href="/" className={buttonClasses("secondary", "md", "mt-6")}>Go home</Link>
      </div>
    </main>
  );
}
