import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import BasicAccountSettings from "./components/BasicAccountSettings";

export default function AccountSettings(): JSX.Element {
  const { tier } = useContext(AuthContext as any);

  switch (tier) {
    case "basic":
      return <BasicAccountSettings />;
    default:
      return <BasicAccountSettings />;
  }
}
