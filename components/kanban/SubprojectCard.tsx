"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MoreHorizontal, Edit, Trash, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    name: string;
    avatarUrl: string | null;
}

interface Subproject {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    assignedUsers: User[];
    _count?: { tasks: number };
}

interface SubprojectCardProps {
    subproject: Subproject;
    onClick: () => void;
}

export function SubprojectCard({ subproject, onClick }: SubprojectCardProps) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:translate-y-[-4px] hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer flex flex-col gap-4 active:scale-[0.98]"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-base leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate">
                        {subproject.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {subproject.description || "No description provided."}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest pt-3 border-t border-slate-50 dark:border-slate-800">
                    <Calendar className="h-3 w-3 text-indigo-400" />
                    <span>
                        {subproject.startDate ? new Date(subproject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                        <span className="mx-1.5 opacity-30">→</span>
                        {subproject.endDate ? new Date(subproject.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {subproject.assignedUsers.map(user => (
                            <div 
                                key={user.id} 
                                className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-50 transition-all"
                                title={user.name}
                            >
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-500">{user.name.charAt(0)}</span>
                                )}
                            </div>
                        ))}
                        {subproject.assignedUsers.length === 0 && (
                            <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
                                <Users className="h-3 w-3 text-slate-300" />
                            </div>
                        )}
                    </div>
                    
                    {subproject._count && subproject._count.tasks > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-tighter border border-slate-100 dark:border-slate-700">
                            {subproject._count.tasks} Tasks
                        </div>
                    )}
                </div>
            </div>
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full">
                    <ChevronRight className="h-3 w-3" />
                 </div>
            </div>
        </div>
    );
}
