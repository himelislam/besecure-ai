import PageMeta from "../../components/common/PageMeta";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <>
      <PageMeta
        title="Forgot Password | SecureSphere"
        description="Reset your SecureSphere account password."
      />

      <ForgotPasswordForm />
    </>
  );
}