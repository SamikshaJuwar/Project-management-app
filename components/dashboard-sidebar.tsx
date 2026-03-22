"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FolderKanban,
    Flag,
    CircleDot,
    Users,
    Github,
    Settings,
    LogOut,
    Menu,
    X,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

type SidebarProps = {
    user: {
        name?: string | null;
        email?: string | null;
        role?: string;
        avatarUrl?: string | null;
    };
    isSuperadmin: boolean;
    githubConnected: boolean;
};

export function DashboardSidebar({ user, isSuperadmin, githubConnected }: SidebarProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Milestones", href: "/dashboard/milestones", icon: Flag },
        { name: "Issues", href: "/dashboard/issues", icon: CircleDot },
        ...(isSuperadmin ? [{ name: "Team", href: "/dashboard/team", icon: Users }] : []),
        { name: "Repositories", href: "/dashboard/repos", icon: Github },
        {
            name: "Settings",
            href: "/dashboard/settings",
            icon: Settings,
            warning: !githubConnected && isSuperadmin
        },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 border-r border-slate-800">
            {/* Logo */}
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">PerfTrack</span>
                </Link>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 space-y-1 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                                isActive
                                    ? "bg-indigo-600/10 text-indigo-400 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {item.name}

                            {item.warning && (
                                <div className="absolute right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-slate-900" />
                            )}

                            {isActive && (
                                <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-2 mb-4">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full border border-slate-700" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name || "User"}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-700 text-slate-400 bg-slate-900/50">
                            {user.role}
                        </Badge>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10 gap-3 px-3"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Nav Header */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-white border-b border-slate-200">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <LayoutDashboard className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-900">PerfTrack</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                    <Menu className="w-6 h-6 text-slate-600" />
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-72 max-w-[80%] z-50 animate-in slide-in-from-left duration-300">
                        <SidebarContent />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col z-30">
                <SidebarContent />
            </div>
        </>
    );
}
