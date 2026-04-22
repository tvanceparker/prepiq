// src/pages/settings/AccountSettings.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import BasicAccountSettings from "./components/BasicAccountSettings";

export default function AccountSettings() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <BasicAccountSettings />;
    default:
      return <BasicAccountSettings />;
  }
}
