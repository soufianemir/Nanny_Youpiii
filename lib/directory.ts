import { pool } from "@/db";

export type DirectoryUser = { id: string; name: string; email: string };

export async function usersByIds(ids: string[]) {
  if (!ids.length) return new Map<string, DirectoryUser>();
  const result = await pool.query<DirectoryUser>(
    'select id, name, email from neon_auth."user" where id = ANY($1)',
    [ids],
  );
  return new Map(result.rows.map((user) => [user.id, user]));
}
