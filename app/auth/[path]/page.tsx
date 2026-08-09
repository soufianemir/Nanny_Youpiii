import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return (
    <main className="authwrap">
      <div className="authcard auth-managed">
        <div className="logo">Y!</div>
        <h1>Nanny Youpiii</h1>
        <AuthView path={path} />
      </div>
    </main>
  );
}
