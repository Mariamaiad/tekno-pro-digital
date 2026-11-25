
import type { MetadataRoute } from "next";
import { getSiteContent, mergeSettings } from "@/lib/content";
import { siteUrl } from "@/lib/links";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Configurações padrão permitem gerar o sitemap mesmo
  // quando o Supabase estiver temporariamente indisponível.
  let settings = mergeSettings(null);
  let projects: Awaited<ReturnType<typeof getSiteContent>>["projects"] = [];

  try {
    const content = await getSiteContent();
    settings = content.settings;
    projects = content.projects;
  } catch (error) {
    console.error(
      "Não foi possível carregar os conteúdos do Supabase para o sitemap:",
      error
    );
  }

  const base = siteUrl(settings);

  return [
    {
      url: `${base}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...(settings.privacy.enabled
      ? [{ url: `${base}/privacidade`, priority: 0.2 }]
      : []),
    ...projects.map((p) => ({
      url: `${base}/portfolio/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
