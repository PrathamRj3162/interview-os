import {
  LayoutDashboard, FileText, Code2, BookOpen, Network, FolderGit2, Mic, CalendarCheck,
  Trophy, Layers, Settings, Building2, type LucideIcon,
} from "lucide-react";

/**
 * `available: false` modules render as non-interactive items labelled with their build phase,
 * so the UI never offers a button that does nothing.
 */
export type NavItem = { href: string; label: string; icon: LucideIcon; available: boolean; phase?: number };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "/resume", label: "Resume intelligence", icon: FileText, available: true },
  { href: "/dsa", label: "DSA academy", icon: Code2, available: true },
  { href: "/fundamentals", label: "CS fundamentals", icon: BookOpen, available: true },
  { href: "/system-design", label: "System design lab", icon: Network, available: true },
  { href: "/projects", label: "Project deep-dive", icon: FolderGit2, available: true },
  { href: "/interview", label: "Mock interviews", icon: Mic, available: true },
  { href: "/companies", label: "Company styles", icon: Building2, available: true },
  { href: "/planner", label: "Study planner", icon: CalendarCheck, available: true },
  { href: "/progress", label: "Progress & XP", icon: Trophy, available: true },
  { href: "/revision", label: "Revision", icon: Layers, available: true },
  { href: "/settings", label: "Settings", icon: Settings, available: true },
];
