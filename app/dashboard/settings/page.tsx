"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, CheckCircle, AlertCircle, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type GithubUser = { login: string | null; avatarUrl: string | null };
type GithubUsers = { token1: GithubUser; token2: GithubUser };

export default function SettingsPage() {
    const { status } = useSession();
    const [token1, setToken1] = useState("");
    const [token2, setToken2] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState<null | "1" | "2" | "both">(null);
    const [checking, setChecking] = useState(true);
    const [githubUsers, setGithubUsers] = useState<GithubUsers>({
        token1: { login: null, avatarUrl: null },
        token2: { login: null, avatarUrl: null },
    });

    const checkConnection = useCallback(async () => {
        setChecking(true);
        try {
            const res = await fetch("/api/github/repos");
            if (res.ok) {
                const repos = await res.json();
                const login = repos?.[0]?.owner ?? "Connected";
                setGithubUsers((prev) => ({
                    ...prev,
                    token1: { login, avatarUrl: null },
                }));
            } else {
                setGithubUsers((prev) => ({
                    ...prev,
                    token1: { login: null, avatarUrl: null },
                }));
            }
        } catch (e) {
            console.error("Check connection error:", e);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    const handleConnect = async () => {
        if (!token1 && !token2) return;
        setConnecting(true);
        try {
            const res = await fetch("/api/github/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(token1 && { token1 }),
                    ...(token2 && { token2 }),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setGithubUsers({
                    token1: { login: data.login ?? null, avatarUrl: data.avatarUrl ?? null },
                    token2: { login: data.login2 ?? null, avatarUrl: null },
                });
                setToken1("");
                setToken2("");
                toast.success("GitHub token(s) connected successfully");
            } else {
                toast.error(data.error || "Failed to connect token(s)");
            }
        } catch (error) {
            console.error("Connect error:", error);
            toast.error("An unexpected error occurred while connecting");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async (which: "1" | "2" | "both") => {
        setDisconnecting(which);
        try {
            const url =
                which === "both"
                    ? "/api/github/token"
                    : `/api/github/token?token=${which}`;
            const res = await fetch(url, { method: "DELETE" });
            if (res.ok) {
                setGithubUsers((prev) => ({
                    token1: which !== "2" ? { login: null, avatarUrl: null } : prev.token1,
                    token2: which !== "1" ? { login: null, avatarUrl: null } : prev.token2,
                }));
                toast.success(
                    which === "both"
                        ? "All GitHub tokens disconnected"
                        : `Token ${which} disconnected`
                );
            } else {
                const data = await res.json();
                toast.error(data.error || "Error disconnecting");
            }
        } catch (e) {
            console.error("Disconnect error:", e);
            toast.error("Failed to disconnect");
        } finally {
            setDisconnecting(null);
        }
    };

    const isToken1Connected = !!githubUsers.token1.login;
    const isToken2Connected = !!githubUsers.token2.login;
    const eitherConnected = isToken1Connected || isToken2Connected;

    if (status === "loading") {
        return (
            <div className="p-8 max-w-2xl mx-auto space-y-6">
                <Skeleton className="h-9 w-32" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your account preferences and third-party integrations.
                </p>
            </div>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Github className="w-5 h-5 text-indigo-600" />
                        GitHub Integration
                    </CardTitle>
                    <CardDescription>
                        Connect two GitHub tokens — Token 1 for repos &amp; issues, Token 2 for GitHub Projects.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Status row */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Token 1 · Repos / Issues", user: githubUsers.token1 },
                            { label: "Token 2 · GitHub Projects", user: githubUsers.token2 },
                        ].map(({ label, user }) => (
                            <div
                                key={label}
                                className="flex flex-col gap-1.5 py-2 px-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
                            >
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {label}
                                </span>
                                {checking ? (
                                    <Skeleton className="h-6 w-28" />
                                ) : user.login ? (
                                    <Badge className="w-fit bg-green-100 text-green-800 border-green-200 hover:bg-green-100 gap-1.5 px-3 py-1 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        @{user.login}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Not connected
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Input fields — shown if either token is missing */}
                    {(!isToken1Connected || !isToken2Connected) && !checking && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-3 items-start text-sm text-slate-500 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                <Key className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                <p>
                                    Generate <strong>classic PATs</strong> at{" "}
                                    
                                        href="https://github.com/settings/tokens/new"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 font-semibold hover:underline"
                                    <a>
                                        github.com/settings/tokens
                                    </a>
                                    . Token 1 needs <code className="bg-indigo-100 dark:bg-indigo-900/40 px-1 rounded text-indigo-700 dark:text-indigo-300">repo</code> scope;
                                    Token 2 needs <code className="bg-indigo-100 dark:bg-indigo-900/40 px-1 rounded text-indigo-700 dark:text-indigo-300">project</code> scope.
                                </p>
                            </div>

                            {!isToken1Connected && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Token 1 — Repos &amp; Issues{" "}
                                        <span className="text-slate-400 font-normal">(repo scope)</span>
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="ghp_..."
                                        value={token1}
                                        onChange={(e) => setToken1(e.target.value)}
                                        className="font-mono h-11"
                                        disabled={connecting}
                                    />
                                </div>
                            )}

                            {!isToken2Connected && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Token 2 — GitHub Projects{" "}
                                        <span className="text-slate-400 font-normal">(project scope)</span>
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="ghp_..."
                                        value={token2}
                                        onChange={(e) => setToken2(e.target.value)}
                                        className="font-mono h-11"
                                        disabled={connecting}
                                    />
                                </div>
                            )}

                            <Button
                                onClick={handleConnect}
                                disabled={(!token1 && !token2) || connecting}
                                className="h-11 px-6 min-w-[140px]"
                            >
                                {connecting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting</>
                                ) : (
                                    "Link Token(s)"
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>

                {eitherConnected && !checking && (
                    <CardFooter className="border-t bg-slate-50/50 dark:bg-slate-900/30 px-6 py-4 flex flex-wrap gap-2">
                        {isToken1Connected && (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                onClick={() => handleDisconnect("1")}
                                disabled={disconnecting !== null}
                            >
                                {disconnecting === "1" ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Disconnecting...</>
                                ) : (
                                    "Disconnect Token 1"
                                )}
                            </Button>
                        )}
                        {isToken2Connected && (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                onClick={() => handleDisconnect("2")}
                                disabled={disconnecting !== null}
                            >
                                {disconnecting === "2" ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Disconnecting...</>
                                ) : (
                                    "Disconnect Token 2"
                                )}
                            </Button>
                        )}
                        {isToken1Connected && isToken2Connected && (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                onClick={() => handleDisconnect("both")}
                                disabled={disconnecting !== null}
                            >
                                {disconnecting === "both" ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Disconnecting...</>
                                ) : (
                                    "Disconnect Both"
                                )}
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}