import type { MetadataRoute } from "next";
import { SEED_CHEMICALS } from "@/lib/chemip-seed";

const SITE = "https://chemip.yule.pics";

// /sitemap.xml — 첫 화면 + 물질별 페이지(시드). 2단계에서 물질 수가 늘면 시드만 키우면 된다.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/chemip`, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    ...SEED_CHEMICALS.map((c) => ({
      url: `${SITE}/chemip/cas/${c.cas}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      lastModified: now,
    })),
  ];
}
