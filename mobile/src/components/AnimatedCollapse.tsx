import React, { useRef, useEffect, useState } from 'react';
import { Animated, View, LayoutChangeEvent } from 'react-native';

export default function AnimatedCollapse({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const animated = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    Animated.timing(animated, {
      toValue: isOpen ? contentHeight : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOpen, contentHeight]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== contentHeight) setContentHeight(h);
  };

  return (
    <Animated.View style={{ height: animated, overflow: 'hidden' }}>
      <View onLayout={onLayout}>{children}</View>
    </Animated.View>
  );
}
