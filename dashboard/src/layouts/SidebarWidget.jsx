import React from 'react';
import { useNavigate } from 'react-router';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

const SidebarWidget = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear local state regardless of whether the network call itself
    // succeeds — see useAuth.logout() (same pattern as UserDropdown).
    await logout();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="mt-auto mb-5">
      <button
        onClick={handleLogout}
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
