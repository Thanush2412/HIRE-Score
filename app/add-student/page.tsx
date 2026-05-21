"use client";

import { StudentForm } from "@/components/student-form";
import { useEffect } from "react";

export default function AddStudentPage() {
  useEffect(() => {
    // Theme styling
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-8 px-2 sm:px-4 max-w-[1600px] mx-auto">
      <StudentForm />
    </div>
  );
}
