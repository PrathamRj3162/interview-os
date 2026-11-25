import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Use" updated="25 November 2026">
      <p>By using Interview OS you agree to these terms.</p>
      <h2>Free service</h2>
      <p>
        The service is provided free of charge, as-is, without warranties. Features that depend on free third-party
        services (such as AI providers or code execution) are subject to fair-use limits and may be temporarily unavailable.
      </p>
      <h2>AI limitations</h2>
      <ul>
        <li>AI-generated feedback can be wrong. Verify important technical claims with official documentation.</li>
        <li>Scores are practice indicators based on stated rubrics. They are not predictions of hiring outcomes.</li>
        <li>Company-style questions are practice material unless explicitly labelled with a cited source.</li>
        <li>Resume analysis does not guarantee success with any applicant tracking system.</li>
      </ul>
      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t attempt to access other users&apos; data, disrupt the service, or bypass usage limits.</li>
        <li>Don&apos;t submit code intended to attack the code-execution environment.</li>
        <li>Upload only documents you have the right to use.</li>
      </ul>
      <h2>Your content</h2>
      <p>You keep ownership of everything you upload or write. You can delete it at any time.</p>
    </ProsePage>
  );
}
