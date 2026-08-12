import { Outlet } from "react-router";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      <Outlet />
    </div>
  );
};

export default AuthLayout;