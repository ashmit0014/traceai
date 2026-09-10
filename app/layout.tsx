import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { mode } from "@/lib/ai/provider";
export const metadata: Metadata = {
  title: "TraceAI · Incident intelligence",
  description:
    "Evidence-backed production incident investigation for software teams.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell mode={mode()}>{children}</Shell>
      </body>
    </html>
  );
}
