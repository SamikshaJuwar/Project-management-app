// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { Button } from "@/components/ui/button";
// import {
//     Table,
//     TableBody,
//     TableCell,
//     TableHead,
//     TableHeader,
//     TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Trash, Edit, Plus, ChevronsUpDown, Check, ExternalLink, Download, Loader2, FolderKanban, Github } from "lucide-react";
// import {
//     Command,
//     CommandEmpty,
//     CommandGroup,
//     CommandInput,
//     CommandItem,
//     CommandList,
// } from "@/components/ui/command";
// import {
//     Popover,
//     PopoverContent,
//     PopoverTrigger,
// } from "@/components/ui/popover";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { Skeleton } from "@/components/ui/skeleton";

// type Project = {
//     id: string;
//     name: string;
//     description: string;
//     repoOwner?: string;
//     repoName?: string;
//     githubProjectId?: string;
//     githubProjectNumber?: number;
//     status: string;
//     milestoneCount: number;
//     issueCount: number;
//     createdAt: string;
// };

// type Repo = {
//     id: number;
//     name: string;
//     fullName: string;
//     owner: string;
// };

// type GithubProject = {
//     id: string;
//     number: number;
//     title: string;
//     shortDescription: string | null;
//     url: string;
//     closed: boolean;
//     updatedAt: string;
// };

// export default function ProjectsPage() {
//     const [projects, setProjects] = useState<Project[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);

//     const [repos, setRepos] = useState<Repo[]>([]);
//     const [githubProjects, setGithubProjects] = useState<GithubProject[]>([]);
//     const [importDialogOpen, setImportDialogOpen] = useState(false);
//     const [importLoading, setImportLoading] = useState(false);
//     const [importingId, setImportingId] = useState<string | null>(null);
//     const [alreadyImported, setAlreadyImported] = useState<Set<string>>(new Set());

//     const [openDialog, setOpenDialog] = useState(false);
//     const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
//     const [editProjectId, setEditProjectId] = useState<string | null>(null);
//     const [deletingId, setDeletingId] = useState<string | null>(null);

//     const [formData, setFormData] = useState({
//         name: "",
//         description: "",
//         repoOwner: "",
//         repoName: "",
//     });

//     const [repoComboboxOpen, setRepoComboboxOpen] = useState(false);

//     const fetchProjects = useCallback(async () => {
//         setLoading(true);
//         try {
//             const res = await fetch("/api/projects");
//             if (res.ok) {
//                 const data = await res.json();
//                 setProjects(data);
//             } else {
//                 const err = await res.json();
//                 toast.error(err.error || "Failed to fetch projects");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("Network error while fetching projects");
//         } finally {
//             setLoading(false);
//         }
//     }, []);

//     useEffect(() => {
//         fetchProjects();
//     }, [fetchProjects]);

//     const fetchRepos = async () => {
//         try {
//             const res = await fetch("/api/github/repos");
//             if (res.ok) {
//                 const data = await res.json();
//                 setRepos(data);
//             }
//         } catch (e) {
//             console.error(e);
//         }
//     };

//     const fetchGithubProjects = async () => {
//         setImportLoading(true);
//         try {
//             const res = await fetch("/api/github/projects");
//             if (res.ok) {
//                 const data: GithubProject[] = await res.json();
//                 setGithubProjects(data);
//                 const importedIds = new Set(
//                     projects.filter(p => p.githubProjectId).map(p => p.githubProjectId!)
//                 );
//                 setAlreadyImported(importedIds);
//             } else {
//                 const err = await res.json();
//                 toast.error(err.error || "Failed to fetch GitHub projects");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("Failed to connect to GitHub");
//         } finally {
//             setImportLoading(false);
//         }
//     };

//     const handleOpenImport = () => {
//         setImportDialogOpen(true);
//         fetchGithubProjects();
//     };

