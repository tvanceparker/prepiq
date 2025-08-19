import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import BasicRestaurantSettings from "./components/BasicRestaurantSettings";

export default function RestaurantSettings(): JSX.Element {
  const { tier } = useContext(AuthContext as any) as any;

  switch (tier) {
    case "basic":
      return <BasicRestaurantSettings />;
    default:
      return <BasicRestaurantSettings />;
  }
}
