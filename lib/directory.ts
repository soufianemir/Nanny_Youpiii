import { pool } from "@/db";
export type DirectoryUser={id:string;name:string;email:string;firstName?:string;lastName?:string};
export async function usersByIds(ids:string[]){
  if(!ids.length) return new Map<string,DirectoryUser>();
  const r=await pool.query<DirectoryUser>('select id, name, email, "firstName", "lastName" from "user" where id = ANY($1)',[ids]);
  return new Map(r.rows.map(u=>[u.id,u]));
}
