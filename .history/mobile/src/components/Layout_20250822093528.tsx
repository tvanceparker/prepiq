import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const DEFAULT_SIDEBAR_WIDTH = Math.min(320, WINDOW_WIDTH * 0.8);
export const HEADER_HEIGHT = 56; // standardized header height consumers can reuse

export default function Layout({
  children,
  header,
  sidebarContent,
  sidebarOpen = false,
  sidebarFromLeft = true,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  onClose,
}: any) {
  // Animated translateX for the sliding sidebar
  const initialX = sidebarFromLeft ? -sidebarWidth : sidebarWidth;
  const translateX = useRef(new Animated.Value(initialX)).current;

  useEffect(() => {
    const toValue = sidebarOpen ? 0 : sidebarFromLeft ? -sidebarWidth : sidebarWidth;
    Animated.timing(translateX, {
      toValue,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen, sidebarFromLeft, sidebarWidth, translateX]);

  const overlayStyle = {
    ...styles.overlay,
    backgroundColor: sidebarOpen ? 'rgba(0,0,0,0.3)' : 'transparent',
    pointerEvents: sidebarOpen ? 'auto' : 'none',
  } as any;

  const { themeName } = useAppTheme();
  const bg = themeName === 'dark' ? '#0f1112' : '#fafafa';

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bg },
        // On Android include the status bar height so header/content doesn't sit under it
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 0 },
      ]}
    >
      <View style={styles.content}>
        {/* optional header slot to keep header spacing consistent */}
        {header}
        {children}
      </View>

      {/* Sidebar + overlay: render only when there's sidebar content provided */}
      {sidebarContent && (
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={overlayStyle}>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  width: sidebarWidth,
                  transform: [{ translateX }],
                  left: sidebarFromLeft ? 0 : undefined,
                  right: sidebarFromLeft ? undefined : 0,
                },
              ]}
            >
              {sidebarContent}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    // simple shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});
