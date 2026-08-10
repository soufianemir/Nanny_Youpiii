import type { SVGProps } from "react";

export type IconName =
  | "sun" | "calendar" | "journal" | "menu" | "plus" | "check" | "chevronLeft" | "chevronRight"
  | "child" | "people" | "shopping" | "wallet" | "settings" | "clock" | "alert" | "ban" | "headphones"
  | "school" | "meal" | "park" | "bath" | "bag" | "moon" | "home" | "task" | "note" | "handover"
  | "activity" | "close" | "eye" | "more" | "pill" | "heart";

const paths: Record<IconName, React.ReactNode> = {
  sun: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  journal: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 3v-15.5Z"/><path d="M8 8h9M8 12h7"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  chevronLeft: <><path d="m15 18-6-6 6-6"/></>,
  chevronRight: <><path d="m9 18 6-6-6-6"/></>,
  child: <><circle cx="12" cy="8" r="4"/><path d="M5 21c.7-4.5 3-7 7-7s6.3 2.5 7 7"/></>,
  people: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 15c3.5-.2 5.5 1.5 6 5"/></>,
  shopping: <><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  wallet: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M16 10h5v4h-5a2 2 0 0 1 0-4Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
  headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></>,
  school: <><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 13v5h10v-5M21 10v6"/></>,
  meal: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c4 2 4 8 0 10"/></>,
  park: <><path d="M12 3 7 11h3l-4 6h5v4M12 3l5 8h-3l4 6h-5v4"/></>,
  bath: <><path d="M4 11h16v3a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6v-3ZM7 11V6a3 3 0 0 1 6 0"/></>,
  bag: <><rect x="5" y="8" width="14" height="12" rx="3"/><path d="M9 8V6a3 3 0 0 1 6 0v2M5 13h14"/></>,
  moon: <><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></>,
  home: <><path d="m3 11 9-8 9 8v9H6v-9"/><path d="M10 20v-6h4v6"/></>,
  task: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></>,
  note: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  handover: <><path d="M7 7h11l-3-3M17 17H6l3 3"/><path d="m18 7-3 3M6 17l3-3"/></>,
  activity: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  pill: <><path d="m8 16 8-8a4 4 0 1 1 5.7 5.7l-8 8A4 4 0 0 1 8 16Z"/><path d="m12 12 5.7 5.7"/></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></>,
};

export function Icon({name,size=20,...props}:{name:IconName;size?:number}&SVGProps<SVGSVGElement>){
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
