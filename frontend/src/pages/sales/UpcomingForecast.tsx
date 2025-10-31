import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import BasicUpcomingForecast from "./components/BasicUpcomingForecast";

export default function UpcomingForecast() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <BasicUpcomingForecast />;
    // case "pro":
    //   return <ProUpcomingForecast />;
    // case "master":
    //   return <MasterUpcomingForecast />;
    default:
      return <BasicUpcomingForecast />;
  }
}
