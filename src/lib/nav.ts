import {
  LayoutDashboard, FileText, Code2, BookOpen, Network, FolderGit2, Mic, CalendarCheck,
  BarChart3, Layers, Settings, type LucideIcon,
} from "lucide-react";

/**
 * `available: false` modules render as non-interactive items labelled with their build phase,
 * so the UI never offers a button that does nothing.
 */
export type NavItem = { href: string; label: string; icon: LucideIcon; available: boolean; phase?: number };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "/resume", label: "Resume intelligence", icon: FileText, available: true },
  { href: "/dsa", label: "DSA academy", icon: Code2, available: false, phase: 3 },
  { href: "/fundamentals", label: "CS fundamentals", icon: BookOpen, available: false, phase: 4 },
  { href: "/system-design", label: "System design lab", icon: Network, available: false, phase: 5 },
  { href: "/projects", label: "Project deep-dive", icon: FolderGit2, available: false, phase: 6 },
  { href: "/interview", label: "Mock interviews", icon: Mic, available: true },
  { href: "/planner", label: "Study planner", icon: CalendarCheck, available: false, phase: 8 },
  { href: "/analytics", label: "Analytics", icon: BarChart3, available: false, phase: 8 },
  { href: "/revision", label: "Revision", icon: Layers, available: false, phase: 8 },
  { href: "/settings", label: "Settings", icon: Settings, available: true },
];
