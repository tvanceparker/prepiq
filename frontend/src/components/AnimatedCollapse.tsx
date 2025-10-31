import React, { useRef, useEffect, useState } from 'react';
import type { AnimatedCollapseProps } from '../interfaces/ui';

export default function AnimatedCollapse({ isOpen, children }: AnimatedCollapseProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen, children]);

  return (
    <div style={{ height: `${height}px`, transition: 'height 300ms ease', overflow: 'hidden' }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
