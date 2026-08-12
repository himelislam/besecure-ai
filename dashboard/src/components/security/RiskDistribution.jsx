import Chart from "react-apexcharts";
import { FiPieChart } from "react-icons/fi";

// riskDistribution only counts status:'open' vulnerabilities — assigned/
// in_progress/etc. are excluded, so this total can legitimately differ from
// the Vulnerabilities page's totals. Not a bug.
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

const RISK_META = {
  critical: { label: "Critical", color: "#ef4444", dot: "bg-red-500" },
  high: { label: "High", color: "#f97316", dot: "bg-orange-500" },
  medium: { label: "Medium", color: "#f59e0b", dot: "bg-amber-500" },
  low: { label: "Low", color: "#10b981", dot: "bg-emerald-500" },
  info: { label: "Info", color: "#6b7280", dot: "bg-gray-500" },
};

export default function RiskDistribution({ riskDistribution }) {
  const risks = SEVERITY_ORDER.map((key) => ({
    key,
    count: riskDistribution[key] || 0,
    ...RISK_META[key],
  }));

  const total = risks.reduce((sum, r) => sum + r.count, 0);

  const series = risks.map((r) => r.count);

  const options = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },

    labels: risks.map((r) => r.label),
    colors: risks.map((r) => r.color),

    legend: { show: false },

    stroke: {
      width: 4,
      colors: ["#fff"],
    },

    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            name: { show: true, fontSize: "13px", color: "#6B7280", offsetY: -8 },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: 700,
              color: "#111827",
              offsetY: 8,
              formatter: (value) => value,
            },
            total: {
              show: true,
              label: "Open Issues",
              color: "#6B7280",
              formatter: () => String(total),
            },
          },
        },
      },
    },

    dataLabels: { enabled: false },

    responsive: [{ breakpoint: 480, options: { chart: { height: 280 } } }],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Risk Distribution
        </h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Open vulnerabilities grouped by severity.
        </p>
      </div>

      {total > 0 ? (
        <>
          <div className="mt-4 flex justify-center">
            <Chart options={options} series={series} type="donut" height={250} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-4">
            {risks.map((risk) => (
              <div
                key={risk.key}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${risk.dot}`} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {risk.label}
                  </span>
                </div>

                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                  {risk.count}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FiPieChart className="text-3xl text-gray-300" />
          <p className="text-sm text-gray-500">No open vulnerabilities.</p>
        </div>
      )}
    </div>
  );
}
