import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" updated="25 November 2026">
      <p>Interview OS is a free interview-preparation tool. This policy explains what we store and why.</p>
      <h2>What we store</h2>
      <ul>
        <li>Account data: email address and an encrypted password hash (managed by our authentication provider, Supabase).</li>
        <li>Your preparation profile: target role, companies, schedule and self-ratings.</li>
        <li>Resumes you upload, the text extracted from them, and the resulting analysis.</li>
        <li>Practice activity: code submissions, quiz answers, interview transcripts, notes and flashcards.</li>
        <li>A count of AI requests you make, used only to enforce fair-use limits.</li>
      </ul>
      <h2>AI processing</h2>
      <p>
        Some features send text to a third-party AI provider (for example Google Gemini or Groq) to generate questions and
        feedback. Resume text is sent only after you enable AI resume processing in Settings. Free AI tiers may use
        submitted data according to the provider&apos;s own terms, so avoid uploading information you would not want processed
        by them. Interview answers you type or speak are sent to the provider to generate the interviewer&apos;s replies.
      </p>
      <h2>Microphone</h2>
      <p>
        Voice mode uses your browser&apos;s speech recognition after you grant microphone permission. We do not record or
        store audio; only the resulting transcript is saved with your interview. Depending on your browser, speech
        recognition may itself be processed by the browser vendor.
      </p>
      <h2>Security</h2>
      <p>
        Database rows are protected by row-level security so that each account can only access its own records. Resume
        files are stored in a private bucket and are never exposed through public URLs.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Data is kept while your account exists. You can delete your account in Settings → Privacy, which permanently removes
        your profile, resumes and files, and all activity.
      </p>
      <h2>No sale of data</h2>
      <p>We do not sell personal data and do not run advertising.</p>
    </ProsePage>
  );
}
