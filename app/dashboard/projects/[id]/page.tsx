"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, ChevronRight, Calendar,
    Users, MoreHorizontal, Edit, Trash,
    Loader2, Settings2, Palette, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { SubprojectCard } from "@/components/kanban/SubprojectCard";

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

type Column = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    accent: string;
    order: number;
    isVisible: boolean;
};

type Subproject = {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    columnId: string | null;
    projectId: string;
    assignedUsers: User[];
    _count?: { tasks: number };
};

/* ─── Constants ──────────────────────────────────────────────────── */

const COLOR_OPTIONS = [
    { label: "Slate", color: "bg-slate-50 border-slate-200", accent: "bg-slate-400" },
    { label: "Indigo", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
    { label: "Emerald", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
    { label: "Amber", color: "bg-amber-50 border-amber-200", accent: "bg-amber-400" },
    { label: "Rose", color: "bg-rose-50 border-rose-200", accent: "bg-rose-500" },
    { label: "Sky", color: "bg-sky-50 border-sky-200", accent: "bg-sky-500" },
    { label: "Violet", color: "bg-violet-50 border-violet-200", accent: "bg-violet-500" },
];

/* ─── Page ───────────────────────────────────────────────────────── */

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [subprojects, setSubprojects] = useState<Subproject[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Subproject Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        columnId: "",
        assignedUserIds: [] as string[]
    });

    // Column Dialog State
    const [openColDialog, setOpenColDialog] = useState(false);
    const [openManageDialog, setOpenManageDialog] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [colFormData, setColFormData] = useState({
        name: "",
        description: "",
        color: COLOR_OPTIONS[0].color,
        accent: COLOR_OPTIONS[0].accent
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [projRes, subRes, colRes, userRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`).then(r => r.json()),
                fetch(`/api/subprojects?projectId=${projectId}`).then(r => r.json()),
                fetch(`/api/projects/${projectId}/columns`).then(r => r.json()),
                fetch(`/api/team`).then(r => r.json())
            ]);

            setProject(projRes);
            setSubprojects(subRes);
            setColumns(colRes);
            setUsers(userRes);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load workspace data");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Subproject Actions ───────────────────────────────────────────

    const handleCreateSubproject = async () => {
        setSaving(true);
        try {
            if (formData.startDate && project?.startDate && new Date(formData.startDate) < new Date(project.startDate)) {
                toast.error("Invalid start date");
                setSaving(false);
                return;
            }

            const res = await fetch("/api/subprojects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, projectId }),
            });

            if (res.ok) {
                toast.success("Subproject initialized");
                setOpenDialog(false);
                fetchData();
                setFormData({ name: "", description: "", startDate: "", endDate: "", columnId: "", assignedUserIds: [] });
            } else {
                const err = await res.json();
                toast.error(err.error || "Creation failed");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleSubprojectMove = async (subprojectId: string, targetColumnId: string) => {
        // Optimistic UI update
        const originalSubprojects = [...subprojects];
        setSubprojects(prev => prev.map(s => s.id === subprojectId ? { ...s, columnId: targetColumnId } : s));

        try {
            const res = await fetch(`/api/subprojects/${subprojectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ columnId: targetColumnId }),
            });

            if (!res.ok) {
                setSubprojects(originalSubprojects);
                toast.error("Failed to move subproject");
            }
        } catch (error) {
            setSubprojects(originalSubprojects);
            toast.error("Network error");
        }
    };

    // ── Column Actions ──────────────────────────────────────────────

    const handleOpenAddColumn = () => {
        setEditingColumn(null);
        setColFormData({ name: "", description: "", color: COLOR_OPTIONS[0].color, accent: COLOR_OPTIONS[0].accent });
        setOpenColDialog(true);
    };

    const handleOpenEditColumn = (column: Column) => {
        setEditingColumn(column);
        setColFormData({ 
            name: column.name, 
            description: column.description || "", 
            color: column.color, 
            accent: column.accent 
        });
        setOpenColDialog(true);
    };

    const handleSaveColumn = async () => {
        setSaving(true);
        try {
            const method = editingColumn ? "PATCH" : "POST";
            const url = editingColumn 
                ? `/api/subprojects/columns/${editingColumn.id}` 
                : `/api/projects/${projectId}/columns`;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...colFormData, order: editingColumn ? editingColumn.order : columns.length }),
            });

            if (res.ok) {
                toast.success(editingColumn ? "Column updated" : "Column added");
                setOpenColDialog(false);
                fetchData();
            } else {
                toast.error("Failed to save column");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleColumnMove = async (columnId: string, newOrder: number) => {
        const next = [...columns];
        const oldIndex = next.findIndex(c => c.id === columnId);
        if (oldIndex === -1) return;

        const [moved] = next.splice(oldIndex, 1);
        next.splice(newOrder, 0, moved);
        
        // Optimistic UI
        const updated = next.map((c, i) => ({ ...c, order: i }));
        setColumns(updated);

        // Update all affected columns' orders in background
        try {
            await Promise.all(updated.map(c => 
                fetch(`/api/subprojects/columns/${c.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order: c.order }),
                })
            ));
        } catch (error) {
            console.error("Order save failure", error);
        }
    };

    const handleDeleteColumn = async (id: string) => {
        if (!confirm("Delete this column? Existing subprojects will be moved.")) return;
        try {
            const res = await fetch(`/api/subprojects/columns/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Column deleted");
                fetchData();
            }
        } catch (error) { toast.error("Delete failed"); }
    };

    const handleHideColumn = async (id: string, isVisible: boolean = false) => {
        try {
            const res = await fetch(`/api/subprojects/columns/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible }),
            });
            if (res.ok) {
                toast.success(isVisible ? "Column unhidden" : "Column hidden");
                fetchData();
            }
        } catch (error) { toast.error("Toggle failed"); }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center h-screen bg-slate-50/50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Synchronizing Workflow...</p>
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
                        {project?.description || "Master workspace for planning and tracking strategic initiatives."}
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

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        onClick={() => setOpenManageDialog(true)}
                        variant="ghost"
                        size="lg"
                        className="rounded-2xl text-slate-400 hover:text-indigo-600 font-black uppercase tracking-widest text-[10px] h-12"
                    >
                        <Eye className="mr-2 h-4 w-4" /> Manage
                    </Button>
                    <Button 
                        onClick={handleOpenAddColumn}
                        variant="outline"
                        size="lg"
                        className="rounded-2xl bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-black uppercase tracking-widest text-[10px] h-12"
                    >
                        <Settings2 className="mr-2 h-4 w-4" /> Add Column
                    </Button>
                    <Button 
                        onClick={() => setOpenDialog(true)}
                        size="lg"
                        className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:translate-y-[-2px] transition-all font-black uppercase tracking-widest text-[10px] h-12"
                    >
                        <Plus className="mr-2 h-5 w-5" /> New Subproject
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="min-h-[600px] -mx-4">
                <KanbanBoard 
                    columns={columns}
                    subprojects={subprojects}
                    onSubprojectMove={handleSubprojectMove}
                    onColumnMove={handleColumnMove}
                    onAddSubproject={(colId) => {
                        setFormData(prev => ({ ...prev, columnId: colId }));
                        setOpenDialog(true);
                    }}
                    onEditColumn={handleOpenEditColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onHideColumn={handleHideColumn}
                    renderCard={(sp) => (
                        <SubprojectCard 
                            subproject={sp} 
                            onClick={() => router.push(`/dashboard/projects/${projectId}/subprojects/${sp.id}`)} 
                        />
                    )}
                />
            </div>

            {/* Create/Edit Subproject Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                            Structural Subproject
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                        <div className="col-span-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Initiative Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Frontend Architecture"
                                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500 font-bold"
                            />
                        </div>
                        <div className="col-span-full space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Strategic Description</label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Define objectives..."
                                className="min-h-[100px] rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Start Date</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Target End</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="h-12 rounded-xl"
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
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border h-auto",
                                            formData.assignedUserIds.includes(user.id) 
                                                ? "bg-indigo-600 text-white border-indigo-500" 
                                                : "bg-white text-slate-600 border-slate-200"
                                        )}
                                    >
                                        <div className="h-4 w-4 rounded-full bg-slate-200 overflow-hidden">
                                            {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />}
                                        </div>
                                        {user.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 flex gap-3">
                        <Button variant="ghost" onClick={() => setOpenDialog(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateSubproject} 
                            disabled={!formData.name || saving} 
                            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] font-black uppercase tracking-widest text-[10px] h-12"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Initialize
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Column Dialog */}
            <Dialog open={openColDialog} onOpenChange={setOpenColDialog}>
                <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {editingColumn ? "Configure Column" : "New Strategy Column"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Column Label</label>
                            <Input
                                value={colFormData.name}
                                onChange={e => setColFormData({ ...colFormData, name: e.target.value })}
                                placeholder="e.g. Backlog, Testing"
                                className="h-12 rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Theme Color</label>
                             <div className="grid grid-cols-4 gap-3">
                                {COLOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={() => setColFormData({ ...colFormData, color: opt.color, accent: opt.accent })}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                                            colFormData.accent === opt.accent ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 bg-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className={cn("h-4 w-4 rounded-full", opt.accent)} />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{opt.label}</span>
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8">
                        <Button 
                            onClick={handleSaveColumn} 
                            disabled={!colFormData.name || saving} 
                            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] h-12"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Palette className="h-4 w-4 mr-2" />}
                            Apply Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Columns Dialog */}
            <Dialog open={openManageDialog} onOpenChange={setOpenManageDialog}>
                <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            Manage Columns
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Visibility & Order</p>
                        <div className="flex flex-col gap-2">
                            {columns.sort((a,b) => a.order - b.order).map(col => (
                                <div 
                                    key={col.id} 
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-2xl border transition-all",
                                        col.isVisible ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50 border-dashed border-slate-200 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-3 w-3 rounded-full", col.accent)} />
                                        <span className="text-xs font-bold text-slate-700">{col.name}</span>
                                        {!col.isVisible && <Badge variant="outline" className="text-[8px] uppercase h-4 px-1">Hidden</Badge>}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleHideColumn(col.id, !col.isVisible)}
                                        className={cn(
                                            "h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                            col.isVisible ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" : "text-indigo-600 hover:bg-indigo-50"
                                        )}
                                    >
                                        {col.isVisible ? <><EyeOff className="h-3 w-3 mr-1.5" /> Hide</> : <><Eye className="h-3 w-3 mr-1.5" /> Unhide</>}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="mt-8">
                        <Button 
                            onClick={() => setOpenManageDialog(false)} 
                            className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-12"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
