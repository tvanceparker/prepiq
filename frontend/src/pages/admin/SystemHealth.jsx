// src/pages/admin/SystemHealth.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {SystemHealthBasic} from "./components/SystemHealthBasic";

export default function SystemHealth() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <SystemHealthBasic />;
    // case "pro":
    //   return <TenantInfoPro />;
    // case "master":
    //   return <TenantInfoMaster />;
    default:
      return <SystemHealthBasic />;
  }
}
