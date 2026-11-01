// API · AI 요약(POST /api/ai/analyze). run() 을 부를 때만 요청한다.

function useAIAnalysis(chemId, chemicalName) {
  const [state, setState] = React.useState({ data: null, loading: false, error: null });
  const run = React.useCallback(() => {
    if (!chemId || !chemicalName) return;
    setState({ data: null, loading: true, error: null });
    apiPost(`/ai/analyze`, { chemId, chemicalName })
      .then(d => setState({ data: d, loading: false, error: null }))
      .catch(e => setState({ data: null, loading: false, error: String(e.message || e) }));
  }, [chemId, chemicalName]);
  return { ...state, run };
}

Object.assign(window, { useAIAnalysis });
