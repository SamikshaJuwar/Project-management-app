"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Trash, Edit, Plus, ExternalLink, Filter, Loader2, Flag,
    MoreHorizontal, Layers, AlertCircle, GripVertical, ChevronLeft, ChevronRight, EyeOff, FolderKanban
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
import { Skeleton } from "@/components/ui/skeleton";

type Project = {
    id: string;
    name: string;
    repoOwner?: string;
    repoName?: string;
};

type Subproject = {
    id: string;
    name: string;
    projectId: string;
};

type Milestone = {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    githubMilestoneNumber: number | null;
    state: string;
    projectId: string;
    project: {
        name: string;
        repoOwner: string | null;
        repoName: string | null;
    };
    openIssues: number;
    closedIssues: number;
    createdAt: string;
};

type Column = { key: string; label: string; color: string; accent: string; description?: string; hidden?: boolean };

const DEFAULT_COLUMNS: Column[] = [
    { key: "open", label: "Open", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", description: "Active milestones that are currently in progress" },
    { key: "closed", label: "Closed", color: "bg-slate-50 border-slate-200", accent: "bg-slate-400", description: "Milestones that have been completed" },
];

const COLOR_OPTIONS = [
    { color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", label: "Green" },
    { color: "bg-amber-50 border-amber-200", accent: "bg-amber-400", label: "Yellow" },
    { color: "bg-sky-50 border-sky-200", accent: "bg-sky-500", label: "Blue" },
    { color: "bg-violet-50 border-violet-200", accent: "bg-violet-500", label: "Purple" },
    { color: "bg-rose-50 border-rose-200", accent: "bg-rose-500", label: "Red" },
    { color: "bg-slate-50 border-slate-200", accent: "bg-slate-400", label: "Gray" },
];

const LS_KEY = "perftrack_milestone_columns";

function MilestoneCard({
    milestone, onEdit, onDelete, onStatusChange, allColumns, onDragEnd
}: {
    milestone: Milestone;
    onEdit: (m: Milestone) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    allColumns: Column[];
    onDragEnd?: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hovered, setHovered] = useState(false);

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData("milestone_id", milestone.id);
            }}
            onDragEnd={(e) => {
                e.stopPropagation();
                if (onDragEnd) onDragEnd();
            }}
            className="relative cursor-grab active:cursor-grabbing"
            onMouseEnter={() => !menuOpen && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={cn(
                "bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4 flex flex-col gap-2.5 transition-all duration-150",
                hovered ? "border-indigo-300 dark:border-indigo-700 shadow-md" : "border-slate-200 dark:border-slate-800"
            )}>
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 flex-1">
                        {milestone.title}
                    </h3>
                    <Popover open={menuOpen} onOpenChange={(o) => { setMenuOpen(o); if (o) setHovered(false); }}>
                        <PopoverTrigger
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1" align="end">
                            <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                onClick={() => { setMenuOpen(false); onEdit(milestone); }}
                            >
                                <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <p className="px-2 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Move to</p>
                            {allColumns.filter(c => c.key !== milestone.state).map(col => (
                                <button
                                    key={col.key}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    onClick={() => { setMenuOpen(false); onStatusChange(milestone.id, col.key); }}
                                >
                                    <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                                    {col.label}
                                </button>
                            ))}
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                onClick={() => { setMenuOpen(false); onDelete(milestone.id); }}
                            >
                                <Trash className="h-3.5 w-3.5" /> Delete
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>

                {milestone.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{milestone.description}</p>
                )}

                <div className="text-[11px] text-slate-500 font-medium">
                    <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2 line-clamp-1 inline-block">
                        {milestone.project.name}
                    </span>
                    {milestone.dueDate ? (
                        <span className={cn(
                            "inline-flex items-center",
                            new Date(milestone.dueDate) < new Date() && milestone.state === "open" ? "text-red-500" : ""
                        )}>
                            Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </span>
                    ) : (
                        <span className="text-slate-400 italic">No due date</span>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 mt-auto pt-2">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                            {milestone.openIssues} OPEN ISSUES
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-slate-200 text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                            {milestone.closedIssues} CLOSED ISSUES
                        </Badge>
                    </div>
                    {milestone.githubMilestoneNumber && milestone.project.repoOwner ? (
                        <a
                            href={`https://github.com/${milestone.project.repoOwner}/${milestone.project.repoName}/milestone/${milestone.githubMilestoneNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            #{milestone.githubMilestoneNumber} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(milestone.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({
    column, index, milestones, onEdit, onDelete, onStatusChange,
    isDragOver, isDragging,
    onDragStart, onDragOver, onDrop, onDragEnd,
    onDeleteColumn, onMoveCol, onEditCol, onHideCol,
    allColumns,
}: {
    column: Column;
    index: number;
    milestones: Milestone[];
    onEdit: (m: Milestone) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    isDragOver: boolean;
    isDragging: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDeleteColumn: () => void;
    onMoveCol: (dir: "left" | "right") => void;
    onEditCol: () => void;
    onHideCol: () => void;
    allColumns: Column[];
}) {
    const [headerHovered, setHeaderHovered] = useState(false);
    const canDelete = true;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                "flex flex-col rounded-2xl border min-h-[480px] w-80 shrink-0 transition-all duration-150",
                column.color,
                "dark:bg-slate-900/50 dark:border-slate-800",
                isDragging && "opacity-40 scale-[0.97]",
                isDragOver && !isDragging && "ring-2 ring-indigo-400 ring-offset-2",
            )}
        >
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-inherit cursor-grab active:cursor-grabbing select-none"
                onMouseEnter={() => setHeaderHovered(true)}
                onMouseLeave={() => setHeaderHovered(false)}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className={cn("h-4 w-4 text-slate-300 transition-opacity", headerHovered ? "opacity-100" : "opacity-0")} />
                    <span className={cn("h-2.5 w-2.5 rounded-full", column.accent)} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.label}</span>
                    <span className="text-xs font-medium text-slate-400 bg-white/70 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                        {milestones.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Popover>
                        <PopoverTrigger
                            className={cn(
                                "p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-all",
                                headerHovered ? "opacity-100" : "opacity-0"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                            <div className="flex px-1 py-1 gap-1">
                                <button className="flex-1 flex justify-center py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    disabled={index === 0}
                                    onClick={(e) => { e.stopPropagation(); onMoveCol("left"); }} title="Move left">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                                <button className="flex-1 flex justify-center py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    disabled={index === allColumns.length - 1}
                                    onClick={(e) => { e.stopPropagation(); onMoveCol("right"); }} title="Move right">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onEditCol(); }}>
                                <Edit className="h-3.5 w-3.5" /> Edit Column
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onHideCol(); }}>
                                <EyeOff className="h-3.5 w-3.5" /> Hide from view
                            </button>
                            {canDelete && (
                                <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); onDeleteColumn(); }}>
                                        <Trash className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            {column.description && (
                <div className="px-4 pb-2 border-b border-inherit bg-white/40 dark:bg-slate-900/40">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words">
                        {column.description}
                    </p>
                </div>
            )}
            <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                {milestones.length === 0 ? (
                    <div className={cn(
                        "flex flex-col items-center justify-center h-32 gap-2 opacity-40 rounded-xl border-2 border-dashed transition-colors",
                        isDragOver ? "border-indigo-300 bg-indigo-50/30 dark:border-indigo-700 dark:bg-indigo-900/30" : "border-transparent"
                    )}>
                        <FolderKanban className="h-7 w-7 text-slate-400" />
                        <p className="text-xs text-slate-400">Empty</p>
                    </div>
                ) : (
                    milestones.map(m => (
                        <MilestoneCard
                            key={m.id}
                            milestone={m}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStatusChange={onStatusChange}
                            allColumns={allColumns}
                            onDragEnd={onDragEnd}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function MilestonesPage() {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [subprojects, setSubprojects] = useState<Subproject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [loadingSubprojects, setLoadingSubprojects] = useState(false);

    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        projectId: "",
        subprojectId: "",
        title: "",
        description: "",
        dueDate: "",
    });

    const [filterDate, setFilterDate] = useState("");

    const filteredMilestones = useMemo(() => {
        if (!filterDate) return milestones;
        const targetDate = new Date(filterDate).toDateString();
        return milestones.filter(m => {
            if (!m.dueDate) return false;
            return new Date(m.dueDate).toDateString() === targetDate;
        });
    }, [milestones, filterDate]);

    const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    
    const [colDialogOpen, setColDialogOpen] = useState(false);
    const [editingColKey, setEditingColKey] = useState<string | null>(null);
    const [newColLabel, setNewColLabel] = useState("");
    const [newColDesc, setNewColDesc] = useState("");
    const [newColColor, setNewColColor] = useState(COLOR_OPTIONS[3]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) setColumns(JSON.parse(saved) as Column[]);
        } catch { /* ignore */ }
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) setProjects(await res.json());
        } catch (e) {
            console.error(e);
            toast.error("Failed to load projects");
        }
    }, []);

    const fetchSubprojects = useCallback(async (projectId: string) => {
        if (!projectId || projectId === "all") {
            setSubprojects([]);
            return;
        }
        setLoadingSubprojects(true);
        try {
            const res = await fetch(`/api/subprojects?projectId=${projectId}`);
            if (res.ok) setSubprojects(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSubprojects(false);
        }
    }, []);

    useEffect(() => {
        if (formData.projectId) {
            fetchSubprojects(formData.projectId);
        }
    }, [formData.projectId, fetchSubprojects]);

    const fetchMilestones = useCallback(async () => {
        setLoading(true);
        try {
            const url = selectedProjectId !== "all"
                ? `/api/milestones?projectId=${selectedProjectId}`
                : "/api/milestones";
            const res = await fetch(url);
            if (res.ok) setMilestones(await res.json());
            else toast.error((await res.json()).error || "Failed to fetch milestones");
        } catch (e) {
            console.error(e);
            toast.error("Network error while fetching milestones");
        } finally {
            setLoading(false);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        fetchMilestones();
    }, [fetchMilestones]);

    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIdx(idx);
    };
    
    const handleStatusChange = async (id: string, newStatus: string) => {
        const target = milestones.find(m => m.id === id);
        if (!target || target.state === newStatus) return;

        const original = [...milestones];
        setMilestones(prev => prev.map(m => m.id === id ? { ...m, state: newStatus } : m));

        try {
            const res = await fetch(`/api/milestones/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ state: newStatus }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to update status");
                setMilestones(original);
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error updating status");
            setMilestones(original);
        }
    };

    const handleDrop = (e: React.DragEvent, targetIdx: number, columnKey: string) => {
        const milestoneId = e.dataTransfer.getData("milestone_id");
        if (milestoneId) {
            handleStatusChange(milestoneId, columnKey);
            setDragOverIdx(null);
            return;
        }

        if (draggedIdx === null || draggedIdx === targetIdx) {
            setDragOverIdx(null);
            return;
        }

        const next = [...columns];
        const visibleColumns = next.filter(c => !c.hidden);
        const draggedCol = visibleColumns[draggedIdx];
        const targetCol = visibleColumns[targetIdx];
        
        const realDraggedIdx = next.findIndex(c => c.key === draggedCol?.key);
        const realTargetIdx = next.findIndex(c => c.key === targetCol?.key);
        
        if (realDraggedIdx > -1 && realTargetIdx > -1) {
            const [moved] = next.splice(realDraggedIdx, 1);
            next.splice(realTargetIdx, 0, moved);
            setColumns(next);
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

    const saveColumns = (cols: Column[]) => {
        setColumns(cols);
        try { localStorage.setItem(LS_KEY, JSON.stringify(cols)); } catch { /* ignore */ }
    };

    const handleMoveCol = (idx: number, dir: "left" | "right") => {
        if ((dir === "left" && idx === 0) || (dir === "right" && idx === columns.length - 1)) return;
        const targetIdx = dir === "left" ? idx - 1 : idx + 1;
        const next = [...columns];
        const [moved] = next.splice(idx, 1);
        next.splice(targetIdx, 0, moved);
        saveColumns(next);
    };

    const handleHideCol = (key: string) => {
        saveColumns(columns.map(c => c.key === key ? { ...c, hidden: true } : c));
        toast.success("Column hidden from view");
    };

    const openAddColDialog = () => {
        setEditingColKey(null);
        setNewColLabel("");
        setNewColDesc("");
        setNewColColor(COLOR_OPTIONS[3]);
        setColDialogOpen(true);
    };

    const openEditColDialog = (col: Column) => {
        setEditingColKey(col.key);
        setNewColLabel(col.label);
        setNewColDesc(col.description || "");
        const matchedColor = COLOR_OPTIONS.find(o => o.accent === col.accent) || COLOR_OPTIONS[3];
        setNewColColor(matchedColor);
        setColDialogOpen(true);
    };

    const handleSaveColumn = () => {
        const label = newColLabel.trim();
        if (!label) return;

        if (editingColKey) {
            saveColumns(columns.map(c => c.key === editingColKey ? {
                ...c,
                label,
                description: newColDesc.trim() || undefined,
                color: newColColor.color,
                accent: newColColor.accent
            } : c));
            toast.success(`Column "${label}" updated`);
        } else {
            const key = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now();
            const newCol: Column = { 
                key, label, 
                description: newColDesc.trim() || undefined,
                color: newColColor.color, 
                accent: newColColor.accent 
            };
            saveColumns([...columns, newCol]);
            toast.success(`Column "${label}" added`);
        }
        setColDialogOpen(false);
    };

    const handleDeleteColumn = (key: string) => {
        saveColumns(columns.filter(c => c.key !== key));
        toast.success("Column removed");
    };

    const handleOpenNew = () => {
        setFormData({
            projectId: selectedProjectId !== "all" ? selectedProjectId : "",
            subprojectId: "",
            title: "",
            description: "",
            dueDate: ""
        });
        setEditMilestoneId(null);
        setOpenDialog(true);
    };

    const handleOpenEdit = (milestone: Milestone) => {
        setFormData({
            projectId: milestone.projectId,
            subprojectId: (milestone as any).subprojectId || "",
            title: milestone.title,
            description: milestone.description || "",
            dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : "",
        });
        setEditMilestoneId(milestone.id);
        setOpenDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMilestoneId ? `/api/milestones/${editMilestoneId}` : "/api/milestones";
            const method = editMilestoneId ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setOpenDialog(false);
                fetchMilestones();
                if (data.githubWarning) {
                    toast.warning("Milestone partially saved", { description: data.githubWarning });
                } else {
                    toast.success(editMilestoneId ? "Milestone updated" : "Milestone created successfully");
                }
            } else {
                toast.error(data.error || "Failed to save milestone");
            }
        } catch (e) {
            console.error(e);
            toast.error("A network error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/milestones/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setConfirmDelete(null);
                fetchMilestones();
                toast.success("Milestone deleted");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete milestone");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach server");
        } finally {
            setDeletingId(null);
        }
    };

    const visibleColumns = columns.filter(c => !c.hidden);
    const hiddenColumnsCount = columns.length - visibleColumns.length;

    return (
        <div className="p-8 relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Milestones</h1>
                    <p className="text-muted-foreground mt-2">Track key targets and deadlines across your projects.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {hiddenColumnsCount > 0 && (
                        <Popover>
                            <PopoverTrigger className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                <EyeOff className="h-4 w-4" /> {hiddenColumnsCount} hidden
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Hidden Columns</p>
                                <div className="space-y-1">
                                    {columns.filter(c => c.hidden).map(c => (
                                        <div key={c.key} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{c.label}</span>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                                                onClick={() => saveColumns(columns.map(col => col.key === c.key ? { ...col, hidden: false } : col))}>
                                                Show
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
                    <Button variant="outline" size="sm" onClick={openAddColDialog} className="h-9">
                        <Plus className="mr-1.5 h-4 w-4" /> Add Column
                    </Button>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="h-9 w-[140px] text-sm"
                            title="Filter by Date"
                        />
                        <Select value={selectedProjectId} onValueChange={val => setSelectedProjectId(val || "all")}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Filter by Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleOpenNew} size="sm" className="h-9">
                        <Plus className="mr-2 h-4 w-4" /> New Milestone
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex gap-6 overflow-x-auto pb-4 pt-2 px-1 h-full min-h-0">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex flex-col rounded-2xl border bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 min-h-[480px] w-80 shrink-0 p-3 gap-3">
                            <Skeleton className="h-10 w-full rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                            <Skeleton className="h-32 w-full rounded-xl bg-white/60 dark:bg-slate-800/30" />
                            <Skeleton className="h-32 w-full rounded-xl bg-white/60 dark:bg-slate-800/30" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 pt-2 px-1 h-full min-h-0">
                    {visibleColumns.map((col, idx) => {
                        const colMilestones = filteredMilestones.filter(m => m.state === col.key);
                        return (
                            <KanbanColumn
                                key={col.key}
                                column={col}
                                index={idx}
                                milestones={colMilestones}
                                onEdit={handleOpenEdit}
                                onDelete={(id) => setConfirmDelete(id)}
                                onStatusChange={handleStatusChange}
                                isDragOver={dragOverIdx === idx}
                                isDragging={draggedIdx === idx}
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, idx, col.key)}
                                onDragEnd={handleDragEnd}
                                onDeleteColumn={() => handleDeleteColumn(col.key)}
                                onMoveCol={(dir) => handleMoveCol(columns.findIndex(c => c.key === col.key), dir)}
                                onEditCol={() => openEditColDialog(col)}
                                onHideCol={() => handleHideCol(col.key)}
                                allColumns={visibleColumns}
                            />
                        );
                    })}
                    
                    <button 
                        onClick={openAddColDialog}
                        className="flex items-center justify-center shrink-0 w-16 h-[60px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors self-start mt-0"
                        title="Add Column"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                    <div className="shrink-0 w-2" />
                </div>
            )}

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editMilestoneId ? "Edit Milestone" : "New Milestone"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project</label>
                            <Select
                                value={formData.projectId}
                                onValueChange={val => setFormData({ ...formData, projectId: val || "" })}
                                disabled={saving}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subproject (Optional - Syncs to Task)</label>
                            <Select
                                value={formData.subprojectId}
                                onValueChange={val => setFormData({ ...formData, subprojectId: val || "" })}
                                disabled={saving || !formData.projectId || loadingSubprojects}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={loadingSubprojects ? "Loading..." : "Select subproject"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Subproject</SelectItem>
                                    {subprojects.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Milestone title"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What needs to be achieved?"
                                className="min-h-[80px]"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date</label>
                            <Input
                                type="date"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.title || !formData.projectId || saving} className="min-w-[100px]">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Milestone"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Milestone</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 py-4">
                        Are you sure you want to delete **{milestones.find(m => m.id === confirmDelete)?.title}**?
                        This action will not delete issues within it, but they will be unassigned from this target.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
                            {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete Milestone"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingColKey ? "Edit Column" : "Add Column"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Column Name</label>
                            <Input
                                value={newColLabel}
                                onChange={e => setNewColLabel(e.target.value)}
                                placeholder="e.g. In Progress"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (optional)</label>
                            <Input
                                value={newColDesc}
                                onChange={e => setNewColDesc(e.target.value)}
                                placeholder="What milestones go here?"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color Label</label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {COLOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.color}
                                        onClick={() => setNewColColor(opt)}
                                        className={cn(
                                            "h-10 w-10 flex items-center justify-center rounded-xl border-2 transition-all",
                                            opt.color,
                                            newColColor.accent === opt.accent ? "ring-2 ring-offset-2 ring-indigo-500 shadow-sm" : "hover:scale-105"
                                        )}
                                    >
                                        <span className={cn("h-3 w-3 rounded-full", opt.accent)} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setColDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveColumn} disabled={!newColLabel.trim()}>
                            {editingColKey ? "Save Changes" : "Create Column"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
