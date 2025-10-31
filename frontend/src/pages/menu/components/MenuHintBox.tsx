import React from "react";
import HintBox from "../../../components/HintBox";

export default function MenuHintBox() {
  return (
    <HintBox
      title="Need a Recipe First?"
      link={{ href: "./recipe-editor", label: "Go to Recipe Editor →" }}
    >
      🧠 Before creating a menu item, make sure you've added your recipe using
      the <strong>Recipe Editor</strong>. You’ll link it here when building your
      menu item.
    </HintBox>
  );
}
