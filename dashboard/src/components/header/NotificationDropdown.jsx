import { useState } from "react";
import Dropdown from "../ui/dropdown/Dropdown";
import { Link } from "react-router";
import { IoMdNotificationsOutline } from "react-icons/io";

// No notification backend exists yet (see pages/Notifications/Notifications.jsx)
// — this used to show fabricated template demo content (fake names, fake
// "requests permission to change Project" messages) with a fake unread dot,
// unrelated to security notifications entirely. Left as an honest empty
// state until there's a real endpoint to back it.
export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <IoMdNotificationsOutline className="w-30 h-20 p-2" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[100px] mt-[17px] flex w-[280px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
        </div>

        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Notifications aren't available yet — this feature needs backend work.
        </p>

        <Link
          to="/notifications"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-1 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
