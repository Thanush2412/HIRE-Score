"use client";

import { useState } from "react";
import { OverviewStats } from "@/components/overview-stats";

export default function OverviewPage() {
  const [refresh] = useState(0);

  return <OverviewStats refresh={refresh} />;
}
