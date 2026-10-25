// 요청 게시판 · 글쓰기 — 분류·제목·내용(필수), CAS·회사 규모·이메일(선택). 허니팟 칸은 화면에 보이지 않는다.
// 선택지·길이 제한은 meta(/api/feedback/meta), 문구는 FEEDBACK_LABELS.form.

function FbField({ label, error, hint, children }) {
  return (
    <label className="fb-field">
      <span className="fb-field-label">{label}</span>
      {children}
      {hint && <span className="ui-hint">{hint}</span>}
      {error && <span className="fb-field-error">{error}</span>}
    </label>
  );
}

function FeedbackForm({ meta, prefill, onDone, onCancel }) {
  const F = FEEDBACK_LABELS.form;
  const limits = meta?.limits || {};
  const categories = meta?.categories || [];
  const initialCategory = categories.includes(prefill?.category) ? prefill.category : (categories[0] || "");
  const [values, setValues] = React.useState({
    category: initialCategory, title: prefill?.title || "", body: "", cas: prefill?.cas || "", company_size: "", contact: "",
  });
  const [trap, setTrap] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [errors, setErrors] = React.useState({ fields: {}, message: "" });
  const set = key => e => setValues(v => ({ ...v, [key]: e.target.value }));

  React.useEffect(() => {
    if (!values.category && categories.length) setValues(v => ({ ...v, category: initialCategory }));
  }, [categories.length]);

  const submit = async e => {
    e.preventDefault();
    setSending(true);
    const result = await submitFeedback({ ...values, [meta?.honeypot_field || "website"]: trap });
    setSending(false);
    const next = fbSubmitErrors(result);
    setErrors(next);
    if (result.ok) onDone(result.data);
  };

  const fe = errors.fields;
  return (
    <form className="panel fb-panel fb-form" onSubmit={submit} noValidate>
      <h3><b>{F.title}</b><span className="muted">{F.publicNotice}</span></h3>
      <div className="body">
        <FbField label={F.category} error={fe.category}>
          <div className="seg" role="group" aria-label={F.category}>
            {categories.map(c => (
              <button type="button" key={c} aria-pressed={values.category === c} onClick={() => setValues(v => ({ ...v, category: c }))}>{c}</button>
            ))}
          </div>
        </FbField>
        <FbField label={F.titleField} error={fe.title} hint={F.count(values.title.length, limits.title_max || "")}>
          <input className="fb-input" value={values.title} onChange={set("title")} maxLength={limits.title_max} placeholder={F.titlePlaceholder} required />
        </FbField>
        <FbField label={F.body} error={fe.body} hint={F.count(values.body.length, limits.body_max || "")}>
          <textarea className="fb-input fb-textarea" value={values.body} onChange={set("body")} maxLength={limits.body_max} placeholder={F.bodyPlaceholder} rows={8} required />
        </FbField>
        <div className="fb-row">
          <FbField label={F.cas} error={fe.cas}>
            <input className="fb-input mono" value={values.cas} onChange={set("cas")} maxLength={limits.cas_max} placeholder={F.casPlaceholder} />
          </FbField>
          <FbField label={F.companySize} error={fe.company_size}>
            <select className="fb-input" value={values.company_size} onChange={set("company_size")}>
              <option value="">{F.companySizeNone}</option>
              {(meta?.company_sizes || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FbField>
        </div>
        <FbField label={F.contact} error={fe.contact} hint={F.contactHint}>
          <input className="fb-input" type="email" value={values.contact} onChange={set("contact")} maxLength={limits.contact_max} placeholder={F.contactPlaceholder} autoComplete="email" />
        </FbField>
        <div className="fb-trap" aria-hidden="true">
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} name={meta?.honeypot_field || "website"} />
        </div>
        {errors.message && <div className="fb-field-error fb-form-error">{errors.message}</div>}
        <div className="fb-actions">
          <button type="button" className="btn" onClick={onCancel}>{F.cancel}</button>
          <button type="submit" className="btn primary" disabled={sending}>{sending ? F.submitting : F.submit}</button>
        </div>
      </div>
    </form>
  );
}

Object.assign(window, { FeedbackForm, FbField });
