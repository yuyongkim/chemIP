// Minimal path router: routes are {method, path: "/api/x/:param", handler}. First match wins.

function compile(path) {
  const names = [];
  const src = path
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        names.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { re: new RegExp(`^${src}$`), names };
}

export function buildTable(groups) {
  return groups.flat().map((r) => ({ ...r, ...compile(r.path) }));
}

export function match(table, method, pathname) {
  for (const r of table) {
    if (r.method !== method) continue;
    const m = r.re.exec(pathname);
    if (!m) continue;
    const params = {};
    r.names.forEach((n, i) => {
      params[n] = decodeURIComponent(m[i + 1]);
    });
    return { route: r, params };
  }
  return null;
}