//     const handleImport = async (ghProject: GithubProject) => {
//         setImportingId(ghProject.id);
//         try {
//             const res = await fetch("/api/projects", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     name: ghProject.title,
//                     description: ghProject.shortDescription || "",
//                     githubProjectId: ghProject.id,
//                     githubProjectNumber: ghProject.number,
//                 }),
//             });
//             const data = await res.json();
//             if (res.ok) {
//                 setAlreadyImported(prev => new Set([...prev, ghProject.id]));
//                 fetchProjects();
//                 toast.success(`Imported "${ghProject.title}" from GitHub`, {
//                     description: "Project and milestones are now being synced.",
//                     action: ghProject.url ? {
//                         label: "Open on GitHub",
//                         onClick: () => window.open(ghProject.url, "_blank")
//                     } : undefined
//                 });
//             } else {
//                 toast.error(data.error || "Failed to import project");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("Unexpected error during import");
//         } finally {
//             setImportingId(null);
//         }
//     };

//     const handleOpenNew = () => {
//         setFormData({ name: "", description: "", repoOwner: "", repoName: "" });
//         setEditProjectId(null);
//         setOpenDialog(true);
//         if (!repos.length) fetchRepos();
//     };

//     const handleOpenEdit = (project: Project) => {
//         setFormData({
//             name: project.name,
//             description: project.description || "",
//             repoOwner: project.repoOwner || "",
//             repoName: project.repoName || "",
//         });
//         setEditProjectId(project.id);
//         setOpenDialog(true);
//         if (!repos.length) fetchRepos();
//     };

//     const handleSave = async () => {
//         setSaving(true);
//         try {
//             const url = editProjectId ? `/api/projects/${editProjectId}` : "/api/projects";
//             const method = editProjectId ? "PATCH" : "POST";
//             const res = await fetch(url, {
//                 method,
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(formData)
//             });
//             const data = await res.json();
//             if (res.ok) {
//                 setOpenDialog(false);
//                 fetchProjects();
//                 if (data.githubWarning) {
//                     toast.warning("Project partially saved", { description: data.githubWarning });
//                 } else {
//                     toast.success(editProjectId ? "Project updated" : "Project created successfully");
//                 }
//             } else {
//                 toast.error(data.error || "Failed to save project");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("A network error occurred");
//         } finally {
//             setSaving(false);
//         }
//     };

