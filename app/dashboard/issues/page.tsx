"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Trash, Edit, Plus, ExternalLink,
    Loader2, GripVertical, ChevronLeft, ChevronRight,
    EyeOff, MoreHorizontal, MessageSquare, Heart, Repeat, CalendarDays, Filter
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

type Project = {
    id: string;
    name: string;
    repoOwner: string | null;
    repoName: string | null;
    startDate?: string | null;
    endDate?: string | null;
};

type Milestone = {
    id: string;
    title: string;
    projectId: string;
};

type User = {
    id: string;
    name: string;
    avatarUrl: string | null;
    githubLogin: string | null;
};

type Issue = {
    id: string;
    title: string;
    body: string | null;
    state: string;
    labels: string[];
    githubIssueNumber: number | null;
    assigneeId: string | null;
    assignee: User | null;
    projectId: string | null;
    project: Project | null;
    milestoneId: string | null;
    milestone: {
        id: string;
        title: string;
        projectId: string;
        project: Project;
    } | null;
    commentsCount: number;
    likesCount: number;
    repostsCount: number;
    startDate?: string | null;
    endDate?: string | null;
    createdAt: string;
};

/* ─── Constants ──────────────────────────────────────────────────── */

type Column = { key: string; label: string; color: string; accent: string; description?: string; hidden?: boolean };

