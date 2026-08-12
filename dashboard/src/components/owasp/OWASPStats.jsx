import {
  FiShield,
  FiAlertTriangle,
  FiActivity,
  FiCheckCircle,
} from "react-icons/fi";
import { OWASP_CATEGORIES } from "../../lib/vulnerabilityRules";

export default function OWASPStats({ stats, sampleVulnerabilities }) {
  const detectedRisks = Object.values(stats.byOwasp || {}).reduce((sum, n) => sum + n, 0);
  const resolved = (stats.byStatus?.fixed || 0) + (stats.byStatus?.closed || 0) + (stats.byStatus?.verified || 0);
  const affectedWebsites = new Set(sampleVulnerabilities.map((v) => v.websiteId)).size;

  const items = [
    {
      title: "OWASP Categories",
      value: String(Object.keys(OWASP_CATEGORIES).length),
      color: "blue",
      icon: FiShield,
    },
    {
      title: "Detected Risks",
      value: String(detectedRisks),
      color: "red",
      icon: FiAlertTriangle,
    },
    {
      title: "Affected Websites",
      value: String(affectedWebsites),
      color: "orange",
      icon: FiActivity,
    },
    {
      title: "Resolved",
      value: String(resolved),
      color: "green",
      icon: FiCheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  {item.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-gray-800">
                  {item.value}
                </h2>
              </div>

              <div
                className={`rounded-xl p-3 bg-${item.color}-100 text-${item.color}-600`}
              >
                <Icon size={22} />
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
