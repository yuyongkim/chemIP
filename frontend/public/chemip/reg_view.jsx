// 최상위 화면 "규제 목록"(?view=reg, 목록 하나는 &list=<id>) 셸 — 고른 목록 상태·주소 맞추기·배치만.
// 목록 전체 reg_index.jsx, 목록 하나 reg_list_detail.jsx, 최근 변경 reg_changes_panel.jsx. 자료 훅 api_reg.jsx.

function RegView() {
  const L = REG_LABELS;
  const [listId, setListId] = useState(() => regReadListParam(typeof location !== "undefined" ? location.search : ""));
  const lists = useRegLists();
  const changes = useRegChanges();
  const meta = (lists.data?.lists || []).find(m => m.id === listId) || null;

  useEffect(() => { try { history.replaceState(history.state, "", regUrlWith(location.href, listId)); } catch (e) {} }, [listId]);
  useEffect(() => () => { try { history.replaceState(history.state, "", regUrlWith(location.href, null)); } catch (e) {} }, []);
  const open = (id) => { setListId(id); try { window.scrollTo(0, 0); } catch (e) {} };

  return (
    <div className="reg-page">
      <SectionHeading t={{ ko: REG_LABELS_KO.title, en: REG_LABELS_KO.titleEn }} meta={lists.loading ? L.loading : ""} />
      {!listId && <p className="muted reg-intro">{L.intro} <a href="?view=law">{L.lawLink}</a></p>}
      <div className="reg-layout">
        <div className="reg-main">
          {listId ? <RegListDetail key={listId} id={listId} meta={meta} onBack={() => open("")} />
            : lists.error || (!lists.loading && !lists.data) ? <EmptyState card>{L.unavailable}</EmptyState>
            : lists.data ? <RegIndex data={lists.data} onOpen={open} /> : null}
        </div>
        {changes.data && <RegChangesPanel changes={changes.data} lists={lists.data?.lists} onOpen={open} />}
      </div>
    </div>
  );
}

Object.assign(window, { RegView });
