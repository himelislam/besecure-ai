import { OWASP_CATEGORIES, SEVERITY_RANK, SEVERITY_LABELS } from "../../lib/vulnerabilityRules";

const SEVERITY_BADGE = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
  info: "bg-gray-100 text-gray-600",
};

function buildRows(stats, sampleVulnerabilities) {
  const byOwasp = stats.byOwasp || {};

  return Object.entries(OWASP_CATEGORIES).map(([code, category]) => {
    const inCategory = sampleVulnerabilities.filter((v) => v.owaspCategory === code);

    const highestSeverity = inCategory.reduce((worst, v) => {
      if (!worst) return v.severity;
      return SEVERITY_RANK[v.severity] < SEVERITY_RANK[worst] ? v.severity : worst;
    }, null);

    return {
      id: code,
      category,
      severity: highestSeverity,
      affected: new Set(inCategory.map((v) => v.websiteId)).size,
      findings: byOwasp[code] || 0,
    };
  });
}

export default function OWASPTable({ stats, sampleVulnerabilities }) {
  const rows = buildRows(stats, sampleVulnerabilities);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

      <div className="border-b border-gray-200 px-6 py-5">

        <h2 className="text-lg font-semibold">
          OWASP Top 10 Categories
        </h2>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>

              <th className="px-6 py-4 text-left">ID</th>

              <th className="px-6 py-4 text-left">Category</th>

              <th className="px-6 py-4 text-left">Severity</th>

              <th className="px-6 py-4 text-left">Affected Websites</th>

              <th className="px-6 py-4 text-left">Findings</th>

            </tr>

          </thead>

          <tbody>

            {rows.map((row) => (

              <tr
                key={row.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="px-6 py-4 font-semibold">
                  {row.id}
                </td>

                <td className="px-6 py-4">
                  {row.category}
                </td>

                <td className="px-6 py-4">
                  {row.severity ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${SEVERITY_BADGE[row.severity]}`}
                    >
                      {SEVERITY_LABELS[row.severity]}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {row.affected}
                </td>

                <td className="px-6 py-4 font-semibold">
                  {row.findings}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
