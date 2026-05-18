"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GraduationCap, Moon, Sun, LayoutDashboard, Users, UserPlus, Settings, Link2, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Auth check
    const auth = sessionStorage.getItem("hire_auth");
    if (!auth) {
      router.replace("/login");
      return;
    }
    setAuthed(true);

    // Theme
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const logout = () => {
    sessionStorage.removeItem("hire_auth");
    router.replace("/login");
  };

  const navItems = [
    { path: "/", label: "Overview", icon: LayoutDashboard },
    { path: "/students", label: "Students", icon: Users },
    { path: "/add-student", label: "Add Student", icon: UserPlus },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const hideHeader = pathname === "/add-student" || pathname.startsWith("/students/");

  // Don't render anything until auth confirmed
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl pointer-events-none">
        <header className="pointer-events-auto rounded-xl sm:rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 px-3 sm:px-4 h-12 sm:h-13 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer" onClick={() => router.push("/")}>
            <img src="/logo.png" alt="HIRE Logo" className="h-8 w-auto sm:h-10" />
          </div>
        </header>
      </div>

      <main className="pt-16 sm:pt-20 pb-8 px-2 sm:px-4 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  );
}
