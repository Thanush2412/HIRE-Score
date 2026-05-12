"use client";

import { useEffect, useState, use } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { OverviewStats } from "@/components/overview-stats";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      handleToken(token);
    }
  }, [token]);

  async function handleToken(t: string) {
    try {
      const res = await fetch(`/api/share-tokens/by-token/${t}`);
      if (!res.ok) {
        setError("This share link is invalid or has been deactivated.");
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      // Save filters to session storage for OverviewStats to pick up
      const filter = {
        colleges: data.colleges,
        courses: data.courses,
        years: data.years
      };
      
      sessionStorage.setItem("shareFilter", JSON.stringify(filter));
      setLoading(false);
    } catch (e) {
      console.error("Failed to process share token:", e);
      setError("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium animate-pulse text-muted-foreground">
          Accessing shared dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-primary-foreground font-bold">H</span>
          </div>
          <h1 className="font-bold text-lg tracking-tight">HIRE Score Dashboard</h1>
        </div>
        <div className="text-xs font-semibold text-muted-foreground px-3 py-1 rounded-full bg-muted">
          Read Only View
        </div>
      </div>
      <OverviewStats refresh={0} />
    </div>
  );
}
