// Anonymous usage counts in D1. Port of backend/usage/store.py — day x metric x subject counts only.
import { addDays, todayKst } from "../lib/time.js";

// Metric name -> label. New metric: one line here + one line in matcher.js.
export const METRICS = {
  substance_view: "물질 상세 조회",
  trade_controls: "규제·인허가 / 수출입 조회",
};

const PRIVACY = "IP 주소·브라우저 정보·개인 식별 정보는 수집하지 않습니다. 날짜·지표·물질(CAS/물질 번호)별 횟수만 셉니다.";

export async function increment(db, metric, subject = "", day = todayKst()) {
  if (!(metric in METRICS)) throw new Error(`unknown metric: ${metric}`);
  await db
    .prepare(
      "INSERT INTO usage_daily (day, metric, subject, count) VALUES (?, ?, ?, 1) " +
        "ON CONFLICT(day, metric, subject) DO UPDATE SET count = count + 1",
    )
    .bind(day, metric, subject)
    .run();
}

const zeroRow = () => Object.fromEntries(Object.keys(METRICS).map((m) => [m, 0]));

export async function summary(db, { days = 30, top = 10, today = todayKst() } = {}) {
  const since = addDays(today, -(days - 1));
  const [dailyRows, metricRows, topRows, firstRow] = await db.batch([
    db.prepare("SELECT day, metric, SUM(count) AS n FROM usage_daily WHERE day >= ? GROUP BY day, metric").bind(since),
    db
      .prepare(
        "SELECT metric, SUM(count) AS n, COUNT(DISTINCT CASE WHEN subject != '' THEN subject END) AS d " +
          "FROM usage_daily WHERE day >= ? GROUP BY metric",
      )
      .bind(since),
    db
      .prepare(
        "SELECT metric, subject, SUM(count) AS n FROM usage_daily WHERE day >= ? AND subject != '' " +
          "GROUP BY metric, subject ORDER BY n DESC, subject",
      )
      .bind(since),
    db.prepare("SELECT MIN(day) AS first FROM usage_daily"),
  ]);

  const byDay = {};
  for (const r of dailyRows.results) {
    (byDay[r.day] ||= zeroRow())[r.metric] = r.n;
  }
  const daily = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(since, i);
    daily.push({ day: d, ...(byDay[d] || zeroRow()) });
  }
  const totals = Object.fromEntries(Object.keys(METRICS).map((m) => [m, { count: 0, distinct_subjects: 0 }]));
  for (const r of metricRows.results) if (r.metric in totals) totals[r.metric] = { count: r.n, distinct_subjects: r.d };
  const topSubjects = Object.fromEntries(Object.keys(METRICS).map((m) => [m, []]));
  for (const r of topRows.results) {
    if (r.metric in topSubjects && topSubjects[r.metric].length < top) topSubjects[r.metric].push({ subject: r.subject, count: r.n });
  }
  return {
    since,
    until: today,
    first_recorded_day: firstRow.results[0]?.first ?? null,
    metrics: { ...METRICS },
    totals,
    daily,
    top_subjects: topSubjects,
    privacy: PRIVACY,
  };
}
