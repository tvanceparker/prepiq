// src/pages/dashboard/components/ProOverview.jsx
import React from "react";

export default function ProOverview({ data }) {
  if (!data) return null;

  // For example, reuse the same fields but maybe with additional styling or extra info later
  return (
    <section>
      <h2>Pro Daily Overview</h2>
      {/* You can customize this with charts, breakdowns, etc. */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}
