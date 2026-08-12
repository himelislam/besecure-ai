import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";

import UserMetaCard from "../../components/UserProfile/UserMetaCard";
import UserInfoCard from "../../components/UserProfile/UserInfoCard";
import SecuritySettings from "../../components/settings/SecuritySettings";
import NotificationSettings from "../../components/settings/NotificationSettings";
import DangerZone from "../../components/settings/DangerZone";

import {
  FiUser,
  FiShield,
  FiBell,
  FiAlertTriangle,
} from "react-icons/fi";

const tabs = [
  {
    id: "profile",
    label: "Profile",
    icon: FiUser,
  },
  {
    id: "security",
    label: "Security",
    icon: FiShield,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: FiBell,
  },
  {
    id: "danger",
    label: "Danger Zone",
    icon: FiAlertTriangle,
  },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <UserMetaCard />
            <UserInfoCard />
          </div>
        );

      case "security":
        return <SecuritySettings />;

      case "notifications":
        return <NotificationSettings />;

      case "danger":
        return <DangerZone />;

      default:
        return (
          <div className="space-y-6">
            <UserMetaCard />
            <UserInfoCard />
          </div>
        );
    }
  };

  return (
    <>
      <PageMeta
        title="Settings | SecureSphere"
        description="Manage your SecureSphere account, security and integrations."
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account, security preferences and integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                        active
                          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />

                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-9">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}