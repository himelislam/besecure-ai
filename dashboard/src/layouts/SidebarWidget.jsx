import React from 'react';
import { FiLogOut } from 'react-icons/fi';

const SidebarWidget = () => {
  return (
    <div className="mt-auto mb-5">
      <button
        className="w-full flex items-center justify-center gap-2 border border-black text-black py-2 px-4 hover:bg-brand-500 hover:text-white transition-colors duration-300 rounded-lg hover:border-none"
        type="button"
      >
        <FiLogOut size={20} />
        Logout
      </button>
    </div>
  );
};

export default SidebarWidget;
