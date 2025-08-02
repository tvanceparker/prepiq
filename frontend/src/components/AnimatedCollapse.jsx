import React, { useRef, useEffect, useState } from "react";

export default function AnimatedCollapse({ isOpen, children }) {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen, children]);

  return (
    <div
      style={{
        height: `${height}px`,
        transition: "height 300ms ease",
        overflow: "hidden",
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
