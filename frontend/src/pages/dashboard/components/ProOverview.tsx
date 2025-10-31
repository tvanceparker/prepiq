import React from 'react';

export default function ProOverview({ data }: { data: any }) {
  return (
    <div>
      <h2>Pro Dashboard - Under Construction</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
