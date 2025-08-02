// src/pages/dashboard/DailyOverview.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {useDailyOverview}  from "./hooks/useDailyOverview";
import BasicOverview from "./components/BasicOverview";
import ProOverview from "./components/ProOverview";
import MasterOverview from "./components/MasterOverview";

export default function DailyOverview() {
  const { tier } = useContext(AuthContext);
  const { data, loading, error } = useDailyOverview();

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p>Error loading dashboard: {error.message}</p>;

  console.log("📊 Tier detected:", tier);

  switch (tier) {
    case "basic":
      return <BasicOverview data={data} />;
    case "pro":
      return <ProOverview data={data} />;
    case "master":
      return <MasterOverview data={data} />;
    default:
      return <BasicOverview data={data} />;
  }
}
