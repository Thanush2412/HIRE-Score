import { FpcNqtAssessment } from "./nqt-types";

const STORAGE_KEY = "fpc_nqt_assessments";

const EMPTY_ASSESSMENTS: FpcNqtAssessment[] = [];

export function getStoredNqtAssessments(): FpcNqtAssessment[] {
  if (typeof window === "undefined") return EMPTY_ASSESSMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_ASSESSMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: FpcNqtAssessment) => item && item.id);
    }
    return EMPTY_ASSESSMENTS;
  } catch {
    return EMPTY_ASSESSMENTS;
  }
}

export function saveNqtAssessments(assessments: FpcNqtAssessment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  } catch (e) {
    console.error("Failed to save NQT assessments", e);
  }
}

export function addNqtAssessments(newRecords: FpcNqtAssessment[]): FpcNqtAssessment[] {
  const current = getStoredNqtAssessments();
  const map = new Map<string, FpcNqtAssessment>();
  
  // Load existing assessments keyed by lowercased assessmentName
  current.forEach(item => {
    if (item && item.assessmentName) {
      map.set(item.assessmentName.trim().toLowerCase(), item);
    }
  });

  // Upsert/update with new assessments
  newRecords.forEach(item => {
    if (item && item.assessmentName) {
      map.set(item.assessmentName.trim().toLowerCase(), item);
    }
  });

  const updated = Array.from(map.values());
  saveNqtAssessments(updated);
  return updated;
}

export function deleteNqtAssessment(id: string): FpcNqtAssessment[] {
  const current = getStoredNqtAssessments();
  const updated = current.filter(item => item.id !== id);
  saveNqtAssessments(updated);
  return updated;
}

export function clearNqtAssessments(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
