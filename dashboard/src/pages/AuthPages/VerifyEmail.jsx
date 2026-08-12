import PageMeta from "../../components/common/PageMeta";
import VerifyEmailForm from "../../components/auth/VerifyEmailForm";

export default function VerifyEmail() {
  return (
    <>
      <PageMeta
        title="Verify Email | SecureSphere"
        description="Verify your SecureSphere account email address."
      />

      <VerifyEmailForm />
    </>
  );
}