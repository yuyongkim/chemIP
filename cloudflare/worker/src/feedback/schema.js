// Request-board allowed values, limits and validation. Port of backend/feedback/schema.py (pure functions).

export const CATEGORIES = ["기능 요청", "자료 오류", "물질 추가", "기타"];
export const COMPANY_SIZES = ["소기업", "중기업", "중견", "대기업", "개인", "기타"];
export const STATUSES = ["접수", "검토 중", "반영", "보류"];
export const DEFAULT_STATUS = STATUSES[0];

export const LIMITS = {
  title_min: 2,
  title_max: 120,
  body_min: 5,
  body_max: 4000,
  cas_max: 20,
  contact_max: 200,
  reply_max: 4000,
};

export const HONEYPOT_FIELD = "website";

// Post limit per client (backend/feedback/guard.py WINDOW_SECONDS / MAX_POSTS).
export const POST_WINDOW_SECONDS = 600;
export const MAX_POSTS = 5;

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,}$/;

export const ERRORS = {
  category: "분류를 고르십시오.",
  title: `제목은 ${LIMITS.title_min}~${LIMITS.title_max}자로 적어 주십시오.`,
  body: `내용은 ${LIMITS.body_min}~${LIMITS.body_max}자로 적어 주십시오.`,
  cas: "CAS 번호 형식이 아닙니다(예: 71-43-2).",
  company_size: "회사 규모 값이 올바르지 않습니다.",
  contact: "연락처는 이메일 주소 형식으로 적어 주십시오.",
  status: "처리 상태 값이 올바르지 않습니다.",
  admin_reply: `답변은 ${LIMITS.reply_max}자 이하로 적어 주십시오.`,
  empty_update: "바꿀 항목(status 또는 admin_reply)이 없습니다.",
};

export function publicMeta() {
  return {
    categories: [...CATEGORIES],
    company_sizes: [...COMPANY_SIZES],
    statuses: [...STATUSES],
    limits: { ...LIMITS },
    honeypot_field: HONEYPOT_FIELD,
  };
}

// Python len() counts code points; JS .length counts UTF-16 units.
const len = (s) => [...s].length;

function text(payload, key) {
  const v = payload[key];
  return typeof v === "string" ? v.trim() : "";
}

export function isHoneypotFilled(payload) {
  return Boolean(text(payload, HONEYPOT_FIELD));
}

export function validateSubmission(payload) {
  const clean = {
    category: text(payload, "category"),
    title: text(payload, "title"),
    body: text(payload, "body"),
    cas: text(payload, "cas"),
    company_size: text(payload, "company_size"),
    contact: text(payload, "contact"),
  };
  const errors = {};
  if (!CATEGORIES.includes(clean.category)) errors.category = ERRORS.category;
  if (!(LIMITS.title_min <= len(clean.title) && len(clean.title) <= LIMITS.title_max)) errors.title = ERRORS.title;
  if (!(LIMITS.body_min <= len(clean.body) && len(clean.body) <= LIMITS.body_max)) errors.body = ERRORS.body;
  if (clean.cas && (len(clean.cas) > LIMITS.cas_max || !CAS_RE.test(clean.cas))) errors.cas = ERRORS.cas;
  if (clean.company_size && !COMPANY_SIZES.includes(clean.company_size)) errors.company_size = ERRORS.company_size;
  if (clean.contact && (len(clean.contact) > LIMITS.contact_max || !EMAIL_RE.test(clean.contact))) errors.contact = ERRORS.contact;
  return { clean, errors };
}

export function validateAdminUpdate(payload) {
  const clean = {};
  const errors = {};
  if ("status" in payload) {
    const status = text(payload, "status");
    if (!STATUSES.includes(status)) errors.status = ERRORS.status;
    else clean.status = status;
  }
  if ("admin_reply" in payload) {
    const reply = text(payload, "admin_reply");
    if (len(reply) > LIMITS.reply_max) errors.admin_reply = ERRORS.admin_reply;
    else clean.admin_reply = reply;
  }
  if (!Object.keys(clean).length && !Object.keys(errors).length) errors._ = ERRORS.empty_update;
  return { clean, errors };
}
