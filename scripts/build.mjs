import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit", env: process.env });

if (process.env.DATABASE_URL) {
  console.log("Nanny Youpiii: preparing database schema…");
  run("npx auth@latest migrate --yes");
  run("npx drizzle-kit push");
} else {
  console.log("Nanny Youpiii: DATABASE_URL absent — build UI only, database setup skipped.");
}

run("npx next build");
