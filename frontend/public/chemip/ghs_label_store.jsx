// 경고표지 공급자 정보 기억 — 이 브라우저의 localStorage("chemip-ghs-supplier")에만. 서버로 보내지 않는다.

const GHS_SUPPLIER_KEY = "chemip-ghs-supplier";
const GHS_SUPPLIER_EMPTY = { name: "", address: "", phone: "", emergency: "" };

function ghsLoadSupplier() {
  try {
    const v = JSON.parse(localStorage.getItem(GHS_SUPPLIER_KEY) || "null");
    return { ...GHS_SUPPLIER_EMPTY, ...(v && typeof v === "object" ? v : {}) };
  } catch (e) {
    return { ...GHS_SUPPLIER_EMPTY };
  }
}

function useGhsSupplier() {
  const [supplier, setSupplier] = React.useState(ghsLoadSupplier);
  const update = (next) => {
    setSupplier(next);
    try { localStorage.setItem(GHS_SUPPLIER_KEY, JSON.stringify(next)); } catch (e) {}
  };
  return [supplier, update];
}

Object.assign(window, { GHS_SUPPLIER_EMPTY, ghsLoadSupplier, useGhsSupplier });
