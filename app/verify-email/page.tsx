import { EmailVerification } from "@/components/credential-auth-flow";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="authwrap">
      <div className="authcard">
        <div className="logo">Y!</div>
        <h1>Nanny Youpiii</h1>
        <EmailVerification initialEmail={email} />
      </div>
    </main>
  );
}