const DEFAULT_COLUMNS: Column[] = [
    { key: "to_do", label: "To Do", color: "bg-slate-50 border-slate-200", accent: "bg-slate-400", description: "Issues that are ready to be picked up" },
    { key: "in_progress", label: "In Progress", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500", description: "Issues currently being worked on" },
    { key: "done", label: "Done", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", description: "Completed issues" },
];

const COLOR_OPTIONS: { color: string; accent: string; label: string }[] = [
    { color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", label: "Green" },
    { color: "bg-amber-50 border-amber-200", accent: "bg-amber-400", label: "Yellow" },
    { color: "bg-sky-50 border-sky-200", accent: "bg-sky-500", label: "Blue" },
    { color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500", label: "Indigo" },
    { color: "bg-rose-50 border-rose-200", accent: "bg-rose-500", label: "Red" },
    { color: "bg-slate-50 border-slate-200", accent: "bg-slate-400", label: "Gray" },
];

const LS_KEY = "perftrack_issues_kanban_columns";

/* ─── IssueHoverInteraction ───────────────────────────────────────── */

function IssueHoverInteraction({ issue, anchorEl }: { issue: Issue; anchorEl: HTMLElement | null }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999
            }}
            className="w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-3 flex flex-col gap-3 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Arrow */}
            <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Engagement</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-2">
                <div className="flex flex-col items-center gap-1">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-semibold text-slate-700">{issue.likesCount || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-sky-500" />
                    <span className="text-sm font-semibold text-slate-700">{issue.commentsCount || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Repeat className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700">{issue.repostsCount || 0}</span>
                </div>
            </div>

            {(issue.startDate || issue.endDate) && (
                <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-center">Dates</p>
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        <span className="shrink-0 bg-slate-100 text-slate-600 px-1 py-0.5 rounded leading-none">
                            {issue.startDate ? new Date(issue.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="shrink-0 bg-slate-100 text-slate-600 px-1 py-0.5 rounded leading-none">
                            {issue.endDate ? new Date(issue.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                        </span>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

/* ─── IssueCard ────────────────────────────────────────────────── */

function IssueCard({
    issue,
    onEdit,
    onDelete,
    onStatusChange,
    allColumns,
    onDragEnd,
}: {
    issue: Issue;
    onEdit: (i: Issue) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    allColumns: Column[];
    onDragEnd?: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        if (!menuOpen) setHovered(true);
    };
    const handleMouseLeave = () => {
        leaveTimer.current = setTimeout(() => setHovered(false), 120);
    };

    return (
        <div
            ref={cardRef}
            draggable
            onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData("issue_id", issue.id);
            }}
            onDragEnd={(e) => {
                e.stopPropagation();
                if (onDragEnd) onDragEnd();
            }}
            className="cursor-grab active:cursor-grabbing"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Card */}
            <div className={cn(
                "bg-white rounded-xl border shadow-sm p-3.5 flex flex-col gap-2.5 transition-all duration-150",
                hovered ? "border-indigo-300 shadow-md" : "border-slate-200"
            )}>
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1">
                        {issue.title}
                    </h3>
                    <Popover open={menuOpen} onOpenChange={(o) => { setMenuOpen(o); if (o) setHovered(false); }}>
                        <PopoverTrigger
                            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1" align="end">
                            <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700"
                                onClick={() => { setMenuOpen(false); onEdit(issue); }}
                            >
                                <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <p className="px-2 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Move to</p>
                            {allColumns.filter(c => c.key !== issue.state).map(col => (
                                <button
                                    key={col.key}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700"
                                    onClick={() => { setMenuOpen(false); onStatusChange(issue.id, col.key); }}
                                >
                                    <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                                    {col.label}
                                </button>
                            ))}
                            <div className="my-1 border-t border-slate-100" />
                            <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 text-red-600"
                                onClick={() => { setMenuOpen(false); onDelete(issue.id); }}
                            >
                                <Trash className="h-3.5 w-3.5" /> Delete
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Project / Repo */}
                {(issue.project || issue.milestone?.project) && (
                    <div className="text-[11px] font-mono text-slate-500 tracking-tight">
                        {issue.project?.name || issue.milestone?.project?.name}
                    </div>
                )}

                {/* Description Truncated */}
                {issue.body && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{issue.body}</p>
                )}

                {/* Labels */}
                {issue.labels && issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {issue.labels.map(l => (
                            <Badge key={l} variant="outline" className="text-[9px] h-4 px-1.5 font-semibold bg-indigo-50/50 text-indigo-600 border-indigo-100">
                                {l}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Dates display inline small text */}
                {(issue.startDate || issue.endDate) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-1">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        <span className="shrink-0 text-slate-600 leading-none">
                            {issue.startDate ? new Date(issue.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="shrink-0 text-slate-600 leading-none">
                            {issue.endDate ? new Date(issue.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-auto">
                    {/* Milestone & Date */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {issue.milestone ? issue.milestone.title : "No Milestone"}
                        </span>
                        {issue.githubIssueNumber && issue.milestone?.project ? (
                            <a
                                href={`https://github.com/${issue.milestone.project.repoOwner}/${issue.milestone.project.repoName}/issues/${issue.githubIssueNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                                onClick={e => e.stopPropagation()}
                            >
                                #{issue.githubIssueNumber} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        ) : (
                            <span className="text-[10px] text-slate-300 font-mono">
                                {new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                        )}
                    </div>
                    {/* Assignee */}
                    <div className="flex items-center gap-2">
                        {issue.assignee ? (
                            <div className="flex items-center gap-1.5">
                                {issue.assignee.avatarUrl ? (
                                    <img src={issue.assignee.avatarUrl} alt="" className="h-5 w-5 rounded-full border border-slate-200" />
                                ) : (
                                    <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200" />
                                )}
                                <span className="text-[11px] font-medium text-slate-600 truncate">{issue.assignee.name || "User"}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Side Analytics Hover */}
            {hovered && <IssueHoverInteraction issue={issue} anchorEl={cardRef.current} />}
        </div>
    );
}

/* ─── KanbanColumn ───────────────────────────────────────────────── */

function KanbanColumn({
    column, index, issues, onEdit, onDelete, onStatusChange, onAddNew,
    isDragOver, isDragging,
    onDragStart, onDragOver, onDrop, onDragEnd,
    onDeleteColumn, onMoveCol, onEditCol, onHideCol,
    allColumns,
}: {
    column: Column;
    index: number;
    issues: Issue[];
    onEdit: (i: Issue) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    onAddNew: () => void;
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

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                "flex flex-col rounded-2xl border min-h-[480px] w-72 shrink-0 transition-all duration-150",
                column.color,
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
                    <span className="text-sm font-semibold text-slate-700">{column.label}</span>
                    <span className="text-xs font-medium text-slate-400 bg-white/70 rounded-full px-2 py-0.5 border border-slate-200">
                        {issues.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onAddNew}
                        className="p-1 rounded-md hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
                        title="New Issue"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                    <Popover>
                        <PopoverTrigger
                            className={cn(
                                "p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all",
                                headerHovered ? "opacity-100" : "opacity-0"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                            <div className="flex px-1 py-1 gap-1">
                                <button className="flex-1 flex justify-center py-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    disabled={index === 0}
                                    onClick={(e) => { e.stopPropagation(); onMoveCol("left"); }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="w-[1px] bg-slate-100 my-1" />
                                <button className="flex-1 flex justify-center py-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    disabled={index === allColumns.length - 1}
                                    onClick={(e) => { e.stopPropagation(); onMoveCol("right"); }}>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="my-1 border-t border-slate-100" />
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onEditCol(); }}>
                                <Edit className="h-3.5 w-3.5" /> Edit Column
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onHideCol(); }}>
                                <EyeOff className="h-3.5 w-3.5" /> Hide from view
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 text-red-600 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onDeleteColumn(); }}>
                                <Trash className="h-3.5 w-3.5" /> Delete
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            {column.description && (
                <div className="px-4 pb-2 border-b border-inherit bg-white/40">
                    <p className="text-[11px] text-slate-500 leading-snug break-words">
                        {column.description}
                    </p>
                </div>
            )}
            <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                {issues.length === 0 ? (
                    <div className={cn(
                        "flex flex-col items-center justify-center h-24 gap-2 opacity-40 rounded-xl border-2 border-dashed transition-colors",
                        isDragOver ? "border-indigo-300 bg-indigo-50/30" : "border-transparent"
                    )}>
                        <p className="text-xs text-slate-400">Drop here</p>
                    </div>
                ) : (
                    issues.map(issue => (
                        <IssueCard
                            key={issue.id}
                            issue={issue}
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

/* ─── Page ───────────────────────────────────────────────────────── */

export default function IssuesPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            if (filterStart) {
                const end = issue.endDate ? new Date(issue.endDate) : (issue.startDate ? new Date(issue.startDate) : null);
                if (!end || end < new Date(filterStart)) return false;
            }
            if (filterEnd) {
                const start = issue.startDate ? new Date(issue.startDate) : (issue.endDate ? new Date(issue.endDate) : null);
                if (!start || start > new Date(filterEnd)) return false;
            }
            return true;
        });
    }, [issues, filterStart, filterEnd]);

    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editIssueId, setEditIssueId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        projectId: "",
        milestoneId: "",
        title: "",
        body: "",
        labels: "",
        assigneeId: "",
        state: "to_do",
        startDate: "",
        endDate: ""
    });

    // ── Columns state (draggable + addable) ──────────────────────────
    const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) setColumns(JSON.parse(saved) as Column[]);
        } catch { /* ignore */ }
    }, []);

    const saveColumns = (cols: Column[]) => {
        setColumns(cols);
        try { localStorage.setItem(LS_KEY, JSON.stringify(cols)); } catch { /* ignore */ }
    };

    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIdx(idx);
    };
    const handleDrop = (e: React.DragEvent, targetIdx: number, columnKey: string) => {
        const issueId = e.dataTransfer.getData("issue_id");
        if (issueId) {
            handleStatusChange(issueId, columnKey);
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
            saveColumns(next);
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

    // ── Add/Edit column dialog state ─────────────────────────────────
    const [colDialogOpen, setColDialogOpen] = useState(false);
    const [editingColKey, setEditingColKey] = useState<string | null>(null);
    const [newColLabel, setNewColLabel] = useState("");
    const [newColDesc, setNewColDesc] = useState("");
    const [newColColor, setNewColColor] = useState(COLOR_OPTIONS[3]);

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

    const fetchInitialData = useCallback(async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                fetch("/api/projects"),
                fetch("/api/team")
            ]);
            if (projRes.ok) setProjects(await projRes.json());
            if (userRes.ok) setUsers(await userRes.json());
        } catch (e) {
            console.error(e);
            toast.error("Failed to load initial data");
        }
    }, []);

    const fetchMilestones = useCallback(async (projectId?: string) => {
        try {
            const url = projectId && projectId !== "all"
                ? `/api/milestones?projectId=${projectId}`
                : "/api/milestones";
            const res = await fetch(url);
            if (res.ok) setMilestones(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedProjectId !== "all") params.append("projectId", selectedProjectId);
            if (selectedMilestoneId !== "all") params.append("milestoneId", selectedMilestoneId);

            const res = await fetch(`/api/issues?${params.toString()}`);
            if (res.ok) {
                // Ensure legacy issues with 'open' or 'closed' states translate to standard columns if available
                const data = await res.json();
                const mapped = data.map((i: any) => {
                    const st = i.state;
                    if (st === "open" && !columns.find(c => c.key === "open")) i.state = "to_do";
                    if (st === "closed" && !columns.find(c => c.key === "closed")) i.state = "done";
                    return i;
                });
                setIssues(mapped);
            } else {
                toast.error((await res.json()).error || "Failed to fetch issues");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error while fetching issues");
        } finally {
            setLoading(false);
        }
    }, [selectedProjectId, selectedMilestoneId, columns]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    useEffect(() => {
        fetchMilestones(selectedProjectId);
        if (selectedProjectId === "all") setSelectedMilestoneId("all");
    }, [selectedProjectId, fetchMilestones]);
    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        const tObj = issues.find(i => i.id === id);
        if (!tObj || tObj.state === newStatus) return;

        const prev = tObj.state;
        setIssues(issues.map(i => i.id === id ? { ...i, state: newStatus } : i));

        try {
            const res = await fetch(`/api/issues/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ state: newStatus }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.githubWarning) {
                    toast.warning("Issue state updated", { description: data.githubWarning });
                } else {
                    toast.success("Issue moved successfully");
                }
            } else {
                setIssues(issues.map(i => i.id === id ? { ...i, state: prev } : i));
                toast.error((await res.json()).error || "Failed to update state");
            }
        } catch (e) {
            console.error(e);
            setIssues(issues.map(i => i.id === id ? { ...i, state: prev } : i));
            toast.error("Network error");
        }
    };

    const handleOpenNew = (columnKey?: string) => {
        setFormData({
            projectId: selectedProjectId !== "all" ? selectedProjectId : "",
            milestoneId: selectedMilestoneId !== "all" ? selectedMilestoneId : "",
            title: "", body: "", labels: "", assigneeId: "",
            state: columnKey || "to_do",
            startDate: "",
            endDate: ""
        });
        setEditIssueId(null);
        setOpenDialog(true);
    };

    const handleOpenEdit = (issue: Issue) => {
        setFormData({
            projectId: issue.milestone?.projectId || "",
            milestoneId: issue.milestoneId || "",
            title: issue.title,
            body: issue.body || "",
            labels: issue.labels.join(", "),
            assigneeId: issue.assigneeId || "",
            state: issue.state,
            startDate: issue.startDate ? issue.startDate.split("T")[0] : "",
            endDate: issue.endDate ? issue.endDate.split("T")[0] : ""
        });
        setEditIssueId(issue.id);
        setOpenDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const project = projects.find(p => p.id === formData.projectId);
            
            // Validate Dates
            if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
                toast.error("End date must be greater than start date");
                setSaving(false);
                return;
            }
            if (project) {
                if (formData.startDate && project.startDate && new Date(formData.startDate) < new Date(project.startDate)) {
                    toast.error("Start date is before project start date");
                    setSaving(false);
                    return;
                }
                if (formData.endDate && project.endDate && new Date(formData.endDate) > new Date(project.endDate)) {
                    toast.error("End date is after project end date");
                    setSaving(false);
                    return;
                }
            }

            const url = editIssueId ? `/api/issues/${editIssueId}` : "/api/issues";
            const method = editIssueId ? "PATCH" : "POST";
            const payload = {
                ...formData,
                labels: formData.labels.split(",").map(l => l.trim()).filter(l => l !== ""),
            };
            const savePayload = { ...payload };

            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(savePayload)
            });
            const data = await res.json();
            if (res.ok) {
                setOpenDialog(false);
                fetchIssues();
                if (data.githubWarning) toast.warning("Issue partially saved", { description: data.githubWarning });
                else toast.success(editIssueId ? "Issue updated" : "Issue created");
            } else {
                toast.error(data.error || "Failed to save issue");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/issues/${id}`, { method: "DELETE" });
            if (res.ok) { setConfirmDelete(null); fetchIssues(); toast.success("Issue deleted"); }
            else toast.error((await res.json()).error || "Failed to delete issue");
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        } finally {
            setDeletingId(null);
        }
    };

    const dialogMilestones = useMemo(() => {
        if (!formData.projectId) return [];
        return milestones.filter(m => m.projectId === formData.projectId);
    }, [formData.projectId, milestones]);

    const visibleColumns = columns.filter(c => !c.hidden);
    const hiddenColumns = columns.filter(c => c.hidden);

    return (
        <div className="p-8 relative h-[calc(100vh-64px)] flex flex-col pt-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Issues Kanban</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm">Visualize and manage your issues flexibly via drag and drop.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hiddenColumns.length > 0 && (
                        <Popover>
                            <PopoverTrigger
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none h-9 px-3 rounded-md text-sm border border-dashed text-slate-500 bg-white hover:bg-slate-50 hidden sm:flex"
                            >
                                <EyeOff className="mr-2 h-4 w-4" /> {hiddenColumns.length} Hidden
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="end">
                                <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Hidden Columns</p>
                                <div className="space-y-1">
                                    {hiddenColumns.map(col => (
                                        <div key={col.key} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                                                <span className="text-sm font-medium">{col.label}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => {
                                                saveColumns(columns.map(c => c.key === col.key ? { ...c, hidden: false } : c));
                                            }}>Unhide</Button>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button variant="secondary" onClick={openAddColDialog} size="sm" className="h-9">
                        <Plus className="mr-2 h-4 w-4" /> Add Column
                    </Button>
                    <Button onClick={() => handleOpenNew()} size="sm" className="h-9">
                        <Plus className="mr-2 h-4 w-4" /> New Issue
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end shrink-0">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-0.5">Project Filter</label>
                    <Select value={selectedProjectId} onValueChange={val => setSelectedProjectId(val || "all")}>
                        <SelectTrigger className="w-[180px] h-9 bg-white shadow-sm">
                            <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-0.5">Milestone Filter</label>
                    <Select
                        value={selectedMilestoneId}
                        onValueChange={val => setSelectedMilestoneId(val || "all")}
                        disabled={selectedProjectId === "all"}
                    >
                        <SelectTrigger className="w-[180px] h-9 bg-white shadow-sm">
                            <SelectValue placeholder="Milestone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Milestones</SelectItem>
                            {milestones.filter(m => m.projectId === selectedProjectId).map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5 z-10">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-0.5 block">Date Filter</label>
                    <Popover>
                        <PopoverTrigger
                            className={cn(
                                "inline-flex items-center justify-between gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none h-9 w-[240px] px-3 rounded-md text-sm border bg-white shadow-sm border-slate-200 hover:bg-slate-50",
                                (filterStart || filterEnd) && "border-indigo-300 bg-indigo-50/30 text-indigo-700 font-medium"
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="truncate text-xs">
                                    {filterStart && filterEnd ? `${new Date(filterStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(filterEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : filterStart ? `From ${new Date(filterStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : filterEnd ? `Until ${new Date(filterEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Filter by date"}
                                </span>
                            </div>
                            {(filterStart || filterEnd) && (
                                <Badge variant="secondary" className="px-1 h-5 rounded-sm bg-indigo-100/50 hover:bg-indigo-100/80 text-indigo-600 shrink-0 ml-1">Active</Badge>
                            )}
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-4" align="start">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm">Filter Active Date Range</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Starts After</label>
                                        <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Ends Before</label>
                                        <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-700" onClick={() => { setFilterStart(""); setFilterEnd(""); }}>Clear Filter</Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center flex-1 h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-6 flex-1 items-start snap-x hide-scrollbar px-1">
                    {visibleColumns.map((col, idx) => (
                        <div key={col.key} className="snap-center">
                            <KanbanColumn
                                column={col}
                                index={idx}
                                issues={filteredIssues.filter(i => i.state === col.key)}
                                onEdit={handleOpenEdit}
                                onDelete={(id) => setConfirmDelete(id)}
                                onStatusChange={handleStatusChange}
                                onAddNew={() => handleOpenNew(col.key)}
                                isDragging={draggedIdx !== null}
                                isDragOver={dragOverIdx === idx}
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
                        </div>
                    ))}
                    {visibleColumns.length === 0 && (
                        <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                            <p>No columns visible. Create a column or unhide one to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Dialogs */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editIssueId ? "Edit Issue" : "New Issue"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y my-2 border-slate-100 dark:border-slate-800 h-[60vh] overflow-y-auto px-1 hide-scrollbar">
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="What needs to be done?"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project</label>
                            <Select
                                value={formData.projectId}
                                onValueChange={val => setFormData({ ...formData, projectId: val || "", milestoneId: "" })}
                                disabled={saving}
                            >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Milestone</label>
                            <Select
                                value={formData.milestoneId}
                                onValueChange={val => setFormData({ ...formData, milestoneId: val || "" })}
                                disabled={!formData.projectId || saving}
                            >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select milestone" /></SelectTrigger>
                                <SelectContent>
                                    {dialogMilestones.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                type="date"
                                className="h-9"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                type="date"
                                className="h-9"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="text-sm font-medium">Assignee</label>
                            <Select
                                value={formData.assigneeId}
                                onValueChange={val => setFormData({ ...formData, assigneeId: val || "" })}
                                disabled={saving}
                            >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            <div className="flex items-center gap-2">
                                                {u.avatarUrl && <img src={u.avatarUrl} alt="" className="h-4 w-4 rounded-full" />}
                                                {u.name || u.githubLogin}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 relative z-10">
                            <label className="text-sm font-medium">Label</label>
                            <Select
                                value={formData.labels.split(',')[0].trim() || ""}
                                onValueChange={val => setFormData({ ...formData, labels: val || "" })}
                                disabled={saving}
                            >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select a label" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bug">bug</SelectItem>
                                    <SelectItem value="documentation">documentation</SelectItem>
                                    <SelectItem value="enhancement">enhancement</SelectItem>
                                    <SelectItem value="duplicate">duplicate</SelectItem>
                                    <SelectItem value="good first issue">good first issue</SelectItem>
                                    <SelectItem value="help wanted">help wanted</SelectItem>
                                    <SelectItem value="invalid">invalid</SelectItem>
                                    <SelectItem value="question">question</SelectItem>
                                    <SelectItem value="wontfix">wontfix</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-2 mt-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                className="min-h-[120px]"
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Detailed description..."
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.title || saving} className="min-w-[120px]">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editIssueId ? "Update Issue" : "Create Issue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingColKey ? "Edit Column" : "Add Column"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input value={newColLabel} onChange={e => setNewColLabel(e.target.value)} placeholder="e.g. Needs Review" autoFocus />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Input value={newColDesc} onChange={e => setNewColDesc(e.target.value)} placeholder="What goes in this column?" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium mb-1 block">Color Theme</label>
                            <div className="flex gap-2.5">
                                {COLOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={() => setNewColColor(opt)}
                                        className={cn(
                                            "h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center",
                                            opt.color,
                                            newColColor.accent === opt.accent ? "ring-2 ring-indigo-400 ring-offset-2 scale-110" : "hover:scale-105 border-transparent opacity-70"
                                        )}
                                        title={opt.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setColDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveColumn} disabled={!newColLabel.trim()}>Save Column</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Issue</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 py-4">
                        Are you sure you want to delete this issue?
                        This action is permanent and will also remove it from GitHub if linked.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
                            {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
