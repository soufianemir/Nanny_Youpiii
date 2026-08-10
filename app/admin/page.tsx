import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  adminAddExistingUserAction,
  adminInviteUserAction,
  adminRemoveMembershipAction,
  adminSuspendUserEverywhereAction,
  adminUpdateChildAction,
  adminUpdateMembershipAction,
  adminUpdateSpaceAction,
} from "./actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration · Nanny Youpiii", robots: { index: false, follow: false } };

type AuthUserRow = { id: string; name: string | null; email: string; membershipCount: number; activeCount: number };
type MembershipRow = { member: typeof s.members.$inferSelect; space: typeof s.careSpaces.$inferSelect };
type AuditRow = { id: string; action: string; created_at: Date; space_name: string; actor_email: string | null };

const roles = [
  ["PARENT_ADMIN", "Parent admin"],
  ["PARENT", "Parent"],
  ["NANNY", "Nounou"],
  ["BABYSITTER", "Baby-sitter"],
  ["CAREGIVER", "Autre intervenant"],
] as const;
const permissionRows = [
  ["children", "Gérer les enfants"],
  ["program", "Planning"],
  ["tasks", "Tâches"],
  ["journal", "Journal / transmissions"],
  ["shopping", "Courses"],
  ["cash", "Caisse"],
] as const;

