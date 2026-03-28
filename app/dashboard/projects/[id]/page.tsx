"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, LayoutGrid, Kanban, ChevronRight, Calendar,
    Users, MoreHorizontal, Edit, Trash, LayoutList,
    Loader2, ArrowLeft, MoreVertical, GripVertical
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────── */

type User = { id: string; name: string; avatarUrl: string | null };

type Project = {
    id: string;
    name: string;
    description: string;
    startDate?: string;
    endDate?: string;
    status: string;
};

type Subproject = {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    projectId: string;
    assignedUsers: User[];
    _count?: { tasks: number };
};

/* ─── Constants ──────────────────────────────────────────────────── */

const STATUS_COLUMNS = [
    { key: "Planned", label: "Planned", color: "bg-slate-50 border-slate-200", accent: "bg-slate-400" },
    { key: "In Progress", label: "In Progress", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
    { key: "Completed", label: "Completed", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
];

/* ─── SubprojectCard ──────────────────────────────────────────────── */

function SubprojectCard({ subproject, onClick }: { subproject: Subproject; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer flex flex-col gap-4"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                        {subproject.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {subproject.description || "No description provided."}
                    </p>
                </div>
                <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                    subproject.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    subproject.status === "In Progress" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                    "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                    {subproject.status}
                </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                        {subproject.startDate ? new Date(subproject.startDate).toLocaleDateString() : "TBD"} - {subproject.endDate ? new Date(subproject.endDate).toLocaleDateString() : "TBD"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <Users className="h-3.5 w-3.5" />
                    <span>{subproject.assignedUsers.length} Users</span>
                </div>
            </div>

            <div className="flex -space-x-2 mt-1">
                {subproject.assignedUsers.map(user => (
                    <div 
                        key={user.id} 
                        className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 flex items-center justify-center overflow-hidden"
                        title={user.name}
                    >
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-[10px] font-bold">{user.name.charAt(0)}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── KanbanColumn ───────────────────────────────────────────────── */

function KanbanColumn({ status, subprojects, onCardClick, onStatusChange }: any) {
    const [isOver, setIsOver] = useState(false);

    const onDragOver = (e: any) => {
        e.preventDefault();
        setIsOver(true);
    };

    const onDragLeave = () => setIsOver(false);

    const onDrop = (e: any) => {
        e.preventDefault();
        setIsOver(false);
        const subprojectId = e.dataTransfer.getData("subproject_id");
        if (subprojectId) {
            onStatusChange(subprojectId, status.key);
        }
    };

    return (
        <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
                "flex flex-col gap-4 w-80 shrink-0 p-4 rounded-3xl border transition-all duration-300",
                status.color,
                isOver && "ring-4 ring-indigo-400 ring-offset-4 ring-offset-slate-50 scale-[1.01]"
            )}
        >
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full shadow-sm", status.accent)} />
                    <h3 className="font-extrabold text-slate-700 uppercase tracking-widest text-xs">
                        {status.label}
                    </h3>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100">
                        {subprojects.length}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-4 min-h-[400px]">
                {subprojects.map((sp: Subproject) => (
                    <div 
                        key={sp.id} 
                        draggable 
                        onDragStart={(e) => {
                            e.dataTransfer.setData("subproject_id", sp.id);
                        }}
                        className="cursor-grab active:cursor-grabbing transform transition-transform active:scale-95"
                    >
                        <SubprojectCard subproject={sp} onClick={() => onCardClick(sp)} />
                    </div>
                ))}
                {subprojects.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-slate-200/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                         <div className="p-3 bg-white/50 rounded-full">
                            <Plus className="h-5 w-5" />
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-widest">Drop here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [subprojects, setSubprojects] = useState<Subproject[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"grid" | "kanban">("grid");

    const [openDialog, setOpenDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "Planned",
        assignedUserIds: [] as string[]
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [projRes, subRes, userRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`).then(r => r.json()),
                fetch(`/api/subprojects?projectId=${projectId}`).then(r => r.json()),
                fetch(`/api/team`).then(r => r.json())
            ]);

            setProject(projRes);
            setSubprojects(subRes);
            setUsers(userRes);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load project details");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateSubproject = async () => {
        console.log("Creating subproject with data:", formData);
        setSaving(true);
        try {
            // Validation
            if (formData.startDate && project?.startDate && new Date(formData.startDate) < new Date(project.startDate)) {
                toast.error(`Start date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()})`);
                setSaving(false);
                return;
            }
            if (formData.endDate && project?.endDate && new Date(formData.endDate) > new Date(project.endDate)) {
                toast.error(`End date cannot be after project end date (${new Date(project.endDate).toLocaleDateString()})`);
                setSaving(false);
                return;
            }

            const res = await fetch("/api/subprojects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, projectId }),
            });

            if (res.ok) {
                toast.success("Subproject created successfully");
                setOpenDialog(false);
                fetchData();
                setFormData({ name: "", description: "", startDate: "", endDate: "", status: "Planned", assignedUserIds: [] });
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create subproject");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const originalSubprojects = [...subprojects];
        setSubprojects(prev => prev.map(sp => sp.id === id ? { ...sp, status: newStatus } : sp));

        try {
            const res = await fetch(`/api/subprojects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                setSubprojects(originalSubprojects);
                toast.error("Failed to update status");
            }
        } catch (error) {
            setSubprojects(originalSubprojects);
            toast.error("Network error");
        }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center h-screen bg-slate-50/50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Workspace...</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 pb-16 min-h-screen bg-slate-50/30">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 overflow-x-auto whitespace-nowrap pb-2">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push("/dashboard/projects")}
                    className="hover:text-indigo-600 border-none transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5"
                >
                    Projects
                </Button>
                <ChevronRight className="h-3 w-3" />
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                    {project?.name || "Loading..."}
                </span>
            </div>

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            {project?.name}
                        </h1>
                        <Badge variant="outline" className="text-[10px] font-black uppercase bg-white border-2 border-slate-200 px-3 py-1 rounded-full text-slate-500">
                             {project?.status}
                        </Badge>
                    </div>
                    <p className="text-slate-500 max-w-2xl text-lg font-medium leading-relaxed">
                        {project?.description || "Master workspace for planning and tracking all milestones, deliverables, and resource allocation."}
                    </p>
                    <div className="flex flex-wrap items-center gap-6 mt-6">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-bold text-slate-700">
                                {project?.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                                <span className="mx-2 text-slate-300">→</span>
                                {project?.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="flex bg-white p-1 rounded-2xl shadow-md border border-slate-100 w-fit self-end">
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => setView("grid")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none",
                                view === "grid" ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" /> Grid
                        </Button>
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => setView("kanban")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none",
                                view === "kanban" ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Kanban className="h-4 w-4" /> Kanban
                        </Button>
                    </div>
                    <Button 
                        onClick={() => setOpenDialog(true)}
                        size="lg"
                        className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:translate-y-[-2px] transition-all font-black uppercase tracking-widest text-xs h-12"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Create Subproject
                    </Button>
                </div>
            </div>

            {/* Display section */}
            <div className="min-h-[500px]">
                {view === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {subprojects.map(sp => (
                            <SubprojectCard 
                                key={sp.id} 
                                subproject={sp} 
                                onClick={() => router.push(`/dashboard/projects/${projectId}/subprojects/${sp.id}`)} 
                            />
                        ))}
                        {subprojects.length === 0 && (
                            <div className="col-span-full h-80 border-4 border-dashed border-slate-200/50 rounded-[40px] flex flex-col items-center justify-center text-slate-300 gap-6 grayscale opacity-60">
                                <div className="p-8 bg-white rounded-full shadow-inner border border-slate-100">
                                    <LayoutGrid className="h-16 w-16" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">No Active Subprojects</h3>
                                    <p className="text-sm font-medium">Create your first strategic initiative to begin tracking.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-8 overflow-x-auto pb-10 pt-2 px-1 animate-in fade-in slide-in-from-right-4 duration-500">
                        {STATUS_COLUMNS.map(col => (
                            <KanbanColumn 
                                key={col.key}
                                status={col}
                                subprojects={subprojects.filter(sp => sp.status === col.key)}
                                onCardClick={(sp: Subproject) => router.push(`/dashboard/projects/${projectId}/subprojects/${sp.id}`)}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Subproject Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                            New Structural Subproject
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                        <div className="col-span-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Initiative Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Frontend Architecture Overhaul"
                                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500 font-bold"
                            />
                        </div>
                        <div className="col-span-full space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Strategic Description</label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Define the primary objectives and success metrics..."
                                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-indigo-500 font-medium leading-relaxed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Deployment Date</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="h-12 rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Target Completion</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="h-12 rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-2 col-span-full">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Resource Allocation</label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/50">
                                {users.map(user => (
                                    <Button
                                        key={user.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const next = formData.assignedUserIds.includes(user.id)
                                                ? formData.assignedUserIds.filter(id => id !== user.id)
                                                : [...formData.assignedUserIds, user.id];
                                            setFormData({ ...formData, assignedUserIds: next });
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shadow-sm h-auto",
                                            formData.assignedUserIds.includes(user.id) 
                                                ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700" 
                                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="h-4 w-4 rounded-full bg-slate-200 overflow-hidden border border-white/20">
                                            {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />}
                                        </div>
                                        {user.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 flex gap-3">
                        <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={saving} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateSubproject} 
                            disabled={!formData.name || saving} 
                            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Initialize Subproject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
