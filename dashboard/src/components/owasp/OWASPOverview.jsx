import { OWASP_CATEGORIES } from "../../lib/vulnerabilityRules";

const BAR_COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-blue-500"];

export default function OWASPOverview({ stats }) {
  const byOwasp = stats.byOwasp || {};
  const totalFindings = Object.values(byOwasp).reduce((sum, n) => sum + n, 0);

  const rows = Object.entries(byOwasp)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([code, count], i) => ({
      name: OWASP_CATEGORIES[code] || code,
      // % of this account's total categorized findings that fall in this
      // category — not a severity/risk score, just a real proportion.
      percent: totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">

      <h2 className="mb-6 text-lg font-semibold">
        Overall Risk Distribution
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No categorized findings yet.</p>
      ) : (
        <div className="space-y-5">

          {rows.map((item) => (

            <div key={item.name}>

              <div className="mb-2 flex justify-between text-sm">

                <span>{item.name}</span>

                <span>{item.percent}%</span>

              </div>

              <div className="h-3 rounded-full bg-gray-200">

                <div
                  className={`${item.color} h-3 rounded-full`}
                  style={{ width: `${item.percent}%` }}
                />

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}
