import type { Metadata } from "next";

// O painel depende da sessÃ£o do usuÃ¡rio: nunca gerar como pÃ¡gina estÃ¡tica.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel Tekno Pro Digital" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
