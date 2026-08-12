import PageMeta from "../../components/common/PageMeta";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Reset Password | SecureSphere"
        description="Create a new password for your SecureSphere account."
      />

      <ResetPasswordForm />
    </>
  );
}