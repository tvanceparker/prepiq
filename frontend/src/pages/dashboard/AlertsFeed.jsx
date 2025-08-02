import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import AlertsFeedBasic from "./components/AlertsFeedBasic";

export default function AlertsFeed() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <AlertsFeedBasic />;
    // case "pro":
    //   return <AlertsFeedPro />;
    // case "master":
    //   return <AlertsFeedMaster />;
    default:
      return <AlertsFeedBasic />;
  }
}
