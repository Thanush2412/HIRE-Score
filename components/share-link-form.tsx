import { Plus, Building2, BookOpen, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ShareLinkFormProps {
  colleges: string[];
  courses: string[];
  years: string[];
  selectedColleges: string[];
  selectedCourses: string[];
  selectedYears: string[];
  onToggleCollege: (college: string) => void;
  onToggleCourse: (course: string) => void;
  onToggleYear: (year: string) => void;
  onSelectAllColleges: () => void;
  onDeselectAllColleges: () => void;
  onSelectAllCourses: () => void;
  onDeselectAllCourses: () => void;
  onSelectAllYears: () => void;
  onDeselectAllYears: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ShareLinkForm({
  colleges,
  courses,
  years,
  selectedColleges,
  selectedCourses,
  selectedYears,
  onToggleCollege,
  onToggleCourse,
  onToggleYear,
  onSelectAllColleges,
  onDeselectAllColleges,
  onSelectAllCourses,
  onDeselectAllCourses,
  onSelectAllYears,
  onDeselectAllYears,
  onSubmit,
  isLoading,
}: ShareLinkFormProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Plus className="h-5 w-5 text-primary" />
        Generate New Share Link
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* College Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Colleges <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              <button
                onClick={onSelectAllColleges}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-[11px] text-muted-foreground">/</span>
              <button
                onClick={onDeselectAllColleges}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
            {colleges.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-colors"
              >
                <Checkbox
                  checked={selectedColleges.includes(c)}
                  onCheckedChange={() => onToggleCollege(c)}
                />
                <span className="text-sm font-medium">{c}</span>
              </label>
            ))}
            {colleges.length === 0 && (
              <p className="text-xs italic text-muted-foreground py-3">No colleges available</p>
            )}
          </div>
        </div>

        {/* Course Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Courses (Optional)
            </label>
            <div className="flex gap-1">
              <button
                onClick={onSelectAllCourses}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-[11px] text-muted-foreground">/</span>
              <button
                onClick={onDeselectAllCourses}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
            {courses.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-colors"
              >
                <Checkbox
                  checked={selectedCourses.includes(c)}
                  onCheckedChange={() => onToggleCourse(c)}
                />
                <span className="text-sm font-medium">{c}</span>
              </label>
            ))}
            {courses.length === 0 && (
              <p className="text-xs italic text-muted-foreground py-3">No courses available</p>
            )}
          </div>
        </div>

        {/* Years Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Years (Optional)
            </label>
            <div className="flex gap-1">
              <button
                onClick={onSelectAllYears}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-[11px] text-muted-foreground">/</span>
              <button
                onClick={onDeselectAllYears}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
            {years.map((y) => (
              <label
                key={y}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-colors"
              >
                <Checkbox
                  checked={selectedYears.includes(y)}
                  onCheckedChange={() => onToggleYear(y)}
                />
                <span className="text-sm font-medium">{y}</span>
              </label>
            ))}
            {years.length === 0 && (
              <p className="text-xs italic text-muted-foreground py-3">No years available</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button
          onClick={onSubmit}
          disabled={isLoading || selectedColleges.length === 0}
          className="rounded-xl px-8"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Generate Share Link
        </Button>
      </div>
    </div>
  );
}
