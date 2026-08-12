import PageMeta from "../../components/common/PageMeta";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Create Account | SecureSphere"
        description="Create your SecureSphere security intelligence account."
      />

      <SignUpForm />
    </>
  );
}