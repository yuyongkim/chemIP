// 경고표지 입력 · 공급자 정보(회사명·주소·전화·긴급 연락처). 값은 useGhsSupplier 가 이 브라우저에만 기억한다.

const GHS_SUPPLIER_FIELDS = [
  { k: "name", label: "supplierName" },
  { k: "phone", label: "supplierPhone", phone: true },
  { k: "address", label: "supplierAddress", wide: true },
  { k: "emergency", label: "emergency", phone: true },
];

function GhsSupplierFields({ supplier, onChange }) {
  const F = GHS_LABELS.form;
  return (
    <fieldset className="gl-fieldset">
      <legend className="calc-label">{F.supplier}</legend>
      <div className="calc-fields">
        {GHS_SUPPLIER_FIELDS.map(f => (
          <div key={f.k} className={`calc-field${f.wide ? " gl-field-wide" : ""}`}>
            <label className="calc-label" htmlFor={`gl-sup-${f.k}`}>{F[f.label]}</label>
            <input id={`gl-sup-${f.k}`} className="calc-input" type={f.phone ? "tel" : "text"} autoComplete="off"
              placeholder={f.phone ? F.placeholderPhone : ""}
              value={supplier[f.k] || ""} onChange={e => onChange({ ...supplier, [f.k]: e.target.value })} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

Object.assign(window, { GhsSupplierFields, GHS_SUPPLIER_FIELDS });
