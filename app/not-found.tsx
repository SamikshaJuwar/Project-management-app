import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, Ghost } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <Ghost className="h-24 w-24 text-gray-200 dark:text-gray-800 animate-bounce" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">404</span>
                        </div>
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                    Page not found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                    Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                </p>
                <Link href="/dashboard">
                    <Button className="gap-2">
                        <MoveLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}
