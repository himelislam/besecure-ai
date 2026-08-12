import { useState } from "react";
import { useNavigate } from "react-router";
import { FiEye, FiEyeOff, FiShield } from "react-icons/fi";
import { useAuthStore } from "../../stores/authStore";
import { changePassword } from "../../services/authService";
import { getApiError } from "../../lib/apiResponse";

export default function SecuritySettings() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // No backing API for these — they're not wired to anything (no
  // 2FA/login-alert endpoints exist), left as inert local UI state.
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwords.current || !passwords.newPassword || !passwords.confirm) {
      setError("Fill in your current password and the new password twice.");
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setError("New passwords do not match.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.newPassword,
      });

      // Changing the password already clears this session's refresh
      // cookie server-side, so there's no session left to keep alive —
      // just clear local auth state (no need to also call the logout
      // endpoint) and send the user back to sign in.
      clearAuth();
      navigate("/signin", {
        replace: true,
        state: { message: "Password changed. Please log in again." },
      });
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsSaving(false);
    }
  };

  const PasswordInput = ({
    label,
    name,
    value,
    show,
    setShow,
  }) => (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            <FiEyeOff className="h-5 w-5" />
          ) : (
            <FiEye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Password */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <FiShield />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Security Settings
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Keep your account protected.
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <PasswordInput
            label="Current Password"
            name="current"
            value={passwords.current}
            show={showCurrent}
            setShow={setShowCurrent}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <PasswordInput
              label="New Password"
              name="newPassword"
              value={passwords.newPassword}
              show={showNew}
              setShow={setShowNew}
            />

            <PasswordInput
              label="Confirm Password"
              name="confirm"
              value={passwords.confirm}
              show={showConfirm}
              setShow={setShowConfirm}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password requirements
            </p>

            <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <li>• At least 8 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One number</li>
              <li>• One special character</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Two-Factor Authentication
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Add another layer of security to your account.
                </p>
              </div>

              <input
                type="checkbox"
                checked={twoFactor}
                onChange={(e) => setTwoFactor(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Login Alerts
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Receive an email when a new login is detected.
                </p>
              </div>

              <input
                type="checkbox"
                checked={loginAlerts}
                onChange={(e) => setLoginAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSaving ? "Updating..." : "Update Security"}
          </button>
        </div>
      </div>
    </form>
  );
}