const initials = (name: string | null, email: string) => (name || email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
const roleLabel = (role: string) => roles.find(([value]) => value === role)?.[1] || role;
const adminUrl = (values: { q?: string; user?: string; space?: string }) => `/admin?${new URLSearchParams(Object.entries(values).filter(([, value]) => Boolean(value)) as [string, string][]).toString()}`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requirePlatformAdmin();
  const params = await searchParams;
  const search = (params.q || "").trim().slice(0, 100);

  const userResult = await pool.query<AuthUserRow>(
    `select u.id, u.name, u.email,
            count(m.id)::int as "membershipCount",
            count(m.id) filter (where m.status = 'ACTIVE')::int as "activeCount"
       from neon_auth."user" u
       left join members m on m.user_id = u.id
      where ($1 = '' or lower(coalesce(u.name,'')) like lower('%' || $1 || '%') or lower(u.email) like lower('%' || $1 || '%'))
      group by u.id, u.name, u.email
      order by lower(coalesce(nullif(u.name,''),u.email))
      limit 100`,
    [search],
  );
  const users = userResult.rows;
  const spaces = await db.select().from(s.careSpaces).orderBy(asc(s.careSpaces.name));
  const allChildren = spaces.length
    ? await db.select().from(s.children).where(inArray(s.children.careSpaceId, spaces.map((space) => space.id))).orderBy(asc(s.children.firstName))
    : [];

  const selectedUserId = params.user && users.some((user) => user.id === params.user) ? params.user : undefined;
  const selectedSpaceId = params.space && spaces.some((space) => space.id === params.space) ? params.space : undefined;
  const selectedUser = selectedUserId
    ? (await pool.query<{ id: string; name: string | null; email: string }>('select id,name,email from neon_auth."user" where id=$1 limit 1', [selectedUserId])).rows[0]
    : undefined;
  const memberships: MembershipRow[] = selectedUserId
    ? await db.select({ member: s.members, space: s.careSpaces }).from(s.members).innerJoin(s.careSpaces, eq(s.members.careSpaceId, s.careSpaces.id)).where(eq(s.members.userId, selectedUserId)).orderBy(asc(s.careSpaces.name))
    : [];
  const memberIds = memberships.map(({ member }) => member.id);
  const memberChildLinks = memberIds.length ? await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId, memberIds)) : [];

  const selectedSpace = selectedSpaceId ? spaces.find((space) => space.id === selectedSpaceId) : undefined;
  const selectedSpaceChildren = selectedSpace ? allChildren.filter((child) => child.careSpaceId === selectedSpace.id) : [];
  const selectedSpaceMembers = selectedSpace ? await db.select({ id: s.members.id }).from(s.members).where(eq(s.members.careSpaceId, selectedSpace.id)) : [];

  const [authCountResult, auditResult] = await Promise.all([
    pool.query<{ count: number }>('select count(*)::int as count from neon_auth."user"'),
    pool.query<AuditRow>(`select a.id, a.action, a.created_at, c.name as space_name, u.email as actor_email
      from activity_logs a join care_spaces c on c.id=a.care_space_id
      left join neon_auth."user" u on u.id=a.actor_user_id
      where a.action like 'PLATFORM_ADMIN_%' order by a.created_at desc limit 30`),
  ]);
  const activeMemberships = (await db.select({ id: s.members.id }).from(s.members).where(eq(s.members.status, "ACTIVE"))).length;
  const suspendedMemberships = (await db.select({ id: s.members.id }).from(s.members).where(eq(s.members.status, "SUSPENDED"))).length;

  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <div className={styles.brand}><span className={styles.logo}>Y</span><span><strong>Nanny Youpiii Admin</strong><small>Support plateforme · {session.user.email}</small></span></div>
      <Link className={styles.back} href="/app">Retour à l’application</Link>
    </div></header>

    <main className={styles.main}>
      <section className={styles.hero}><div><span className={styles.eyebrow}>Back-office privé</span><h1>Administration</h1><p>Corrigez les accès et les données de support sans exposer ces outils aux familles. Les mutations sensibles sont contrôlées côté serveur et journalisées.</p></div></section>

      <section className={styles.stats}>
        <div className={styles.stat}><strong>{authCountResult.rows[0]?.count || 0}</strong><span>comptes Auth</span></div>
        <div className={styles.stat}><strong>{spaces.length}</strong><span>familles / espaces</span></div>
        <div className={styles.stat}><strong>{activeMemberships}</strong><span>accès actifs</span></div>
        <div className={styles.stat}><strong>{suspendedMemberships}</strong><span>accès suspendus</span></div>
      </section>

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.sectionTitle}><h2>Utilisateurs</h2><small>{users.length} affiché(s)</small></div>
          <form className={styles.search}><input className={styles.input} name="q" defaultValue={search} placeholder="Nom ou e-mail"/><button className={styles.buttonPrimary}>Rechercher</button></form>
          <div className={styles.userList}>{users.length ? users.map((user) => <Link key={user.id} href={adminUrl({ q: search, user: user.id, space: selectedSpaceId })} className={`${styles.userRow} ${selectedUserId === user.id ? styles.userActive : ""}`}>
            <span className={styles.avatar}>{initials(user.name, user.email)}</span><span className={styles.userCopy}><strong>{user.name || "Sans nom"}</strong><small>{user.email}</small></span><span className={user.activeCount ? styles.badgeOk : styles.badgeWarn}>{user.membershipCount} accès</span>
          </Link>) : <div className={styles.empty}>Aucun utilisateur trouvé.</div>}</div>
        </section>

        <div className={styles.stack}>
          {selectedUser ? <section className={styles.card}>
            <div className={styles.profileHead}><span className={styles.avatar}>{initials(selectedUser.name, selectedUser.email)}</span><div><h2>{selectedUser.name || "Sans nom"}</h2><p>{selectedUser.email}</p></div></div>
            <div className={styles.actions}><form action={adminSuspendUserEverywhereAction}><input type="hidden" name="userId" value={selectedUser.id}/><button className={styles.buttonDanger}>Suspendre tous ses accès</button></form></div>
            <p className={styles.notice}>La suspension bloque les espaces sans effacer l’historique. Votre propre compte et le dernier Parent Admin d’une famille sont protégés.</p>
          </section> : <section className={styles.card}><div className={styles.empty}>Sélectionnez un utilisateur pour corriger ses accès.</div></section>}

          {memberships.map(({ member, space }) => {
            const children = allChildren.filter((child) => child.careSpaceId === space.id);
            const assigned = new Set(memberChildLinks.filter((link) => link.memberId === member.id).map((link) => link.childId));
            return <section className={styles.membership} key={member.id}>
              <div className={styles.membershipHead}><div><strong>{space.name}</strong><small>{roleLabel(member.role)} · {member.status === "ACTIVE" ? "actif" : "suspendu"}</small></div><span className={member.status === "ACTIVE" ? styles.badgeOk : styles.badgeWarn}>{member.status}</span></div>
              <form action={adminUpdateMembershipAction} className={styles.form}><input type="hidden" name="memberId" value={member.id}/>
                <div className={styles.formRow}><div className={styles.field}><label>Rôle</label><select className={styles.select} name="role" defaultValue={member.role}>{roles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><div className={styles.field}><label>État</label><select className={styles.select} name="status" defaultValue={member.status}><option value="ACTIVE">Actif</option><option value="SUSPENDED">Suspendu</option></select></div></div>
                <div className={styles.field}><label>Libellé</label><input className={styles.input} name="label" defaultValue={member.label || ""} placeholder="Nounou journée, baby-sitter soir…"/></div>
                <div className={styles.field}><label>Enfants accessibles</label><div className={styles.checks}>{children.map((child) => <label className={styles.check} key={child.id}><input name="childIds" value={child.id} type="checkbox" defaultChecked={assigned.has(child.id)}/>{child.firstName}</label>)}</div></div>
                <div className={styles.field}><label>Permissions</label><div className={styles.checks}>{permissionRows.map(([key, label]) => <label className={styles.check} key={key}><input name={key} type="checkbox" defaultChecked={member.role === "PARENT_ADMIN" || member.permissions?.[key] !== false}/>{label}</label>)}</div></div>
                <button className={styles.buttonPrimary}>Enregistrer</button>
              </form>
              <div className={styles.dangerZone}><form action={adminRemoveMembershipAction}><input type="hidden" name="memberId" value={member.id}/><button className={styles.buttonDanger}>Retirer de cette famille</button></form><p className={styles.muted}>Si un historique financier existe, la suppression est refusée : suspendez l’accès pour préserver l’audit.</p></div>
            </section>;
          })}
        </div>
      </div>

      <div className={`${styles.layout} ${styles.spaced}`}>
        <section className={styles.card}><div className={styles.sectionTitle}><h2>Familles</h2><small>{spaces.length}</small></div><div className={styles.spaceList}>{spaces.map((space) => {
          const childCount = allChildren.filter((child) => child.careSpaceId === space.id).length;
          return <Link className={styles.spaceRow} key={space.id} href={adminUrl({ q: search, user: selectedUserId, space: space.id })}><span><strong>{space.name}</strong><small>{childCount} enfant(s)</small></span><span className={styles.badge}>{selectedSpaceId === space.id ? "Ouvert" : "Gérer"}</span></Link>;
        })}</div></section>

        <div className={styles.stack}>{selectedSpace ? <>
          <section className={styles.card}><div className={styles.sectionTitle}><h2>Support famille · {selectedSpace.name}</h2><small>{selectedSpaceMembers.length} membre(s)</small></div><form className={styles.form} action={adminUpdateSpaceAction}><input type="hidden" name="spaceId" value={selectedSpace.id}/><div className={styles.formRow}><div className={styles.field}><label>Nom</label><input className={styles.input} name="name" defaultValue={selectedSpace.name}/></div><div className={styles.field}><label>Fuseau horaire</label><input className={styles.input} name="timezone" defaultValue={selectedSpace.timezone}/></div></div><button className={styles.button}>Corriger la famille</button></form></section>

          <section className={styles.card}><div className={styles.sectionTitle}><h2>Enfants</h2><small>Correction support</small></div><div className={styles.stack}>{selectedSpaceChildren.map((child) => <form action={adminUpdateChildAction} className={styles.membership} key={child.id}><input type="hidden" name="childId" value={child.id}/><div className={styles.formRow}><div className={styles.field}><label>Prénom</label><input className={styles.input} name="firstName" defaultValue={child.firstName}/></div><div className={styles.field}><label>Date de naissance</label><input className={styles.input} type="date" name="birthDate" defaultValue={child.birthDate || ""}/></div></div><div className={styles.field}><label>Notes</label><textarea className={styles.textarea} name="notes" defaultValue={child.notes || ""}/></div><button className={styles.button}>Enregistrer {child.firstName}</button></form>)}</div></section>

          <section className={styles.card}><div className={styles.sectionTitle}><h2>Ajouter ou inviter</h2><small>{selectedSpace.name}</small></div><form className={styles.form}>
            <input type="hidden" name="spaceId" value={selectedSpace.id}/><div className={styles.field}><label>E-mail</label><input className={styles.input} type="email" name="email" required placeholder="utilisateur@exemple.fr"/></div>
            <div className={styles.field}><label>Rôle</label><select className={styles.select} name="role" defaultValue="NANNY">{roles.filter(([value]) => value !== "PARENT_ADMIN").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className={styles.field}><label>Enfants accessibles</label><div className={styles.checks}>{selectedSpaceChildren.map((child) => <label className={styles.check} key={child.id}><input type="checkbox" name="childIds" value={child.id}/>{child.firstName}</label>)}</div></div>
            <div className={styles.field}><label>Permissions</label><div className={styles.checks}>{permissionRows.map(([key, label]) => <label className={styles.check} key={key}><input type="checkbox" name={key} defaultChecked={key !== "children"}/>{label}</label>)}</div></div>
            <div className={styles.actions}><button className={styles.buttonPrimary} formAction={adminAddExistingUserAction}>Ajouter un compte existant</button><button className={styles.button} formAction={adminInviteUserAction}>Inviter par e-mail</button></div>
            <p className={styles.muted}>« Ajouter » cible un compte déjà inscrit. « Inviter » envoie l’invitation Neon Auth puis applique ces droits à l’acceptation.</p>
          </form></section>
        </> : <section className={styles.card}><div className={styles.empty}>Choisissez une famille pour corriger ses enfants ou ajouter un utilisateur.</div></section>}</div>
      </div>

      <section className={`${styles.card} ${styles.spaced}`}><div className={styles.sectionTitle}><h2>Journal d’administration</h2><small>30 dernières actions</small></div><div className={styles.audit}>{auditResult.rows.length ? auditResult.rows.map((row) => <div className={styles.auditRow} key={row.id}><strong>{row.action.replaceAll("_", " ")}</strong><small>{row.space_name} · {row.actor_email || "admin"} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created_at))}</small></div>) : <div className={styles.empty}>Aucune action d’administration pour le moment.</div>}</div></section>
    </main>
  </div>;
}