//     const handleDelete = async (id: string) => {
//         setDeletingId(id);
//         try {
//             const res = await fetch(`/api/projects/${id}`, {
//                 method: "DELETE"
//             });
//             if (res.ok) {
//                 setConfirmDelete(null);
//                 fetchProjects();
//                 toast.success("Project deleted");
//             } else {
//                 const data = await res.json();
//                 toast.error(data.error || "Failed to delete project");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("Failed to reach server");
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     const ProjectSkeleton = () => (
//         <>
//             {[...Array(5)].map((_, i) => (
//                 <TableRow key={`skeleton-${i}`}>
//                     <TableCell><Skeleton className="h-5 w-32" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-24" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-16" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-8" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-8" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
//                     <TableCell><Skeleton className="h-5 w-20" /></TableCell>
//                     <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
//                 </TableRow>
//             ))}
//         </>
//     );

//     return (
//         <div className="p-8 relative">
//             <div className="flex items-center justify-between mb-8">
//                 <div>
//                     <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
//                     <p className="text-muted-foreground mt-2">Manage your project portfolio and GitHub integrations.</p>
//                 </div>
//                 <div className="flex gap-2">
//                     <Button variant="outline" onClick={handleOpenImport}>
//                         <Download className="mr-2 h-4 w-4" /> Import
//                     </Button>
//                     <Button onClick={handleOpenNew}>
//                         <Plus className="mr-2 h-4 w-4" /> New Project
//                     </Button>
//                 </div>
//             </div>

//             <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
//                 <Table>
//                     <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
//                         <TableRow>
//                             <TableHead>Name</TableHead>
//                             <TableHead>Repository</TableHead>
//                             <TableHead>GitHub Project</TableHead>
//                             <TableHead>Milestones</TableHead>
//                             <TableHead>Issues</TableHead>
//                             <TableHead>Status</TableHead>
//                             <TableHead>Created</TableHead>
//                             <TableHead className="text-right">Actions</TableHead>
//                         </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                         {loading ? (
//                             <ProjectSkeleton />
//                         ) : projects.length === 0 ? (
//                             <TableRow>
//                                 <TableCell colSpan={8} className="text-center py-12">
//                                     <div className="flex flex-col items-center gap-2 text-muted-foreground">
//                                         <FolderKanban className="h-8 w-8 opacity-20" />
//                                         <p>No projects found. Create one to get started.</p>
//                                     </div>
//                                 </TableCell>
//                             </TableRow>
//                         ) : (
//                             projects.map(project => (
//                                 <TableRow key={project.id} className="group transition-colors">
//                                     <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</TableCell>
//                                     <TableCell className="text-slate-500 font-mono text-xs">
//                                         {project.repoOwner ? `${project.repoOwner}/${project.repoName}` : <span className="text-slate-300">—</span>}
//                                     </TableCell>
//                                     <TableCell>
//                                         {project.githubProjectNumber ? (
//                                             <a
//                                                 href={`https://github.com/${project.repoOwner || "orgs"}/projects/${project.githubProjectNumber}`}
//                                                 target="_blank"
//                                                 rel="noopener noreferrer"
//                                                 className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
//                                             >
//                                                 #{project.githubProjectNumber} <ExternalLink className="h-3 w-3" />
//                                             </a>
//                                         ) : (
//                                             <span className="text-slate-300">—</span>
//                                         )}
//                                     </TableCell>
//                                     <TableCell>
//                                         <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">{project.milestoneCount}</Badge>
//                                     </TableCell>
//                                     <TableCell>
//                                         <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">{project.issueCount}</Badge>
//                                     </TableCell>
//                                     <TableCell>
//                                         <Badge variant={project.status === "active" ? "default" : "secondary"} className={cn(
//                                             project.status === "active" ? "bg-green-500 hover:bg-green-600" : ""
//                                         )}>
//                                             {project.status}
//                                         </Badge>
//                                     </TableCell>
//                                     <TableCell className="text-slate-500 text-sm">{new Date(project.createdAt).toLocaleDateString()}</TableCell>
//                                     <TableCell className="text-right">
//                                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(project)}>
//                                                 <Edit className="h-4 w-4" />
//                                             </Button>
//                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmDelete(project.id)}>
//                                                 <Trash className="h-4 w-4" />
//                                             </Button>
//                                         </div>
//                                     </TableCell>
//                                 </TableRow>
//                             ))
//                         )}
//                     </TableBody>
//                 </Table>
//             </div>

//             <Dialog open={openDialog} onOpenChange={setOpenDialog}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>{editProjectId ? "Edit Project" : "New Project"}</DialogTitle>
//                     </DialogHeader>
//                     <div className="space-y-4 py-4">
//                         <div className="space-y-2">
//                             <label className="text-sm font-medium">Project Name</label>
//                             <Input
//                                 value={formData.name}
//                                 onChange={e => setFormData({ ...formData, name: e.target.value })}
//                                 placeholder="Enter project name"
//                                 disabled={saving}
//                             />
//                         </div>
//                         <div className="space-y-2">
//                             <label className="text-sm font-medium">Description</label>
//                             <Textarea
//                                 value={formData.description}
//                                 onChange={e => setFormData({ ...formData, description: e.target.value })}
//                                 placeholder="Project description or notes"
//                                 className="min-h-[100px]"
//                                 disabled={saving}
//                             />
//                         </div>
//                         <div className="space-y-2">
//                             <label className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Repository (Optional)</label>
//                             <Popover open={repoComboboxOpen} onOpenChange={setRepoComboboxOpen}>
//                                 <PopoverTrigger>
//                                     <Button
//                                         variant="outline"
//                                         role="combobox"
//                                         aria-expanded={repoComboboxOpen}
//                                         className="w-full justify-between font-normal"
//                                         disabled={saving}
//                                     >
//                                         {formData.repoName
//                                             ? `${formData.repoOwner}/${formData.repoName}`
//                                             : "Link to GitHub repository..."}
//                                         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                                     </Button>
//                                 </PopoverTrigger>
//                                 <PopoverContent className="w-[400px] p-0" align="start">
//                                     <Command>
//                                         <CommandInput placeholder="Search repository..." />
//                                         <CommandList>
//                                             <CommandEmpty>No repository found.</CommandEmpty>
//                                             <CommandGroup>
//                                                 {repos.map((repo) => (
//                                                     <CommandItem
//                                                         key={repo.fullName}
//                                                         value={repo.fullName}
//                                                         onSelect={(currentValue) => {
//                                                             const selectedRepo = repos.find(r => r.fullName.toLowerCase() === currentValue);
//                                                             if (selectedRepo) {
//                                                                 setFormData({
//                                                                     ...formData,
//                                                                     repoOwner: selectedRepo.owner,
//                                                                     repoName: selectedRepo.name,
//                                                                     name: formData.name || selectedRepo.name
//                                                                 });
//                                                             }
//                                                             setRepoComboboxOpen(false);
//                                                         }}
//                                                     >
//                                                         <Check
//                                                             className={cn(
//                                                                 "mr-2 h-4 w-4",
//                                                                 (formData.repoOwner === repo.owner && formData.repoName === repo.name) ? "opacity-100" : "opacity-0"
//                                                             )}
//                                                         />
//                                                         {repo.fullName}
//                                                     </CommandItem>
//                                                 ))}
//                                             </CommandGroup>
//                                         </CommandList>
//                                     </Command>
//                                 </PopoverContent>
//                             </Popover>
//                         </div>
//                     </div>
//                     <DialogFooter>
//                         <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
//                         <Button onClick={handleSave} disabled={!formData.name || saving} className="min-w-[100px]">
//                             {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Project"}
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>Delete Project</DialogTitle>
//                     </DialogHeader>
//                     <p className="text-sm text-slate-500 py-4">
//                         Are you sure you want to delete **{projects.find(p => p.id === confirmDelete)?.name}**?
//                         This will remove all associated milestones and issues. This action is permanent.
//                     </p>
//                     <DialogFooter>
//                         <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</Button>
//                         <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
//                             {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete Project"}
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
//                 <DialogContent className="max-w-2xl">
//                     <DialogHeader>
//                         <DialogTitle className="flex items-center gap-2">
//                             <Download className="h-5 w-5 text-indigo-600" /> Import GitHub Projects
//                         </DialogTitle>
//                     </DialogHeader>
//                     <div className="py-2">
//                         {importLoading ? (
//                             <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
//                                 <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
//                                 <p className="text-sm animate-pulse">Syncing with GitHub...</p>
//                             </div>
//                         ) : githubProjects.length === 0 ? (
//                             <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
//                                 <Github className="h-10 w-10 opacity-20" />
//                                 <p>No projects found in your GitHub account.</p>
//                             </div>
//                         ) : (
//                             <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
//                                 {githubProjects.map(ghp => {
//                                     const imported = alreadyImported.has(ghp.id);
//                                     const isImporting = importingId === ghp.id;
//                                     return (
//                                         <div key={ghp.id} className="flex items-center justify-between border rounded-lg px-4 py-3 gap-4 hover:border-indigo-100 transition-colors bg-slate-50/30">
//                                             <div className="flex-1 min-w-0">
//                                                 <div className="flex items-center gap-2 mb-1">
//                                                     <p className="font-semibold text-sm truncate">{ghp.title}</p>
//                                                     {ghp.closed && <Badge variant="secondary" className="shrink-0 text-[10px] h-4">Closed</Badge>}
//                                                 </div>
//                                                 {ghp.shortDescription && (
//                                                     <p className="text-xs text-muted-foreground truncate mb-1">{ghp.shortDescription}</p>
//                                                 )}
//                                                 <a
//                                                     href={ghp.url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 hover:underline"
//                                                 >
//                                                     #{ghp.number} <ExternalLink className="h-2 w-2" />
//                                                 </a>
//                                             </div>
//                                             <Button
//                                                 size="sm"
//                                                 variant={imported ? "secondary" : "default"}
//                                                 disabled={imported || isImporting}
//                                                 onClick={() => handleImport(ghp)}
//                                                 className="min-w-[80px]"
//                                             >
//                                                 {imported ? (
//                                                     <><Check className="h-3 w-3 mr-1" /> Linked</>
//                                                 ) : isImporting ? (
//                                                     <Loader2 className="h-3 w-3 animate-spin" />
//                                                 ) : (
//                                                     "Import"
//                                                 )}
//                                             </Button>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         )}
//                     </div>
//                     <DialogFooter>
//                         <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Close</Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }







"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Trash, Edit, Plus, ChevronsUpDown, Check, ExternalLink,
    Download, Loader2, FolderKanban, Github, GitBranch,
    MoreHorizontal, Layers, AlertCircle,
} from "lucide-react";
import {
    Command, CommandEmpty, CommandGroup,
    CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────── */

type Project = {
    id: string;
    name: string;
    description: string;
    repoOwner?: string;
    repoName?: string;
    githubProjectId?: string;
    githubProjectNumber?: number;
    status: string;
    milestoneCount: number;
    issueCount: number;
    createdAt: string;
};

type Repo = { id: number; name: string; fullName: string; owner: string };

type GithubProject = {
    id: string; number: number; title: string;
    shortDescription: string | null; url: string;
    closed: boolean; updatedAt: string;
};

/* ─── Constants ──────────────────────────────────────────────────── */

const COLUMNS: { key: string; label: string; color: string; accent: string }[] = [
    { key: "active",    label: "Active",    color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
    { key: "on_hold",   label: "On Hold",   color: "bg-amber-50 border-amber-200",     accent: "bg-amber-400"  },
    { key: "completed", label: "Completed", color: "bg-sky-50 border-sky-200",         accent: "bg-sky-500"    },
    { key: "archived",  label: "Archived",  color: "bg-slate-50 border-slate-200",     accent: "bg-slate-400"  },
];

/* ─── Analytics helpers ──────────────────────────────────────────── */

function buildAnalytics(project: Project) {
    const ratio =
        project.status === "completed" ? 1
        : project.status === "archived" ? 0.1
        : project.status === "on_hold" ? 0.25
        : 0.55;

    const closedIssues = Math.floor(project.issueCount * ratio);
    const openIssues   = project.issueCount - closedIssues;
    const doneMilestones = Math.floor(project.milestoneCount * ratio);
    const todoMilestones = project.milestoneCount - doneMilestones;
    const completionPct  = project.milestoneCount > 0 ? Math.round(ratio * 100) : 0;

    // Issue bar chart: open vs closed
    const issueBarData = [
        { label: "Open",   value: openIssues,   fill: "#f87171" },
        { label: "Closed", value: closedIssues, fill: "#34d399" },
    ];

    // Milestone bar chart: done vs remaining
    const milestoneBarData = [
        { label: "Done",      value: doneMilestones, fill: "#60a5fa" },
        { label: "Remaining", value: todoMilestones,  fill: "#cbd5e1" },
    ];

    // Fake weekly activity line data (7 weeks)
    const now = new Date(project.createdAt);
    const activityData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i * 7);
        const base = Math.max(1, Math.round(project.issueCount * ratio * ((i + 1) / 7)));
        return {
            week: `W${i + 1}`,
            commits: base + Math.floor(Math.sin(i) * 2),
        };
    });

    const daysSince = Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86_400_000);
    const relativeTime = daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`;

    return { closedIssues, openIssues, doneMilestones, todoMilestones, completionPct, issueBarData, milestoneBarData, activityData, relativeTime };
}

/* ─── Analytics Popup ────────────────────────────────────────────── */

function AnalyticsPopup({ project }: { project: Project }) {
    const a = buildAnalytics(project);

    return (
        <div className="absolute left-[calc(100%+12px)] top-0 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col gap-4 pointer-events-none">
            {/* Arrow */}
            <div className="absolute -left-[7px] top-5 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Analytics</p>
                <span className="text-[10px] text-slate-400">🕐 {a.relativeTime}</span>
            </div>

            {/* Completion */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Completion</span>
                <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    a.completionPct >= 75 ? "text-emerald-500"
                    : a.completionPct >= 40 ? "text-amber-500"
                    : "text-rose-500"
                )}>
                    {a.completionPct}%
                </span>
            </div>

            {/* Issues bar chart */}
            <div>
                <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Issues
                </p>
                <ResponsiveContainer width="100%" height={64}>
                    <BarChart data={a.issueBarData} barCategoryGap="30%">
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }}
                            cursor={{ fill: "#f1f5f9" }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {a.issueBarData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Milestones bar chart */}
            <div>
                <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Milestones
                </p>
                <ResponsiveContainer width="100%" height={64}>
                    <BarChart data={a.milestoneBarData} barCategoryGap="30%">
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }}
                            cursor={{ fill: "#f1f5f9" }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {a.milestoneBarData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Weekly activity line chart */}
            <div>
                <p className="text-[11px] text-slate-400 mb-1.5">Weekly Activity</p>
                <ResponsiveContainer width="100%" height={56}>
                    <LineChart data={a.activityData}>
                        <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="commits"
                            stroke="#818cf8"
                            strokeWidth={2}
                            dot={{ r: 2, fill: "#818cf8" }}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/* ─── ProjectCard ────────────────────────────────────────────────── */

function ProjectCard({
    project,
    onEdit,
    onDelete,
    onStatusChange,
}: {
    project: Project;
    onEdit: (p: Project) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        if (!menuOpen) setHovered(true);
    };
    const handleMouseLeave = () => {
        leaveTimer.current = setTimeout(() => setHovered(false), 120);
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Card */}
            <div className={cn(
                "bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-2.5 transition-all duration-150",
                hovered ? "border-indigo-300 shadow-md" : "border-slate-200"
            )}>
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1">
                        {project.name}
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
                                onClick={() => { setMenuOpen(false); onEdit(project); }}
                            >
                                <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <p className="px-2 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Move to</p>
                            {COLUMNS.filter(c => c.key !== project.status).map(col => (
                                <button
                                    key={col.key}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700"
                                    onClick={() => { setMenuOpen(false); onStatusChange(project.id, col.key); }}
                                >
                                    <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                                    {col.label}
                                </button>
                            ))}
                            <div className="my-1 border-t border-slate-100" />
                            <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 text-red-600"
                                onClick={() => { setMenuOpen(false); onDelete(project.id); }}
                            >
                                <Trash className="h-3.5 w-3.5" /> Delete
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>

                {project.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{project.description}</p>
                )}

                {project.repoOwner && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono bg-slate-50 rounded-md px-2 py-1 w-fit max-w-full overflow-hidden">
                        <GitBranch className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{project.repoOwner}/{project.repoName}</span>
                    </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Layers className="h-3 w-3" /> {project.milestoneCount}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <AlertCircle className="h-3 w-3" /> {project.issueCount}
                        </span>
                    </div>
                    {project.githubProjectNumber ? (
                        <a
                            href={`https://github.com/${project.repoOwner || "orgs"}/projects/${project.githubProjectNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            #{project.githubProjectNumber} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    ) : (
                        <span className="text-[11px] text-slate-300 font-mono">
                            {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    )}
                </div>
            </div>

            {/* Side analytics popup */}
            {hovered && <AnalyticsPopup project={project} />}
        </div>
    );
}

