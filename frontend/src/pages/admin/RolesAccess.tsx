// src/pages/admin/TenantInfo.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import RolesAccessBasic from "./components/RolesAccessBasic";

export default function TenantInfo() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <RolesAccessBasic />;
    case "full":
      return <RolesAccessBasic />;
    default:
      return <RolesAccessBasic />;
  }
}
