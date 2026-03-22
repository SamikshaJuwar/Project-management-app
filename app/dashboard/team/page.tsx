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
import {
    Edit,
    Plus,
    User as UserIcon,
    ShieldCheck,
    ShieldAlert,
    Shield,
    Github,
    UserMinus,
    Trash2,
    Loader2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: "SUPERADMIN" | "MANAGER" | "EMPLOYEE";
    githubLogin: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    createdAt: string;
};

export default function TeamPage() {
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null); // NEW: hard delete confirmation
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null); // NEW: tracks deleting state

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "EMPLOYEE",
        password: "",
        githubLogin: "",
        githubToken: "",
        isActive: true,
    });

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/team");
            if (res.ok) {
                setTeam(await res.json());
            } else if (res.status === 401) {
                toast.error("Only Superadmins can access this page.");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to fetch team");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error while loading team");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const handleOpenNew = () => {
        setFormData({
            name: "",
            email: "",
            role: "EMPLOYEE",
            password: "",
            githubLogin: "",
            githubToken: "",
            isActive: true,
        });
        setEditUserId(null);
        setOpenDialog(true);
    };

    const handleOpenEdit = (user: User) => {
        setFormData({
            name: user.name || "",
            email: user.email,
            role: user.role,
            password: "",
            githubLogin: user.githubLogin || "",
            githubToken: "",
            isActive: user.isActive,
        });
        setEditUserId(user.id);
        setOpenDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editUserId ? `/api/team/${editUserId}` : "/api/team";
            const method = editUserId ? "PATCH" : "POST";

            const payload = { ...formData };
            if (editUserId && !payload.password) {
                // @ts-ignore
                delete payload.password;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setOpenDialog(false);
                fetchTeam();
                toast.success(editUserId ? "Member updated successfully" : "Member added successfully");
            } else {
                toast.error(data.error || "Failed to save team member");
            }
        } catch (e) {
            console.error(e);
            toast.error("A network error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        setDeactivatingId(id);
        try {
            const res = await fetch(`/api/team/${id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (res.ok) {
                setConfirmDeactivate(null);
                fetchTeam();
                toast.success("Member deactivated");
            } else {
                toast.error(data.error || "Failed to deactivate member");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach server");
        } finally {
            setDeactivatingId(null);
        }
    };

    // NEW: Hard delete handler
    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/team/${id}?permanent=true`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (res.ok) {
                setConfirmDelete(null);
                // Optimistically remove from UI without full refetch
                setTeam(prev => prev.filter(u => u.id !== id));
                toast.success("Member permanently deleted");
            } else {
                toast.error(data.error || "Failed to delete member");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach server");
        } finally {
            setDeletingId(null);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "SUPERADMIN":
                return <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900 gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Superadmin</Badge>;
            case "MANAGER":
                return <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900 gap-1"><Shield className="h-2.5 w-2.5" /> Manager</Badge>;
            default:
                return <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900 gap-1"><ShieldAlert className="h-2.5 w-2.5" /> Employee</Badge>;
        }
    };

    const UserSkeleton = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
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
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-muted-foreground mt-2">Manage users, roles, and system access levels.</p>
                </div>
                <Button onClick={handleOpenNew} size="sm" className="h-9">
                    <Plus className="mr-2 h-4 w-4" /> Add Member
                </Button>
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>GitHub</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <UserSkeleton />
                        ) : team.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <UserIcon className="h-8 w-8 opacity-20" />
                                        <p>No team members found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            team.map(user => (
                                <TableRow key={user.id} className="group transition-colors">
                                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                        <div className="flex items-center gap-3">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-slate-200" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <UserIcon className="h-4 w-4 text-slate-400" />
                                                </div>
                                            )}
                                            <span>{user.name || "Unknown"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-normal text-slate-500">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(user.role)}
                                    </TableCell>
                                    <TableCell>
                                        {user.githubLogin ? (
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                                <Github className="h-3.5 w-3.5" /> <span>{user.githubLogin}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 italic text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", user.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300")}></div>
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-wider font-bold",
                                                user.isActive ? "text-green-600 dark:text-green-400" : "text-slate-400"
                                            )}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] text-slate-400 font-mono">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(user)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {user.isActive && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmDeactivate(user.id)}>
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {/* NEW: Permanent delete button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => setConfirmDelete(user)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Existing: Edit / Add dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editUserId ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Jane Doe"
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="jane@example.com"
                                    disabled={!!editUserId || saving}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium">Password {editUserId && "(leave blank to keep current)"}</label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={val => setFormData({ ...formData, role: val || "EMPLOYEE" })}
                                    disabled={saving}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">GitHub User</label>
                                <Input
                                    value={formData.githubLogin}
                                    onChange={e => setFormData({ ...formData, githubLogin: e.target.value })}
                                    placeholder="octocat"
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium">GitHub PAT (Optional)</label>
                                <Input
                                    type="password"
                                    value={formData.githubToken}
                                    onChange={e => setFormData({ ...formData, githubToken: e.target.value })}
                                    placeholder="github_pat_..."
                                    disabled={saving}
                                />
                            </div>
                            {editUserId && (
                                <div className="flex items-center justify-between col-span-2 pt-4 border-t mt-2">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Active Status</label>
                                        <p className="text-[12px] text-slate-500">Allow this user to access the application.</p>
                                    </div>
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                                        disabled={saving}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.email || (!editUserId && !formData.password) || saving} className="min-w-[100px]">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editUserId ? "Update Member" : "Add Member"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Existing: Deactivate confirmation dialog */}
            <Dialog open={!!confirmDeactivate} onOpenChange={(open) => !open && setConfirmDeactivate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate Member</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 py-4">
                        Are you sure you want to deactivate this team member? This will immediately revoke their access, but their history and data will be preserved.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeactivate(null)} disabled={!!deactivatingId}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmDeactivate && handleDeactivate(confirmDeactivate)} disabled={!!deactivatingId}>
                            {deactivatingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deactivating...</> : "Yes, Deactivate Member"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* NEW: Permanent delete confirmation dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Permanently Delete Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-slate-500">
                            You are about to permanently delete{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {confirmDelete?.name || confirmDelete?.email}
                            </span>.
                        </p>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            ⚠️ This action cannot be undone. All data associated with this user will be permanently removed.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
                            disabled={!!deletingId}
                        >
                            {deletingId ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                            ) : (
                                <><Trash2 className="mr-2 h-4 w-4" /> Yes, Delete Permanently</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
