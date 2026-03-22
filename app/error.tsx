"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
            <Card className="max-w-md w-full border-red-100 dark:border-red-900/30">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong!</CardTitle>
                    <CardDescription className="mt-2 text-gray-600 dark:text-gray-400">
                        {error.message || "An unexpected error occurred while processing your request."}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-col gap-2">
                    <Button onClick={() => reset()} className="w-full gap-2">
                        <RefreshCcw className="h-4 w-4" /> Try again
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="outline" className="w-full">Back to Dashboard</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
