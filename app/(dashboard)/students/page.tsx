"use client";

import { useState } from "react";
import { StudentsTab } from "@/components/students-tab";

export default function StudentsPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <StudentsTab refresh={refresh} onImported={() => setRefresh((r) => r + 1)} />
  );
}
