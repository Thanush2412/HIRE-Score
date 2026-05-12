import { Copy, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareTokenRow } from "@/lib/db";

interface ShareTokenCardProps {
  token: ShareTokenRow;
  onDelete: (id: string) => void;
  onCopy: (token: string) => void;
  isCopied: boolean;
}

export function ShareTokenCard({ token, onDelete, onCopy, isCopied }: ShareTokenCardProps) {
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://hire-score.vercel.app'}/share/${token.token}`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ExternalLink className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">
              {token.colleges.length === 1 ? token.colleges[0] : `${token.colleges.length} Colleges`}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Created {new Date(token.created_at).toLocaleDateString()}
            </p>
          </div>
          {token.last_accessed && (
            <Badge className="text-[10px] uppercase tracking-wider h-6 font-black bg-emerald-50 text-emerald-600 border-emerald-100 border">
              Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 gap-1.5 text-xs font-bold px-3"
            onClick={() => onCopy(token.token)}
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={() => onDelete(token.id)}
            title="Delete share link"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <a
            href={`/share/${token.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Open share link"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Filters */}
      {(token.courses.length > 0 || token.years?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pl-12">
          {token.courses.length > 0 ? (
            token.courses.map((c) => (
              <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {c}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground italic">
              All Courses
            </span>
          )}
          {token.years?.length > 0 &&
            token.years.map((y) => (
              <span key={y} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {y}
              </span>
            ))}
        </div>
      )}

      {/* Share URL */}
      <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
        <p className="text-[10px] text-muted-foreground font-semibold mb-1.5">Share URL:</p>
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="w-full text-[11px] font-mono bg-transparent text-foreground outline-none cursor-text select-all"
        />
      </div>
    </div>
  );
}
