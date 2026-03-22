"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const handleLogout = async () => {
    await signOut({ redirect: true });
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
}
