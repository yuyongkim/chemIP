// ChemIP 2단계 — 물질별 SEO 랜딩 (서버 렌더). 규제·수출입 요약을 HTML 로 내보내고
// 전체 상호작용(MSDS 포함)은 /chemip?cas=... SPA 로 연결한다. 시드 CAS 만 생성한다(얇은/임의 페이지 방지).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEED_CHEMICALS, SEED_CAS_SET } from "@/lib/chemip-seed";

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:7011";
const SITE = "https://chemip.yule.pics";

// 요청 시 서버 렌더(백엔드 규제 데이터 조회) + Cloudflare 엣지가 캐시. 시드 외 CAS 는 아래에서 notFound.
function seedFor(cas: string) {
  return SEED_CHEMICALS.find((c) => c.cas === cas);
}

export async function generateMetadata({ params }: { params: Promise<{ cas: string }> }): Promise<Metadata> {
  const { cas } = await params;
  const seed = seedFor(cas);
  if (!seed) return { title: "ChemIP" };
  const title = `${seed.ko} (CAS ${cas}) 규제·수출입·MSDS 조회 | ChemIP`;
  const description = `${seed.ko}(CAS ${cas})의 국내외 규제, 수출입 통제, 물질안전보건자료(MSDS)를 한 번에 조회합니다. ChemIP 무료.`;
  const url = `${SITE}/chemip/cas/${cas}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "ChemIP", locale: "ko_KR", url, title, description },
  };
}

async function jget(path: string): Promise<any | null> {
  try {
    const r = await fetch(`${BACKEND}${path}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default async function ChemCasPage({ params }: { params: Promise<{ cas: string }> }) {
  const { cas } = await params;
  if (!SEED_CAS_SET.has(cas)) notFound();
  const seed = seedFor(cas)!;

  const [detail, intl, trade] = await Promise.all([
    jget(`/api/chemicals/${encodeURIComponent(cas)}`),
    jget(`/api/regulations/international/${encodeURIComponent(cas)}`),
    jget(`/api/regulations/trade-controls/${encodeURIComponent(cas)}`),
  ]);

  const nameEn: string = detail?.name_en || "";
  const intlCount: number = typeof intl?.count === "number" ? intl.count : 0;
  const jurisdictions: string[] = intl?.jurisdictions && typeof intl.jurisdictions === "object"
    ? Object.keys(intl.jurisdictions)
    : [];
  const krLaws: Array<{ law?: string; lists?: Array<{ title?: string }> }> =
    Array.isArray(trade?.kr_law_lists) ? trade.kr_law_lists : [];
  const controlled: any[] = Array.isArray(trade?.controlled_lists) ? trade.controlled_lists : [];

  const appUrl = `/chemip?cas=${encodeURIComponent(cas)}`;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px", lineHeight: 1.7, color: "#1a1a1a", fontFamily: "'Pretendard Variable',system-ui,sans-serif" }}>
      <p style={{ fontSize: ".85rem", color: "#666", margin: "0 0 8px" }}>
        <Link href="/chemip" style={{ color: "#2b6cb0" }}>ChemIP</Link> · 화학물질 규제·MSDS
      </p>
      <h1 style={{ fontSize: "1.7rem", margin: "0 0 6px" }}>{seed.ko}{nameEn ? ` (${nameEn})` : ""}</h1>
      <p style={{ color: "#444", margin: "0 0 20px" }}>CAS 번호 {cas}</p>

      <p>
        {seed.ko}(CAS {cas})의 국내외 규제, 수출입 통제, 물질안전보건자료(MSDS)를 ChemIP에서 한 번에 조회할 수 있습니다.
        한국은 물론 미국을 포함한 여러 상대국의 규제를 함께 다룹니다.
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>국내외 규제 현황</h2>
      {intlCount > 0 ? (
        <p>
          {seed.ko}은(는) 현재 <strong>국내외 {intlCount}개 관할</strong>에서 규제 대상으로 확인됩니다
          {jurisdictions.length ? ` (예: ${jurisdictions.slice(0, 10).join(", ")}${jurisdictions.length > 10 ? " 등" : ""})` : ""}.
        </p>
      ) : (
        <p>국내외 규제 목록은 ChemIP에서 확인할 수 있습니다.</p>
      )}

      {krLaws.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.1rem", marginTop: 24 }}>국내 법령·목록</h2>
          <ul>
            {krLaws.slice(0, 8).map((g, i) => (
              <li key={i}>
                <strong>{g.law}</strong>
                {Array.isArray(g.lists) && g.lists.length > 0
                  ? ` — ${g.lists.slice(0, 4).map((l) => l.title).filter(Boolean).join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {controlled.length > 0 && (
        <p style={{ marginTop: 16 }}>수출입 통제 목록 <strong>{controlled.length}건</strong>에 해당할 수 있어, 수출 전 확인이 필요합니다.</p>
      )}

      <p style={{ marginTop: 28 }}>
        <Link href={appUrl} style={{ display: "inline-block", background: "#2b6cb0", color: "#fff", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
          ChemIP에서 {seed.ko} 전체 정보 보기 (MSDS·규제·수출입) →
        </Link>
      </p>

      <p style={{ fontSize: ".82rem", color: "#777", marginTop: 32, borderTop: "1px solid #eee", paddingTop: 12 }}>
        출처: 물질안전보건자료(MSDS)는 안전보건공단·공공데이터포털, 규제·수출입 정보는 관련 공공데이터를 사용합니다.
        본 요약은 참고용이며, 실제 적용은 ChemIP 상세 화면과 원문 근거로 확인하십시오.
      </p>
    </main>
  );
}
