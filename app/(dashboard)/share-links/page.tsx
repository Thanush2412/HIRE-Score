"use client";

import { useEffect, useState } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Link2, Copy, Trash2, ExternalLink,
  Building2, Calendar, Eye, CheckCircle2, Plus, QrCode, Pencil, X,
} from "lucide-react";

interface ShareToken {
  id: string;
  collegeName: string;
  colleges: string[];
  courses: string[];
  years: string[];
  token: string;
  createdAt?: string | null;
  lastAccessed?: string | null;
}

interface CollegeDef {
  name: string;
  courses: { name: string; years: string[] }[];
}

interface Settings {
  colleges: CollegeDef[];
}

// ── Reusable filter panel (used in both create and edit) ──────────────────────
function FilterPanel({
  settings,
  selectedColleges, setSelectedColleges,
  selectedCourses,  setSelectedCourses,
  selectedYears,    setSelectedYears,
}: {
  settings: Settings;
  selectedColleges: string[]; setSelectedColleges: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCourses:  string[]; setSelectedCourses:  React.Dispatch<React.SetStateAction<string[]>>;
  selectedYears:    string[]; setSelectedYears:    React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const toggleCollege = (name: string) => {
    setSelectedColleges(prev => {
      const next = prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name];
      // reset courses/years that no longer belong to selected colleges
      const validCourses = settings.colleges
        .filter(c => next.includes(c.name))
        .flatMap(c => c.courses.map(co => co.name));
      setSelectedCourses(sc => sc.filter(c => validCourses.includes(c)));
      setSelectedYears([]);
      return next;
    });
  };

  const activeCourses = settings.colleges
    .filter(c => selectedColleges.includes(c.name))
    .flatMap(c => c.courses);

  const toggleCourse = (name: string) => {
    setSelectedCourses(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
    setSelectedYears([]);
  };

  const coursesToCheck = selectedCourses.length > 0
    ? activeCourses.filter(c => selectedCourses.includes(c.name))
    : activeCourses;
  const availableYears = Array.from(new Set(coursesToCheck.flatMap(c => c.years))).sort();

  const toggleYear = (y: string) =>
    setSelectedYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y]);

  return (
    <div className="space-y-4">
      {/* Colleges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Colleges *</Label>
          <button
            type="button"
            onClick={() => setSelectedColleges(
              selectedColleges.length === settings.colleges.length
                ? []
                : settings.colleges.map(c => c.name)
            )}
            className="text-[11px] text-primary hover:underline"
          >
            {selectedColleges.length === settings.colleges.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 rounded-xl border bg-muted/20 max-h-40 overflow-y-auto">
          {settings.colleges.length === 0 ? (
            <p className="text-xs text-muted-foreground">No colleges configured — add them in Settings first</p>
          ) : settings.colleges.map(c => (
            <label key={c.name} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={selectedColleges.includes(c.name)}
                onCheckedChange={() => toggleCollege(c.name)}
              />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Courses */}
      {selectedColleges.length > 0 && activeCourses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Courses <span className="text-muted-foreground font-normal">(optional — leave blank for all)</span></Label>
            <button
              type="button"
              onClick={() => setSelectedCourses(
                selectedCourses.length === Array.from(new Set(activeCourses.map(c => c.name))).length
                  ? []
                  : Array.from(new Set(activeCourses.map(c => c.name)))
              )}
              className="text-[11px] text-primary hover:underline"
            >
              {selectedCourses.length === Array.from(new Set(activeCourses.map(c => c.name))).length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border bg-muted/20 max-h-40 overflow-y-auto">
            {Array.from(new Set(activeCourses.map(c => c.name))).map((courseName) => (
              <label key={courseName} className="flex items-center gap-2 cursor-pointer group">
                <Checkbox
                  checked={selectedCourses.includes(courseName)}
                  onCheckedChange={() => toggleCourse(courseName)}
                />
                <span className="text-xs font-medium group-hover:text-primary transition-colors">{courseName}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Years */}
      {selectedColleges.length > 0 && availableYears.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Years <span className="text-muted-foreground font-normal">(optional — leave blank for all)</span></Label>
            <button
              type="button"
              onClick={() => setSelectedYears(
                selectedYears.length === availableYears.length ? [] : [...availableYears]
              )}
              className="text-[11px] text-primary hover:underline"
            >
              {selectedYears.length === availableYears.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-muted/20">
            {availableYears.map(y => (
              <label key={y} className="flex items-center gap-2 cursor-pointer group">
                <Checkbox
                  checked={selectedYears.includes(y)}
                  onCheckedChange={() => toggleYear(y)}
                />
                <span className="text-xs font-medium group-hover:text-primary transition-colors">{y}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ShareLinksPage() {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [settings, setSettings] = useState<Settings>({ colleges: [] });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Create form
  const [createColleges, setCreateColleges] = useState<string[]>([]);
  const [createCourses,  setCreateCourses]  = useState<string[]>([]);
  const [createYears,    setCreateYears]    = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Edit modal
  const [editToken, setEditToken] = useState<ShareToken | null>(null);
  const [editColleges, setEditColleges] = useState<string[]>([]);
  const [editCourses,  setEditCourses]  = useState<string[]>([]);
  const [editYears,    setEditYears]    = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/share-tokens").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/settings").then(r => r.ok ? r.json() : { colleges: [] }).catch(() => ({ colleges: [] })),
    ]).then(([t, s]) => {
      const rows = Array.isArray(t) ? t : [];
      const mapped = rows.map((r: any) => ({
        id: r.id,
        collegeName: r.college_name ?? r.collegeName ?? "",
        colleges: r.colleges ?? (r.college_name ? [r.college_name] : []),
        courses: r.courses ?? [],
        years: r.years ?? [],
        token: r.token ?? r.token_value ?? "",
        createdAt: r.created_at ?? r.createdAt ?? null,
        lastAccessed: r.last_accessed ?? r.lastAccessed ?? null,
      } as ShareToken));
      setTokens(mapped);
      setSettings(s?.colleges ? s : { colleges: [] });
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (createColleges.length === 0) return;
    setGenerating(true);
    const res = await fetch("/api/share-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colleges: createColleges, courses: createCourses, years: createYears }),
    });
    if (res.ok) { load(); setCreateColleges([]); setCreateCourses([]); setCreateYears([]); }
    setGenerating(false);
  };

  const openEdit = (token: ShareToken) => {
    setEditToken(token);
    setEditColleges(token.colleges?.length ? token.colleges : [token.collegeName]);
    setEditCourses(token.courses || []);
    setEditYears(token.years || []);
  };

  const saveEdit = async () => {
    if (!editToken || editColleges.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/share-tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editToken.id, colleges: editColleges, courses: editCourses, years: editYears }),
    });
    if (res.ok) { load(); setEditToken(null); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/share-tokens?id=${id}`, { method: "DELETE" });
    load();
  };

  const copy = (token: ShareToken) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token.token}`);
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showQR = async (token: ShareToken) => {
    const url = `${window.location.origin}/share/${token.token}`;
    const QRCode = (await import("qrcode")).default;
    setQrDataUrl(await QRCode.toDataURL(url, { width: 256, margin: 2 }));
    setQrToken(token.id);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-lg font-bold">Share Links</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Generate permanent dashboard links. Select one or more colleges, filter by course and year.</p>
      </div>

      {/* ── Create ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Generate New Share Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterPanel
            settings={settings}
            selectedColleges={createColleges} setSelectedColleges={setCreateColleges}
            selectedCourses={createCourses}   setSelectedCourses={setCreateCourses}
            selectedYears={createYears}       setSelectedYears={setCreateYears}
          />
          <Button onClick={generate} disabled={createColleges.length === 0 || generating}>
            <Link2 className="h-4 w-4 mr-2" />
            {generating ? "Generating…" : "Generate Share Link"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Token list ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Active Share Links ({tokens.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No share links yet</p>
              <p className="text-xs text-muted-foreground">Generate a link above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map(token => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token.token}`;
                const colleges = token.colleges?.length ? token.colleges : [token.collegeName];
                const courseText = !token.courses?.length ? "All Courses" : `${token.courses.length} Course${token.courses.length > 1 ? "s" : ""}`;
                const yearText   = !token.years?.length   ? "All Years"   : token.years.join(", ");

                return (
                  <div key={token.id} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Colleges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {colleges.map(c => (
                            <span key={c} className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c}</span>
                          ))}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{courseText}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{yearText}</Badge>
                        </div>

                        {/* Course tags */}
                        {token.courses?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {token.courses.map(c => (
                              <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">{c}</Badge>
                            ))}
                          </div>
                        )}

                        {/* URL */}
                        <div className="bg-background rounded-lg px-3 py-2 border">
                          <code className="text-xs text-muted-foreground break-all font-mono">{url}</code>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created: {token.createdAt ? new Date(token.createdAt).toLocaleDateString() : "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Last accessed: {token.lastAccessed ? new Date(token.lastAccessed).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(token)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="QR Code" onClick={() => showQR(token)}>
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Copy link" onClick={() => copy(token)}>
                          {copiedId === token.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Open" onClick={() => window.open(url, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => remove(token.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Modal ── */}
      {editToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditToken(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="text-sm font-bold">Edit Share Link</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs">{editToken.token.slice(0, 24)}…</p>
              </div>
              <button onClick={() => setEditToken(null)} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <FilterPanel
                settings={settings}
                selectedColleges={editColleges} setSelectedColleges={setEditColleges}
                selectedCourses={editCourses}   setSelectedCourses={setEditCourses}
                selectedYears={editYears}       setSelectedYears={setEditYears}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditToken(null)}>Cancel</Button>
                <Button className="flex-1" disabled={editColleges.length === 0 || saving} onClick={saveEdit}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {qrToken && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQrToken(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 flex flex-col items-center gap-4 w-72" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold">Scan QR Code</p>
            <img src={qrDataUrl} alt="QR Code" className="rounded-xl border" width={220} height={220} />
            <p className="text-[10px] text-muted-foreground text-center">Scan to open the shared dashboard</p>
            <div className="flex gap-2 w-full">
              <button onClick={() => { const a = document.createElement("a"); a.href = qrDataUrl; a.download = "share-qr.png"; a.click(); }}
                className="flex-1 h-8 text-xs rounded-lg border border-border hover:bg-muted transition-colors font-semibold">
                Download
              </button>
              <button onClick={() => setQrToken(null)}
                className="flex-1 h-8 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
