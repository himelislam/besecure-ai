import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | SecureSphere"
        description="Sign in to your SecureSphere security dashboard."
      />

      <SignInForm />
    </>
  );
}