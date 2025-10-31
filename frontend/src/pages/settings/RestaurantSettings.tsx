// src/pages/settings/RestaurantSettings.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import BasicRestaurantSettings from "./components/BasicRestaurantSettings";

export default function RestaurantSettings() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case "basic":
      return <BasicRestaurantSettings />;
    // case "pro":
    //   return <ProRestaurantSettings />;
    // case "master":
    //   return <MasterRestaurantSettings />;
    default:
      return <BasicRestaurantSettings />;
  }
}
