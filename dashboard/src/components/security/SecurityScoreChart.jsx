import Chart from "react-apexcharts";
import { FiTrendingUp } from "react-icons/fi";

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

// scoreHistory[] is already sorted oldest-first per website by the backend
// (last 10 completed scans each) — no client-side re-sort needed. Each
// website becomes its own series, plotted by real scan date rather than a
// shared category axis, since different sites scan on different days.
export default function SecurityScoreChart({ scoreHistory }) {
  const hasData = scoreHistory.some((site) => site.history.length > 0);

  const series = scoreHistory
    .filter((site) => site.history.length > 0)
    .map((site) => ({
      name: site.nickname,
      data: site.history.map((point) => [new Date(point.date).getTime(), point.score]),
    }));

  const options = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },

    colors: COLORS,

    stroke: {
      curve: "smooth",
      width: 3,
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.02,
      },
    },

    dataLabels: { enabled: false },

    markers: {
      size: 0,
      hover: { size: 5 },
    },

    grid: {
      borderColor: "#EEF2F6",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },

    xaxis: {
      type: "datetime",
      axisBorder: { show: false },
      axisTicks: { show: false },
    },

    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: { formatter: (value) => `${value}` },
    },

    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "left",
    },

    tooltip: {
      x: { format: "MMM d, yyyy" },
      y: { formatter: (value) => `${value}/100` },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Security Score Trend
        </h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Score from each website's last 10 completed scans.
        </p>
      </div>

      {hasData ? (
        <div className="mt-6 max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[600px] xl:min-w-full">
            <Chart options={options} series={series} type="area" height={300} />
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FiTrendingUp className="text-3xl text-gray-300" />
          <p className="text-sm text-gray-500">
            No completed scans yet — run a scan to start tracking your score.
          </p>
        </div>
      )}
    </div>
  );
}
