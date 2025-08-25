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
import { useTheme } from 'react-native-paper';

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

  const paperTheme = useTheme();
  const bg = paperTheme.colors.background as string;
  const isDark = (paperTheme as any).dark === true;
  const statusOffset = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  const overlayStyle = {
    ...styles.overlay,
    backgroundColor: sidebarOpen ? 'rgba(0,0,0,0.3)' : 'transparent',
    pointerEvents: sidebarOpen ? 'auto' : 'none',
    top: -statusOffset,
  } as any;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bg },
        // On Android include the status bar height so header/content doesn't sit under it
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 0 },
      ]}
    >
      <StatusBar backgroundColor={bg} barStyle={isDark ? 'light-content' : 'dark-content'} />
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
                  top: -statusOffset,
                  backgroundColor:
                    (paperTheme.colors as any).elevation?.level2 ||
                    (paperTheme.colors as any).surface ||
                    bg,
                  borderRightWidth: sidebarFromLeft ? StyleSheet.hairlineWidth : 0,
                  borderLeftWidth: !sidebarFromLeft ? StyleSheet.hairlineWidth : 0,
                  borderColor:
                    (paperTheme.colors as any).outlineVariant || (paperTheme.colors as any).outline,
                  shadowOpacity: isDark ? 0 : 0.15,
                  elevation: isDark ? 0 : 6,
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
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: 'transparent' },
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
    backgroundColor: 'transparent',
    // simple shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});
