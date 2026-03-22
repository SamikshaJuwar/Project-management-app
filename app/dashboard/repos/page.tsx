"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Repo {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    private: boolean;
    url: string;
    description: string | null;
}

export default function ReposPage() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRepos();
    }, []);

    const fetchRepos = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/github/repos");
            if (!res.ok) {
                if (res.status === 400 || res.status === 401) {
                    setError("not_connected");
                } else {
                    setError("failed");
                }
                return;
            }
            const data = await res.json();
            setRepos(data);
        } catch {
            setError("failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRepo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/github/repos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, description: newDesc, isPrivate }),
            });
            if (res.ok) {
                setOpen(false);
                setNewName("");
                setNewDesc("");
                setIsPrivate(false);
                fetchRepos(); // Refresh
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || "Failed to create repository"}`);
            }
        } catch (error) {
            alert("Error creating repository");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardContent className="p-0">
                        <div className="p-4 space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error === "not_connected") {
        return (
            <div className="p-8 max-w-2xl mx-auto mt-10">
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                            <Github className="w-5 h-5" />
                            GitHub Not Connected
                        </CardTitle>
                        <CardDescription className="text-yellow-700 dark:text-yellow-600">
                            You need to connect a GitHub Personal Access Token to manage repositories.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/settings">
                            <Button>Go to Settings</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Repo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreateRepo}>
                            <DialogHeader>
                                <DialogTitle>Create Repository</DialogTitle>
                                <DialogDescription>
                                    Create a new GitHub repository directly from your dashboard.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Repository Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="my-awesome-project"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (optional)</Label>
                                    <Input
                                        id="description"
                                        placeholder="Brief description of your project"
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Private Repository</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Only you choose who can see and commit to this repository.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={isPrivate}
                                        onCheckedChange={setIsPrivate}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting || !newName}>
                                    {submitting ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {repos.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                    No repositories found.
                                </TableCell>
                            </TableRow>
                        )}
                        {repos.map((repo) => (
                            <TableRow key={repo.id}>
                                <TableCell className="font-medium">
                                    <a href={repo.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-2">
                                        <Github className="w-4 h-4" />
                                        {repo.name}
                                    </a>
                                </TableCell>
                                <TableCell>{repo.owner}</TableCell>
                                <TableCell>
                                    {repo.private ? (
                                        <Badge variant="secondary">Private</Badge>
                                    ) : (
                                        <Badge variant="outline">Public</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-md truncate">
                                    {repo.description || "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
