// src/pages/admin/TenantInfo.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import UserManagementBasic from "./components/UserManagementBasic";

export default function TenantInfo() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <UserManagementBasic />;
    default:
      return <UserManagementBasic />;
  }
}
