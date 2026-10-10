import type { Metadata } from "next";
import "./globals.css";
import { StubAuthBar } from "@/components/StubAuthBar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Game Night",
  description: "Find tabletop game events near you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900">
        <Providers>
          <StubAuthBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
