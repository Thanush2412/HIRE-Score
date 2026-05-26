/**
 * settings.supabase.ts
 * Drop-in replacement for lib/settings.ts using Supabase.
 * All functions are async — update callers accordingly.
 *
 * TO ACTIVATE: rename to settings.ts (back up the original first).
 */

import { getSupabase } from "./db";

export interface Course {
  name: string;
  degreeType: "ug" | "pg";
  years: string[];
}

export interface College {
  name: string;
  stream: "engineering" | "arts";
  courses: Course[];
}

export interface Settings {
  colleges: College[];
}

const DEFAULTS: Settings = { colleges: [] };

export async function getSettings(): Promise<Settings> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("settings")
      .select("value")
      .eq("key", "main")
      .maybeSingle();

    if (error) throw error;
    if (data) return data.value as Settings;
  } catch (e) {
    console.error("Failed to read settings:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULTS)) as Settings;
}

export async function syncStudentsDegreeType(settings: Settings): Promise<void> {
  try {
    const sb = getSupabase();
    for (const col of settings.colleges) {
      // Get college database row
      const { data: colData } = await sb
        .from("colleges")
        .select("id")
        .eq("name", col.name)
        .maybeSingle();

      if (!colData) continue;

      for (const co of col.courses) {
        // Get department database row
        const { data: deptData } = await sb
          .from("departments")
          .select("id")
          .eq("college_id", colData.id)
          .eq("name", co.name)
          .maybeSingle();

        if (!deptData) continue;

        // Update students under this college and department
        await sb
          .from("students")
          .update({ degree_type: co.degreeType })
          .eq("college_id", colData.id)
          .eq("department_id", deptData.id);
      }
    }
  } catch (err) {
    console.error("Failed to sync student degree types:", err);
  }
}

export async function saveSettings(s: Settings): Promise<Settings> {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from("settings")
      .upsert({ key: "main", value: s }, { onConflict: "key" });
    if (error) throw error;

    // Sync student degree types to match the new settings
    await syncStudentsDegreeType(s);
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
  return s;
}

export async function upsertCollegesFromImport(
  records: { college?: string; stream?: string; department?: string; year?: string; degreeType?: string }[]
): Promise<void> {
  try {
    const settings = await getSettings();

    for (const r of records) {
      const collegeName = (r.college ?? "").trim();
      const stream = (r.stream ?? "").toLowerCase() === "arts" ? "arts" : "engineering" as "engineering" | "arts";
      const dept = (r.department ?? "").trim();
      const year = (r.year ?? "").trim();
      const degreeType = r.degreeType === "pg" ? "pg" : "ug";

      if (!collegeName) continue;

      let college = settings.colleges.find(c => c.name === collegeName);
      if (!college) {
        college = { name: collegeName, stream, courses: [] };
        settings.colleges.push(college);
      } else {
        college.stream = stream;
      }

      if (!dept) continue;

      let course = college.courses.find(c => c.name === dept);
      if (!course) {
        course = { name: dept, degreeType: degreeType, years: [] };
        college.courses.push(course);
      } else if (degreeType === "pg") {
        course.degreeType = "pg";
      }

      if (!year) continue;

      if (!course.years.includes(year)) {
        course.years.push(year);
        course.years.sort();
      }
    }

    await saveSettings(settings);
  } catch (e) {
    console.error("Failed to upsert colleges from import:", e);
  }
}
