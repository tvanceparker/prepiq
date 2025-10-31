// src/pages/admin/ActivityLogs.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import ActivityLogsBasic from "./components/ActivityLogsBasic";

export default function TenantInfo() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <ActivityLogsBasic />;
    // case "pro":
    //   return <TenantInfoPro />;
    // case "master":
    //   return <TenantInfoMaster />;
    default:
      return <ActivityLogsBasic />;
  }
}
