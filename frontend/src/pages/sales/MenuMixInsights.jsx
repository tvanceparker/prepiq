import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import MenuMixInsightsBasic from "./components/MenuMixInsightsBasic";

export default function MenuMixInsights() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <MenuMixInsightsBasic />;
    // case "pro":
    //   return <MenuMixInsightsPro />;
    // case "master":
    //   return <MenuMixInsightsMaster />;
    default:
      return <MenuMixInsightsBasic />;
  }
}
