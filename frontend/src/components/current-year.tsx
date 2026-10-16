"use client";

import { useEffect, useState } from "react";

/** Render a stable initial year, then update it in the browser after hydration. */
export default function CurrentYear() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
