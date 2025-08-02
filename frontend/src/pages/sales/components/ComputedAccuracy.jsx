import React from "react";

const ComputedAccuracy = ({ data }) => {
  if (!data.length)
    return (
      <p className="text-light-muted dark:text-dark-muted">
        No computed accuracy data available.
      </p>
    );

  return (
    <div>
      <h3 className="text-lg font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-3">
        🔄 On-the-Fly Computed Forecast Accuracy
      </h3>
      <table className="w-full border-collapse border border-light-border dark:border-dark-border text-sm">
        <thead>
          <tr className="bg-light-background dark:bg-dark-background">
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-left">
              Date
            </th>
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-left">
              Menu Item
            </th>
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-right">
              Forecasted
            </th>
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-right">
              Actual
            </th>
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-right">
              Error
            </th>
            <th className="border border-light-border dark:border-dark-border px-3 py-2 text-right">
              Error %
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={
                idx % 2 === 0 ? "bg-light-surface dark:bg-dark-surface" : ""
              }
            >
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-light-textSecondary dark:text-dark-textSecondary">
                {row.date}
              </td>
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-light-textPrimary dark:text-dark-textPrimary">
                {row.menu_item_name}
              </td>
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-right text-light-textSecondary dark:text-dark-textSecondary">
                {row.forecasted}
              </td>
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-right text-light-textSecondary dark:text-dark-textSecondary">
                {row.actual}
              </td>
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-right text-red-500 dark:text-red-400">
                {row.error}
              </td>
              <td className="border border-light-border dark:border-dark-border px-3 py-2 text-right text-red-500 dark:text-red-400">
                {row.error_percentage != null
                  ? `${row.error_percentage.toFixed(2)}%`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComputedAccuracy;
