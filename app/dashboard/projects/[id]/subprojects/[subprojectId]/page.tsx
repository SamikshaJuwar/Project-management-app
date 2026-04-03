"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, Kanban, ChevronRight, Calendar,
    Users, MoreHorizontal, Edit, Trash, 
    Loader2, ArrowLeft, MoreVertical, GripVertical,
    CheckCircle2, Clock, ListTodo, Tag, User as UserIcon,
    AlertCircle, MessageSquare, Heart, Repeat, Flag
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
import { createPortal } from "react-dom";

/* ─── Types ─────────────────────────────────────────────────────── */

type User = { id: string; name: string; avatarUrl: string | null };

type Project = { id: string; name: string };

type Subproject = {
    id: string;
    name: string;
    projectId: string;
    project: Project;
};

type Task = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    subprojectId: string;
    assigneeId: string | null;
    assignee: User | null;
    labels: string[];
    dueDate: string | null;
    createdAt: string;
    commentsCount?: number;
    likesCount?: number;
    repostsCount?: number;
    milestone?: {
        id: string;
        title: string;
    } | null;
};

/* ─── Constants ──────────────────────────────────────────────────── */

const TASK_COLUMNS = [
    { key: "To Do", label: "To Do", color: "bg-slate-50 border-slate-200", accent: "bg-slate-400", icon: ListTodo },
    { key: "In Progress", label: "In Progress", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500", icon: Clock },
    { key: "Done", label: "Done", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", icon: CheckCircle2 },
];

/* ─── TaskHoverInteraction ───────────────────────────────────────── */

function TaskHoverInteraction({ task, anchorEl }: { task: Task; anchorEl: HTMLElement | null }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                top: rect.top - 12,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999
            }}
            className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-300 border-b-4 border-b-indigo-500"
        >
            <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45" />

            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Metrics</p>
                <Badge variant="outline" className="text-[8px] font-bold uppercase py-0 px-1.5 opacity-60">Live</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1.5">
                    <Heart className="h-4 w-4 text-rose-500 fill-rose-50" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{task.likesCount || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-sky-500 fill-sky-50" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{task.commentsCount || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                    <Repeat className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{task.repostsCount || 0}</span>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                 <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Target: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Floating"}
                    </span>
                 </div>
            </div>
        </div>,
        document.body
    );
}

/* ─── TaskCard ────────────────────────────────────────────────── */

