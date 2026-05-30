/**
 * settings.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuration and settings management using Hostinger MySQL database.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSettingsFromDb, saveSettingsToDb, syncStudentsDegreeTypeInDb } from "./db";

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
    const data = await getSettingsFromDb();
    if (data) return data as unknown as Settings;
  } catch (e) {
    console.error("Failed to read settings:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULTS)) as Settings;
}

export async function saveSettings(s: Settings): Promise<Settings> {
  try {
    await saveSettingsToDb(s as any);
    // Sync student degree types to match the new settings in MySQL
    await syncStudentsDegreeTypeInDb(s);
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