/* ─── KanbanColumn ───────────────────────────────────────────────── */

function KanbanColumn({
    column, projects, onEdit, onDelete, onStatusChange, onAddNew,
}: {
    column: typeof COLUMNS[number];
    projects: Project[];
    onEdit: (p: Project) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    onAddNew: () => void;
}) {
    return (
        <div className={cn("flex flex-col rounded-2xl border min-h-[480px] w-72 shrink-0", column.color)}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", column.accent)} />
                    <span className="text-sm font-semibold text-slate-700">{column.label}</span>
                    <span className="text-xs font-medium text-slate-400 bg-white/70 rounded-full px-2 py-0.5 border border-slate-200">
                        {projects.length}
                    </span>
                </div>
                {column.key === "active" && (
                    <button
                        onClick={onAddNew}
                        className="p-1 rounded-md hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
                        title="New project"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-3 p-3 flex-1">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
                        <FolderKanban className="h-7 w-7 text-slate-400" />
                        <p className="text-xs text-slate-400">No projects</p>
                    </div>
                ) : (
                    projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStatusChange={onStatusChange}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [repos, setRepos] = useState<Repo[]>([]);
    const [githubProjects, setGithubProjects] = useState<GithubProject[]>([]);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [alreadyImported, setAlreadyImported] = useState<Set<string>>(new Set());

    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editProjectId, setEditProjectId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({ name: "", description: "", repoOwner: "", repoName: "" });
    const [repoComboboxOpen, setRepoComboboxOpen] = useState(false);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/projects");
            if (res.ok) setProjects(await res.json());
            else toast.error((await res.json()).error || "Failed to fetch projects");
        } catch (e) {
            console.error(e);
            toast.error("Network error while fetching projects");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const fetchRepos = async () => {
        try {
            const res = await fetch("/api/github/repos");
            if (res.ok) setRepos(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchGithubProjects = async () => {
        setImportLoading(true);
        try {
            const res = await fetch("/api/github/projects");
            if (res.ok) {
                const data: GithubProject[] = await res.json();
                setGithubProjects(data);
                setAlreadyImported(new Set(
                    projects.filter(p => p.githubProjectId).map(p => p.githubProjectId!)
                ));
            } else {
                toast.error((await res.json()).error || "Failed to fetch GitHub projects");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to connect to GitHub");
        } finally {
            setImportLoading(false);
        }
    };

    const handleOpenImport = () => { setImportDialogOpen(true); fetchGithubProjects(); };

    const handleImport = async (ghp: GithubProject) => {
        setImportingId(ghp.id);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: ghp.title, description: ghp.shortDescription || "",
                    githubProjectId: ghp.id, githubProjectNumber: ghp.number,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setAlreadyImported(prev => new Set([...prev, ghp.id]));
                fetchProjects();
                toast.success(`Imported "${ghp.title}" from GitHub`, {
                    description: "Project and milestones are now being synced.",
                    action: ghp.url ? { label: "Open on GitHub", onClick: () => window.open(ghp.url, "_blank") } : undefined,
                });
            } else {
                toast.error(data.error || "Failed to import project");
            }
        } catch (e) {
            console.error(e);
            toast.error("Unexpected error during import");
        } finally {
            setImportingId(null);
        }
    };

    const handleOpenNew = () => {
        setFormData({ name: "", description: "", repoOwner: "", repoName: "" });
        setEditProjectId(null);
        setOpenDialog(true);
        if (!repos.length) fetchRepos();
    };

    const handleOpenEdit = (project: Project) => {
        setFormData({
            name: project.name, description: project.description || "",
            repoOwner: project.repoOwner || "", repoName: project.repoName || "",
        });
        setEditProjectId(project.id);
        setOpenDialog(true);
        if (!repos.length) fetchRepos();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editProjectId ? `/api/projects/${editProjectId}` : "/api/projects";
            const method = editProjectId ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                setOpenDialog(false);
                fetchProjects();
                if (data.githubWarning) {
                    toast.warning("Project partially saved", { description: data.githubWarning });
                } else {
                    toast.success(editProjectId ? "Project updated" : "Project created successfully");
                }
            } else {
                toast.error(data.error || "Failed to save project");
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
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
            if (res.ok) { setConfirmDelete(null); fetchProjects(); toast.success("Project deleted"); }
            else toast.error((await res.json()).error || "Failed to delete project");
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach server");
        } finally {
            setDeletingId(null);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                toast.error((await res.json()).error || "Failed to update status");
                fetchProjects();
            } else {
                toast.success("Project moved");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
            fetchProjects();
        }
    };

    const projectsByStatus = (status: string) => projects.filter(p => p.status === status);

    const KanbanSkeleton = () => (
        <div className="flex gap-5">
            {COLUMNS.map(col => (
                <div key={col.key} className={cn("rounded-2xl border w-72 shrink-0 p-3 space-y-3", col.color)}>
                    <div className="h-8 bg-white/60 rounded-lg animate-pulse" />
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-xl p-4 space-y-2 animate-pulse h-28">
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                            <div className="h-3 bg-slate-100 rounded w-full" />
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
                    <p className="text-muted-foreground mt-1.5">Manage your project portfolio and GitHub integrations.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenImport}>
                        <Download className="mr-2 h-4 w-4" /> Import
                    </Button>
                    <Button onClick={handleOpenNew}>
                        <Plus className="mr-2 h-4 w-4" /> New Project
                    </Button>
                </div>
            </div>

            {/* Kanban board — extra right padding so popup doesn't clip */}
            <div className="overflow-x-auto pb-4 pr-72">
                {loading ? (
                    <KanbanSkeleton />
                ) : (
                    <div className="flex gap-5 min-w-max">
                        {COLUMNS.map(col => (
                            <KanbanColumn
                                key={col.key}
                                column={col}
                                projects={projectsByStatus(col.key)}
                                onEdit={handleOpenEdit}
                                onDelete={(id) => setConfirmDelete(id)}
                                onStatusChange={handleStatusChange}
                                onAddNew={handleOpenNew}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* New / Edit Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editProjectId ? "Edit Project" : "New Project"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter project name"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Description</label>
                               <Textarea
                                   value={formData.description}
                                   onChange={e => setFormData({ ...formData, description: e.target.value })}
                                   placeholder="Project description or notes"
                                   className="min-h-[100px]"
                                   disabled={saving}
                                />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Repository (Optional)</label>
                            <Popover open={repoComboboxOpen} onOpenChange={setRepoComboboxOpen}>
                                <PopoverTrigger>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={repoComboboxOpen}
                                        className="w-full justify-between font-normal"
                                        disabled={saving}
                                    >
                                        {formData.repoName
                                            ? `${formData.repoOwner}/${formData.repoName}`
                                            : "Link to GitHub repository..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search repository..." />
                                        <CommandList>
                                            <CommandEmpty>No repository found.</CommandEmpty>
                                            <CommandGroup>
                                                {repos.map((repo) => (
                                                    <CommandItem
                                                        key={repo.fullName}
                                                        value={repo.fullName}
                                                        onSelect={(currentValue) => {
                                                            const selectedRepo = repos.find(r => r.fullName.toLowerCase() === currentValue);
                                                            if (selectedRepo) {
                                                                setFormData({
                                                                    ...formData,
                                                                    repoOwner: selectedRepo.owner,
                                                                    repoName: selectedRepo.name,
                                                                    name: formData.name || selectedRepo.name,
                                                                });
                                                            }
                                                            setRepoComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn(
                                                            "mr-2 h-4 w-4",
                                                            (formData.repoOwner === repo.owner && formData.repoName === repo.name) ? "opacity-100" : "opacity-0"
                                                        )} />
                                                        {repo.fullName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.name || saving} className="min-w-[100px]">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-500 py-4">
                        Are you sure you want to delete{" "}
                        <strong>{projects.find(p => p.id === confirmDelete)?.name}</strong>?
                        This will remove all associated milestones and issues. This action is permanent.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
                            {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import GitHub Projects */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-indigo-600" /> Import GitHub Projects
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        {importLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                <p className="text-sm animate-pulse">Syncing with GitHub...</p>
                            </div>
                        ) : githubProjects.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                                <Github className="h-10 w-10 opacity-20" />
                                <p>No projects found in your GitHub account.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {githubProjects.map(ghp => {
                                    const imported = alreadyImported.has(ghp.id);
                                    const isImporting = importingId === ghp.id;
                                    return (
                                        <div key={ghp.id} className="flex items-center justify-between border rounded-lg px-4 py-3 gap-4 hover:border-indigo-100 transition-colors bg-slate-50/30">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-sm truncate">{ghp.title}</p>
                                                    {ghp.closed && <Badge variant="secondary" className="shrink-0 text-[10px] h-4">Closed</Badge>}
                                                </div>
                                                {ghp.shortDescription && (
                                                    <p className="text-xs text-muted-foreground truncate mb-1">{ghp.shortDescription}</p>
                                                )}
                                                <a
                                                    href={ghp.url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 hover:underline"
                                                >
                                                    #{ghp.number} <ExternalLink className="h-2 w-2" />
                                                </a>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={imported ? "secondary" : "default"}
                                                disabled={imported || isImporting}
                                                onClick={() => handleImport(ghp)}
                                                className="min-w-[80px]"
                                            >
                                                {imported ? <><Check className="h-3 w-3 mr-1" /> Linked</>
                                                : isImporting ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : "Import"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}