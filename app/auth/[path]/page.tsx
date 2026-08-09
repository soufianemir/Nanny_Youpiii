import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { CredentialsSignIn, CredentialsSignUp } from "@/components/credential-auth-flow";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const content = path === authViewPaths.SIGN_UP
    ? <CredentialsSignUp />
    : path === authViewPaths.SIGN_IN
      ? <CredentialsSignIn />
      : <AuthView path={path} />;

  return (
    <main className="authwrap">
      <div className="authcard auth-managed">
        <div className="logo">Y!</div>
        <h1>Nanny Youpiii</h1>
        {content}
      </div>
    </main>
  );
}
