"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit, Plus, ExternalLink, Filter, Loader2, Flag } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Project = {
    id: string;
    name: string;
    repoOwner?: string;
    repoName?: string;
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

export default function MilestonesPage() {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        projectId: "",
        title: "",
        description: "",
        dueDate: "",
    });

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load projects");
        }
    }, []);

    const fetchMilestones = useCallback(async () => {
        setLoading(true);
        try {
            const url = selectedProjectId !== "all"
                ? `/api/milestones?projectId=${selectedProjectId}`
                : "/api/milestones";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMilestones(data);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to fetch milestones");
            }
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

    const handleOpenNew = () => {
        setFormData({
            projectId: selectedProjectId !== "all" ? selectedProjectId : "",
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

    const MilestoneSkeleton = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    return (
        <div className="p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Milestones</h1>
                    <p className="text-muted-foreground mt-2">Track key targets and deadlines across your projects.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedProjectId} onValueChange={val => setSelectedProjectId(val || "all")}>
                            <SelectTrigger className="w-[200px] h-9">
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

            <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Issues (O/C)</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead>GitHub</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <MilestoneSkeleton />
                        ) : milestones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Flag className="h-8 w-8 opacity-20" />
                                        <p>No milestones found for this selection.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            milestones.map(milestone => (
                                <TableRow key={milestone.id} className="group transition-colors">
                                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                        <div>
                                            <p>{milestone.title}</p>
                                            {milestone.description && (
                                                <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{milestone.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">{milestone.project.name}</TableCell>
                                    <TableCell className="text-sm">
                                        {milestone.dueDate
                                            ? <span className={cn(
                                                "font-medium",
                                                new Date(milestone.dueDate) < new Date() && milestone.state === "open" ? "text-red-500" : "text-slate-700 dark:text-slate-300"
                                            )}>{new Date(milestone.dueDate).toLocaleDateString()}</span>
                                            : <span className="text-slate-300 text-xs italic">No date</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                                                {milestone.openIssues} OPEN
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-slate-200 text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                                                {milestone.closedIssues} CLOSED
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={milestone.state === "open" ? "default" : "secondary"} className={cn(
                                            "capitalize px-1.5 py-0 h-5 text-[10px] font-bold",
                                            milestone.state === "open" ? "bg-indigo-500 hover:bg-indigo-600" : ""
                                        )}>
                                            {milestone.state}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {milestone.githubMilestoneNumber && milestone.project.repoOwner ? (
                                            <a
                                                href={`https://github.com/${milestone.project.repoOwner}/${milestone.project.repoName}/milestone/${milestone.githubMilestoneNumber}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                                            >
                                                #{milestone.githubMilestoneNumber} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(milestone)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmDelete(milestone.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

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
        </div>
    );
}
