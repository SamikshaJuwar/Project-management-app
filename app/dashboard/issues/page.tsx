"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
    Trash,
    Edit,
    Plus,
    ExternalLink,
    Filter,
    User as UserIcon,
    CircleDot,
    CheckCircle2,
    Loader2,
    Tag
} from "lucide-react";
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
    repoOwner: string | null;
    repoName: string | null;
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
    milestoneId: string | null;
    milestone: {
        id: string;
        title: string;
        projectId: string;
        project: Project;
    } | null;
    createdAt: string;
};

export default function IssuesPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
    const [selectedState, setSelectedState] = useState<string>("all");

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
    });

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
            if (res.ok) {
                setMilestones(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedProjectId !== "all") params.append("projectId", selectedProjectId);
            if (selectedMilestoneId !== "all") params.append("milestoneId", selectedMilestoneId);
            if (selectedState !== "all") params.append("state", selectedState);

            const res = await fetch(`/api/issues?${params.toString()}`);
            if (res.ok) {
                setIssues(await res.json());
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to fetch issues");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error while fetching issues");
        } finally {
            setLoading(false);
        }
    }, [selectedProjectId, selectedMilestoneId, selectedState]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        fetchMilestones(selectedProjectId);
        if (selectedProjectId === "all") setSelectedMilestoneId("all");
    }, [selectedProjectId, fetchMilestones]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    const handleOpenNew = () => {
        setFormData({
            projectId: selectedProjectId !== "all" ? selectedProjectId : "",
            milestoneId: selectedMilestoneId !== "all" ? selectedMilestoneId : "",
            title: "",
            body: "",
            labels: "",
            assigneeId: ""
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
        });
        setEditIssueId(issue.id);
        setOpenDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editIssueId ? `/api/issues/${editIssueId}` : "/api/issues";
            const method = editIssueId ? "PATCH" : "POST";

            const payload = {
                ...formData,
                labels: formData.labels.split(",").map(l => l.trim()).filter(l => l !== ""),
            };

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { projectId, ...savePayload } = payload;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(savePayload)
            });
            const data = await res.json();
            if (res.ok) {
                setOpenDialog(false);
                fetchIssues();
                if (data.githubWarning) {
                    toast.warning("Issue partially saved", { description: data.githubWarning });
                } else {
                    toast.success(editIssueId ? "Issue updated" : "Issue created successfully");
                }
            } else {
                toast.error(data.error || "Failed to save issue");
            }
        } catch (e) {
            console.error(e);
            toast.error("A network error occurred");
        } finally {
            setSaving(false);
        }
    };

    const toggleIssueState = async (issue: Issue) => {
        try {
            const newState = issue.state === "open" ? "closed" : "open";
            const res = await fetch(`/api/issues/${issue.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ state: newState })
            });
            if (res.ok) {
                fetchIssues();
                toast.success(`Issue ${newState === "open" ? "reopened" : "closed"}`);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update state");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/issues/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setConfirmDelete(null);
                fetchIssues();
                toast.success("Issue deleted");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete issue");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach server");
        } finally {
            setDeletingId(null);
        }
    };

    const dialogMilestones = useMemo(() => {
        if (!formData.projectId) return [];
        return milestones.filter(m => m.projectId === formData.projectId);
    }, [formData.projectId, milestones]);

    const IssueSkeleton = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    return (
        <div className="p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Issues</h1>
                    <p className="text-muted-foreground mt-2">Manage tasks and track bugs across your projects.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleOpenNew} size="sm" className="h-9">
                        <Plus className="mr-2 h-4 w-4" /> New Issue
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-0.5">Project</label>
                    <Select value={selectedProjectId} onValueChange={val => setSelectedProjectId(val || "all")}>
                        <SelectTrigger className="w-[180px] h-9">
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
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-0.5">Milestone</label>
                    <Select
                        value={selectedMilestoneId}
                        onValueChange={val => setSelectedMilestoneId(val || "all")}
                        disabled={selectedProjectId === "all"}
                    >
                        <SelectTrigger className="w-[180px] h-9">
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
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-0.5">Status</label>
                    <Select value={selectedState} onValueChange={val => setSelectedState(val || "all")}>
                        <SelectTrigger className="w-[120px] h-9">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1"></div>
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Issue</TableHead>
                            <TableHead>Milestone</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Labels</TableHead>
                            <TableHead>GitHub</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <IssueSkeleton />
                        ) : issues.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <CircleDot className="h-8 w-8 opacity-20" />
                                        <p>No issues found for this selection.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            issues.map(issue => (
                                <TableRow key={issue.id} className="cursor-pointer group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40" onClick={() => handleOpenEdit(issue)}>
                                    <TableCell onClick={(e) => { e.stopPropagation(); toggleIssueState(issue); }}>
                                        {issue.state === "open" ? (
                                            <CircleDot className="h-5 w-5 text-indigo-500 hover:scale-110 transition-transform" />
                                        ) : (
                                            <CheckCircle2 className="h-5 w-5 text-green-500 hover:scale-110 transition-transform" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                        <div>
                                            {issue.title}
                                            <div className="flex gap-1 mt-1">
                                                <Badge variant={issue.state === "open" ? "default" : "secondary"} className={cn(
                                                    "text-[9px] h-3.5 px-1 font-bold",
                                                    issue.state === "open" ? "bg-indigo-500" : "bg-slate-400"
                                                )}>
                                                    {issue.state.toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                                        {issue.milestone ? issue.milestone.title : <span className="text-slate-300 italic text-xs">No milestone</span>}
                                    </TableCell>
                                    <TableCell>
                                        {issue.assignee ? (
                                            <div className="flex items-center gap-2">
                                                {issue.assignee.avatarUrl ? (
                                                    <img src={issue.assignee.avatarUrl} alt="" className="h-6 w-6 rounded-full border border-slate-200" />
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                        <UserIcon className="h-3 w-3 text-slate-400" />
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{issue.assignee.name || "User"}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 italic text-xs">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {issue.labels.length > 0 ? issue.labels.map(label => (
                                                <Badge key={label} variant="outline" className="text-[9px] h-4 px-1.5 font-semibold bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900">
                                                    {label}
                                                </Badge>
                                            )) : <span className="text-slate-200">—</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {issue.githubIssueNumber && issue.milestone?.project ? (
                                            <a
                                                href={`https://github.com/${issue.milestone.project.repoOwner}/${issue.milestone.project.repoName}/issues/${issue.githubIssueNumber}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                #{issue.githubIssueNumber} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                        {new Date(issue.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmDelete(issue.id)}>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editIssueId ? "Edit Issue" : "New Issue"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y my-2 border-slate-100 dark:border-slate-800">
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
                                <SelectTrigger className="h-9">
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
                            <label className="text-sm font-medium">Milestone</label>
                            <Select
                                value={formData.milestoneId}
                                onValueChange={val => setFormData({ ...formData, milestoneId: val || "" })}
                                disabled={!formData.projectId || saving}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select milestone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dialogMilestones.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assignee</label>
                            <Select
                                value={formData.assigneeId}
                                onValueChange={val => setFormData({ ...formData, assigneeId: val || "" })}
                                disabled={saving}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-1.5"><Tag className="h-3 w-3" /> Labels</label>
                            <Input
                                value={formData.labels}
                                onChange={e => setFormData({ ...formData, labels: e.target.value })}
                                placeholder="bug, fix, UI"
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                className="min-h-[120px]"
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Add more details about this issue..."
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.title || saving} className="min-w-[120px]">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editIssueId ? "Update Issue" : "Create Issue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Issue</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 py-4">
                        Are you sure you want to delete **{issues.find(i => i.id === confirmDelete)?.title}**?
                        This action is permanent and will also remove it from GitHub if linked.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
                            {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete Issue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
