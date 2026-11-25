
import type { MetadataRoute } from "next";
import { getSiteContent, mergeSettings } from "@/lib/content";
import { siteUrl } from "@/lib/links";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let settings = mergeSettings(null);

  try {
    const content = await getSiteContent();
    settings = content.settings;
  } catch (error) {
    console.error(
      "Não foi possível carregar as configurações do Supabase para o robots.txt:",
      error
    );
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth"],
    },
    sitemap: `${siteUrl(settings)}/sitemap.xml`,
  };
}
