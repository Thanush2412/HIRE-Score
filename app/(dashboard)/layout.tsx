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
      {!hideHeader && (
        <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl pointer-events-none">
          <header className="pointer-events-auto rounded-xl sm:rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 px-3 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer" onClick={() => router.push("/")}>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
                <GraduationCap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xs sm:text-sm tracking-tight hidden xs:inline">HIRE Score</span>
            </div>

            <nav className="flex-1 flex justify-center overflow-x-auto">
              <div className="flex h-7 sm:h-8 bg-muted/50 p-0.5 gap-0.5 rounded-lg sm:rounded-xl">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className={`h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl transition-all flex items-center whitespace-nowrap ${
                        isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg"
                onClick={() => router.push("/share-links")}
                title="Share Links"
              >
                <Link2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 rounded-lg" onClick={toggleDark}>
                {dark ? <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={logout} title="Logout">
                <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </header>
        </div>
      )}

      <main className={hideHeader ? "pt-4 sm:pt-8 pb-8 px-2 sm:px-4 max-w-[1600px] mx-auto" : "pt-16 sm:pt-20 pb-8 px-2 sm:px-4 max-w-[1600px] mx-auto"}>
        {children}
      </main>
    </div>
  );
}