function TaskCard({ task, onEdit, onDelete, onStatusChange }: any) {
    const [hovered, setHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<any>(null);

    const handleEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setHovered(true);
    };

    const handleLeave = () => {
        timeoutRef.current = setTimeout(() => setHovered(false), 100);
    };

    return (
        <div 
            ref={cardRef}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("task_id", task.id);
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-300 cursor-grab active:cursor-grabbing flex flex-col gap-4 relative overflow-hidden"
        >
            {/* Status accent top bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1",
                task.status === "Done" ? "bg-emerald-500" :
                task.status === "In Progress" ? "bg-indigo-500" :
                "bg-slate-300"
            )} />

            <div className="flex justify-between items-start gap-4">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-snug uppercase tracking-tight line-clamp-2 pr-2">
                    {task.title}
                </h3>
                <Popover>
                    <PopoverTrigger className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1 rounded-2xl shadow-2xl border-none">
                        <Button variant="ghost" className="w-full justify-start rounded-xl text-xs font-bold gap-2" size="sm" onClick={() => onEdit(task)}>
                            <Edit className="h-3.5 w-3.5" /> Edit Task
                        </Button>
                        <Button variant="ghost" className="w-full justify-start rounded-xl text-xs font-bold gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50" size="sm" onClick={() => onDelete(task.id)}>
                            <Trash className="h-3.5 w-3.5" /> Delete
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>

            {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {task.description}
                </p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                {task.labels.map((l: string) => (
                    <Badge key={l} variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-2 h-5 rounded-lg text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-colors">
                        {l}
                    </Badge>
                ))}
                {task.milestone && (
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-amber-100 bg-amber-50/50 text-amber-600 px-2 h-5 rounded-lg flex items-center gap-1 shadow-sm">
                        <Flag className="h-2 w-2 fill-amber-500" /> {task.milestone.title}
                    </Badge>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    {task.assignee ? (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-800 shadow-inner">
                            <div className="h-5 w-5 rounded-full overflow-hidden border border-white dark:border-slate-900 bg-slate-200">
                                {task.assignee.avatarUrl ? (
                                    <img src={task.assignee.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-black flex items-center justify-center h-full uppercase">{task.assignee.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 max-w-[60px] truncate uppercase tracking-tighter">
                                {task.assignee.name.split(' ')[0]}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-full border border-dashed border-slate-200 dark:border-slate-800 italic opacity-40">
                             <UserIcon className="h-3 w-3" />
                             <span className="text-[9px] font-bold">Unassigned</span>
                        </div>
                    )}
                </div>

                {task.dueDate && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full shadow-sm",
                        new Date(task.dueDate) < new Date() && task.status !== "Done" ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-white text-indigo-500 border border-indigo-50 shadow-inner"
                    )}>
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                )}
            </div>

            {hovered && <TaskHoverInteraction task={task} anchorEl={cardRef.current} />}
        </div>
    );
}

/* ─── KanbanColumn ───────────────────────────────────────────────── */

function KanbanColumn({ status, tasks, onAddNew, onStatusChange, onEditTask, onDeleteTask }: any) {
    const [isOver, setIsOver] = useState(false);

    return (
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsOver(false);
                const taskId = e.dataTransfer.getData("task_id");
                if (taskId) onStatusChange(taskId, status.key);
            }}
            className={cn(
                "flex flex-col gap-6 w-96 shrink-0 p-6 rounded-[40px] border-2 transition-all duration-500",
                status.color,
                "dark:bg-slate-900/30 dark:border-slate-800",
                isOver && "ring-8 ring-indigo-400/20 scale-[1.02] shadow-2xl"
            )}
        >
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-2xl shadow-lg", status.accent)}>
                        <status.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em] text-xs">
                            {status.label}
                        </h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Strategic Stream</p>
                    </div>
                    <span className="ml-2 bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-500 shadow-md border border-slate-100 animate-in zoom-in duration-300">
                        {tasks.length}
                    </span>
                </div>
                <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => onAddNew(status.key)}
                    className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 text-indigo-500 shadow-md border border-slate-100 transition-all hover:-translate-y-1 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-[500px]">
                {tasks.map((task: Task) => (
                    <div 
                        key={task.id} 
                        className="transform transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2"
                        // Handle drag events on the container
                    >
                        <TaskCard 
                            task={task} 
                            onEdit={onEditTask} 
                            onDelete={onDeleteTask} 
                            onStatusChange={onStatusChange} 
                        />
                    </div>
                ))}
                
                {tasks.length === 0 && (
                     <div className="flex-1 rounded-[30px] border-4 border-dashed border-slate-200/40 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 bg-white/30 backdrop-blur-sm">
                        <div className="h-16 w-16 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-inner">
                            <Plus className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-widest">Zone Empty</p>
                            <p className="text-[9px] font-bold uppercase tracking-tighter">Allocate tasks here</p>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function SubprojectTaskBoard() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const subprojectId = params.subprojectId as string;

    const [subproject, setSubproject] = useState<Subproject | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [openDialog, setOpenDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "To Do",
        assigneeId: "",
        labels: "",
        dueDate: ""
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [subRes, taskRes, userRes] = await Promise.all([
                fetch(`/api/subprojects/${subprojectId}`).then(r => r.json()),
                fetch(`/api/tasks?subprojectId=${subprojectId}`).then(r => r.json()),
                fetch(`/api/team`).then(r => r.json())
            ]);

            setSubproject(subRes);
            setTasks(taskRes);
            setUsers(userRes);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load workspace data");
        } finally {
            setLoading(false);
        }
    }, [subprojectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveTask = async () => {
        console.log("Saving task with data:", formData);
        setSaving(true);
        try {
            const method = editTaskId ? "PATCH" : "POST";
            const url = editTaskId ? `/api/tasks/${editTaskId}` : "/api/tasks";
            
            const payload = {
                ...formData,
                subprojectId,
                labels: formData.labels.split(',').map(l => l.trim()).filter(l => l),
                assigneeId: formData.assigneeId === "null" ? null : (formData.assigneeId || null),
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(editTaskId ? "Strategy updated" : "Objective initialized");
                setOpenDialog(false);
                fetchData();
                setFormData({ title: "", description: "", status: "To Do", assigneeId: "", labels: "", dueDate: "" });
                setEditTaskId(null);
            } else {
                const err = await res.json();
                toast.error(err.error || "Execution failed");
            }
        } catch (error) {
            toast.error("Connectivity issue");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                setTasks(originalTasks);
                toast.error("Transmission error");
            }
        } catch (error) {
            setTasks(originalTasks);
            toast.error("Network sync lost");
        }
    };

    const handleOpenEdit = (task: Task) => {
        setFormData({
            title: task.title,
            description: task.description || "",
            status: task.status,
            assigneeId: task.assigneeId || "null",
            labels: task.labels.join(', '),
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""
        });
        setEditTaskId(task.id);
        setOpenDialog(true);
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Terminate objective?")) return;
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Objective terminated");
                fetchData();
            }
        } catch (error) {
            toast.error("Deletion failed");
        }
    };

    if (loading) return (
        <div className="p-8 flex flex-col items-center justify-center h-screen bg-slate-50/50 gap-6">
             <div className="relative h-20 w-20">
                <div className="h-full w-full border-8 border-indigo-100 rounded-full" />
                <div className="absolute top-0 left-0 h-full w-full border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
             </div>
             <div className="text-center">
                <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-xs">Accessing Tactical Module</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1 animate-pulse">Syncing data streams...</p>
             </div>
        </div>
    );

    return (
        <div className="p-8 pb-16 min-h-screen bg-slate-50/30">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-12 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
                <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/dashboard/projects")}
                    className="hover:text-indigo-600 border-none transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm"
                >
                    Projects
                </Button>
                <ChevronRight className="h-3 w-3" />
                <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                    className="hover:text-indigo-600 border-none transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm"
                >
                    {subproject?.project?.name}
                </Button>
                <ChevronRight className="h-3 w-3" />
                <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-indigo-100">
                    {subproject?.name}
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-16">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-6">
                        <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 shadow-xl rounded-3xl group transition-all"
                        >
                            <ArrowLeft className="h-6 w-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </Button>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                                Action Board
                            </h1>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-[10px] font-black uppercase bg-white border-2 border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-2xl shadow-sm">
                                    Tactical Module
                                </Badge>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">•</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Subproject: {subproject?.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => {
                        setFormData({ title: "", description: "", status: "To Do", assigneeId: "null", labels: "", dueDate: "" });
                        setEditTaskId(null);
                        setOpenDialog(true);
                    }}
                    size="lg"
                    className="rounded-[30px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl hover:translate-y-[-4px] transition-all font-black uppercase tracking-widest text-[10px] h-14 px-8 border-b-4 border-indigo-800"
                >
                    <Plus className="mr-2 h-6 w-6" /> Initialize Objective
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-10 overflow-x-auto pb-10 pt-4 px-1 no-scrollbar animate-in fade-in zoom-in-95 duration-700">
                {TASK_COLUMNS.map(col => (
                    <KanbanColumn 
                        key={col.key}
                        status={col}
                        tasks={tasks.filter(t => t.status === col.key)}
                        onAddNew={(status: string) => {
                            setFormData({ title: "", description: "", status, assigneeId: "null", labels: "", dueDate: "" });
                            setEditTaskId(null);
                            setOpenDialog(true);
                        }}
                        onStatusChange={handleStatusChange}
                        onEditTask={handleOpenEdit}
                        onDeleteTask={handleDeleteTask}
                    />
                ))}
            </div>

            {/* Task Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-xl rounded-[40px] p-10 border-none shadow-3xl bg-white/95 backdrop-blur-md">
                    <DialogHeader className="mb-8 border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="h-2 w-12 bg-indigo-600 rounded-full" />
                             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Protocol Delta</span>
                        </div>
                        <DialogTitle className="text-4xl font-black text-slate-900 uppercase tracking-tight">
                            {editTaskId ? "Edit Objective" : "New Objective"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 gap-8 py-4">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Objective Title</label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Primary identifier..."
                                className="h-14 rounded-3xl border-2 border-slate-100 focus:border-indigo-400 focus:ring-0 bg-white font-bold text-lg px-6"
                            />
                        </div>
                        <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Contextual Data</label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Operational details..."
                                className="min-h-[100px] rounded-3xl border-2 border-slate-100 focus:border-indigo-400 focus:ring-0 bg-white font-medium p-6 no-scrollbar"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Assignee</label>
                                <Select
                                    value={formData.assigneeId}
                                    onValueChange={val => setFormData({ ...formData, assigneeId: val })}
                                >
                                    <SelectTrigger className="h-14 rounded-3xl border-2 border-slate-100 bg-white font-bold px-6">
                                        <SelectValue placeholder="Resource" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                        <SelectItem value="null" className="rounded-xl font-bold italic text-slate-400">Floating</SelectItem>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id} className="rounded-xl font-bold">
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Deadline</label>
                                <Input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="h-14 rounded-3xl border-2 border-slate-100 bg-white font-bold px-6"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Strategic Labels</label>
                            <div className="relative">
                                <Input
                                    value={formData.labels}
                                    onChange={e => setFormData({ ...formData, labels: e.target.value })}
                                    placeholder="alpha, beta, core..."
                                    className="h-14 rounded-3xl border-2 border-slate-100 focus:border-indigo-400 focus:ring-0 bg-white font-bold px-12"
                                />
                                <Tag className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-12 flex gap-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => setOpenDialog(false)} 
                            disabled={saving} 
                            className="rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] h-14 flex-1 hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100"
                        >
                            Abort
                        </Button>
                        <Button 
                            onClick={handleSaveTask} 
                            disabled={!formData.title || saving} 
                            className="rounded-[30px] bg-indigo-600 hover:bg-indigo-700 text-white flex-[2] font-black uppercase tracking-[0.2em] text-[10px] h-14 shadow-2xl shadow-indigo-200 transition-all hover:translate-y-[-4px] active:scale-95 border-b-4 border-indigo-800"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : null}
                            {editTaskId ? "Commit Sync" : "Deploy Objective"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
