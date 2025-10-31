// src/pages/dashboard/components/MasterOverview.jsx
import React from "react";

export default function MasterOverview({ data }) {
  console.log("👑 MasterOverview rendering with data:", data);

  if (!data || Object.keys(data).length === 0) {
    return <p>🚫 No data available for master tier.</p>;
  }

  return (
    <section>
      <h2>👑 Master Daily Overview</h2>

      <div>
        <h3>📊 Forecasted Sales Today</h3>
        <p>Quantity: {data.forecasted_sales_today?.forecasted_quantity}</p>
        <p>
          Revenue: $
          {data.forecasted_sales_today?.forecasted_revenue?.toFixed(2)}
        </p>
      </div>

      <div>
        <h3>🔥 Top 5 Items Today</h3>
        <ul>
          {data.top_5_items_today?.map((item) => (
            <li key={item.menu_item_id}>
              {item.name}: {item.forecasted_quantity}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>✅ Accuracy Yesterday</h3>
        <p>{data.accuracy_yesterday?.accuracy_percent}%</p>
        <p>Note: {data.accuracy_yesterday?.note}</p>
      </div>
    </section>
  );
}
