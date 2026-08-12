import { useState } from "react";
import { Link } from "react-router";
import {
  FiMenu,
  FiX,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Security", href: "#security" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <FiShield className="text-xl" />
          </div>

          <div>
            <span className="block text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              SecureSphere
            </span>

            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:block">
              AI Security Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-gray-600 transition hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            to="/signin"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand-500 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Login
          </Link>

          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            Get Started
            <FiArrowRight />
          </Link>
        </div>

        {/* Mobile Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 sm:hidden"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <FiX className="text-xl" />
          ) : (
            <FiMenu className="text-xl" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-5 dark:border-gray-800 dark:bg-gray-950 sm:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand-500 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}

            <div className="mt-3 flex gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Link
                to="/signin"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white"
              >
                Get Started
                <FiArrowRight />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}