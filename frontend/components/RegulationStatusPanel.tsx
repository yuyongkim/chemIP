interface SectionContent {
  [key: string]: string;
}

interface Section {
  section_seq: number;
  section_name: string;
  content: SectionContent[];
}

interface RegulationStatusPanelProps {
  sections: Section[];
}

export default function RegulationStatusPanel({ sections }: RegulationStatusPanelProps) {
  const section15 = sections.find((s) => s.section_seq === 15);
  const items = section15?.content ?? [];

  const visibleRows = items
    .map((item) => ({
      name: item.msdsItemNameKor || '',
      value: item.itemDetail || '',
    }))
    .filter((row) => row.name && row.value && row.value !== '자료없음' && row.value !== 'No data');

  if (!section15 || visibleRows.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-amber-900 mb-3">Regulatory Status (MSDS Section 15)</h2>
      <div className="text-xs text-amber-700 mb-3">
        The following is based on the original KOSHA MSDS Section 15 content.
      </div>
      <div className="overflow-auto max-h-80 bg-white rounded-lg border border-amber-100">
        <table className="w-full text-sm">
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={`${row.name}-${idx}`} className="border-b border-gray-100 last:border-0">
                <td className="w-1/2 px-4 py-2 font-semibold text-gray-900">{row.name}</td>
                <td className="px-4 py-2 text-gray-700">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
