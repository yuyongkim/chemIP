import type { MetadataRoute } from "next";
import { SEED_CHEMICALS } from "@/lib/chemip-seed";
import { GLOSSARY_VIEW, glossaryTermKeys } from "@/lib/chemip-glossary-terms";

const SITE = "https://chemip.yule.pics";
const APP = `${SITE}/chemip`;

// 같은 화면의 한국어·영어 주소(?lang=en, public/chemip/lang.jsx). index.html 의 hreflang 링크와 같은 짝.
function langPair(query: string): { ko: string; en: string; "x-default": string } {
  const ko = `${APP}${query ? `?${query}` : ""}`;
  const en = `${APP}?${query ? `${query}&` : ""}lang=en`;
  return { ko, en, "x-default": ko };
}

function spaEntries(query: string, now: Date, priority: number): MetadataRoute.Sitemap {
  const pair = langPair(query);
  return [pair.ko, pair.en].map((url) => ({
    url, changeFrequency: "weekly" as const, priority, lastModified: now, alternates: { languages: pair },
  }));
}

// /sitemap.xml — 첫 화면(한·영) + 물질별 페이지(시드) + 용어사전 용어(한·영, 화면 자료 파일에서 읽음 — 용어가 늘면 저절로 늘어난다).
// 정적 배포(Cloudflare Pages)의 sitemap 은 scripts/seo_pages 가 같은 규칙으로 만든다.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const terms = glossaryTermKeys();
  return [
    ...spaEntries("", now, 1.0),
    ...SEED_CHEMICALS.map((c) => ({
      url: `${SITE}/chemip/cas/${c.cas}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      lastModified: now,
    })),
    ...(terms.length ? spaEntries(`view=${GLOSSARY_VIEW}`, now, 0.5) : []),
    ...terms.flatMap((t) => spaEntries(`view=${GLOSSARY_VIEW}&term=${encodeURIComponent(t)}`, now, 0.4)),
  ];
}
