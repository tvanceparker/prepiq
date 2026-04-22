import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import SalesExplorerBasic from "./components/SalesExplorerBasic";

export default function SalesExplorer() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <SalesExplorerBasic />;
    default:
      return <SalesExplorerBasic />;
  }
}
