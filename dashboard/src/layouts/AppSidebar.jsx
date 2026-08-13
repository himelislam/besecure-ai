import { useCallback } from "react";
import { Link, useLocation } from "react-router";

import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCreditCard,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiMap,
  FiMessageCircle,
  FiMoreHorizontal,
  FiSettings,
  FiShield,
  FiUser,
  FiClock,
} from "react-icons/fi";

import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

/* =========================================================
   MAIN NAVIGATION
========================================================= */

const navItems = [
  {
    icon: <FiGrid />,
    name: "Overview",
    path: "/dashboard",
  },
  {
    icon: <FiGlobe />,
    name: "My Websites",
    path: "/websites",
  },
  {
    icon: <FiActivity />,
    name: "Security Scans",
    path: "/scans",
  },
];

/* =========================================================
   SECURITY
========================================================= */

const securityItems = [
  {
    icon: <FiAlertTriangle />,
    name: "Vulnerabilities",
    path: "/vulnerabilities",
  },
  {
    icon: <FiShield />,
    name: "OWASP Top 10",
    path: "/owasp",
  },
  {
    icon: <FiMap />,
    name: "Security Roadmap",
    path: "/roadmap",
  },
  {
    icon: <FiMessageCircle />,
    name: "AI Security Assistant",
    path: "/ai-assistant",
  },
];

/* =========================================================
   ANALYTICS
========================================================= */

const analyticsItems = [
  {
    icon: <FiBarChart2 />,
    name: "Security Analytics",
    path: "/analytics",
  },
  {
    icon: <FiClock />,
    name: "Scan History",
    path: "/scan-history",
  },
];

/* =========================================================
   REPORTS
========================================================= */

const reportItems = [
  {
    icon: <FiFileText />,
    name: "Security Reports",
    path: "/reports",
  },
];
/* =========================================================
   ACCOUNT
========================================================= */

const accountItems = [
  {
    icon: <FiCreditCard />,
    name: "Subscription",
    path: "/subscription",
  },
  {
    icon: <FiUser />,
    name: "Profile",
    path: "/profile",
  },
  {
    icon: <FiSettings />,
    name: "Settings",
    path: "/settings",
  },
];

/* =========================================================
   APP SIDEBAR
========================================================= */

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  const location = useLocation();

  const isActive = useCallback(
    (path) => location.pathname === path,
    [location.pathname],
  );

  /* =========================================================
     RENDER MENU ITEMS
  ========================================================= */

  const renderMenuItems = (items) => {
    return (
      <ul className="flex flex-col gap-1.5">
        {items.map((nav) => {
          const active = isActive(nav.path);

          return (
            <li key={nav.name}>
              <Link
                to={nav.path}
                className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"
                  } ${!isExpanded && !isHovered && !isMobileOpen
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>

                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  /* =========================================================
     SECTION TITLE
  ========================================================= */

  const renderSectionTitle = (title) => {
    return (
      <h2
        className={`mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${!isExpanded && !isHovered && !isMobileOpen ? "lg:text-center" : ""
          }`}
      >
        {isExpanded || isHovered || isMobileOpen ? (
          title
        ) : (
          <FiMoreHorizontal className="mx-auto size-5" />
        )}
      </h2>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 shadow-md transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-white

        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }

        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}

        lg:translate-x-0
      `}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* =====================================================
          LOGO
      ====================================================== */}

      <div
        className={`flex h-[88px] shrink-0 items-center border-b border-gray-100 dark:border-gray-800 ${!isExpanded && !isHovered && !isMobileOpen
          ? "justify-center"
          : "justify-start"
          }`}
      >
        <Link to="/dashboard" className="block">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              {/* Shield Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/20">
                <FiShield className="h-6 w-6 text-cyan-500" />
              </div>

              {/* Brand */}
              <div>
                <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Secure
                  <span className="text-cyan-500">Sphere</span>
                </div>

                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-gray-400">
                  Security Intelligence
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/20">
              <FiShield className="h-6 w-6 text-cyan-500" />
            </div>
          )}
        </Link>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto py-6 pr-1">
        <nav className="flex flex-col gap-7">
          {/* =================================================
              MAIN
          ================================================== */}

          <section>
            {renderSectionTitle("Main")}

            {renderMenuItems(navItems)}
          </section>

          {/* =================================================
              SECURITY
          ================================================== */}

          <section>
            {renderSectionTitle("Security")}

            {renderMenuItems(securityItems)}
          </section>

          {/* =================================================
              ANALYTICS
          ================================================== */}

          <section>
            {renderSectionTitle("Analytics")}

            {renderMenuItems(analyticsItems)}
          </section>

          {/* =================================================
              REPORTS
          ================================================== */}

          <section>
            {renderSectionTitle("Reports")}

            {renderMenuItems(reportItems)}
          </section>
          {/* =================================================
              ACCOUNT
          ================================================== */}

          <section>
            {renderSectionTitle("Account")}

            {renderMenuItems(accountItems)}
          </section>
        </nav>

        {/* ===================================================
            SIDEBAR WIDGET
        ==================================================== */}

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="mt-8">
            <SidebarWidget />
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
