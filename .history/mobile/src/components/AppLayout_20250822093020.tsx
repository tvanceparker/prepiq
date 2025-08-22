import React, { useState, useContext } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { Surface, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from './Sidebar';
import { HEADER_HEIGHT } from './Layout';
import { AuthContext } from '../contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { tier, user } = useContext(AuthContext);
  const [open, setOpen] = useState(true); // desktop sidebar expanded
  const [drawerVisible, setDrawerVisible] = useState(false); // mobile drawer
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 860;
  return (
    <View style={styles.root}>
      {!isMobile && open && (
        <Surface style={styles.sidebar} elevation={2}>
          <Sidebar tier={tier || 'basic'} />
        </Surface>
      )}
      <View style={styles.main}>
        <Surface
          style={[
            styles.header,
            {
              // ensure header appears below the status bar on phones
              paddingTop: (insets.top || 0) + 6,
              paddingBottom: 8,
              minHeight: (HEADER_HEIGHT || 56) + (insets.top || 0),
            },
          ]}
          elevation={1}
        >
          {isMobile ? (
            <IconButton icon="menu" onPress={() => setDrawerVisible(true)} />
          ) : (
            <IconButton icon={open ? 'backburger' : 'menu'} onPress={() => setOpen(o => !o)} />
          )}
          <Text variant="titleMedium" style={{ flex: 1 }}>
            PrepIQ
          </Text>
          <Text variant="bodySmall" numberOfLines={1}>
            {user?.name}
          </Text>
        </Surface>
        <View style={styles.content}>{children}</View>
      </View>
      {isMobile && drawerVisible && (
        <View style={styles.drawerOverlay} pointerEvents="box-none">
          {/* Render the panel first so it appears from the left, then the flexible backdrop */}
          <Surface style={[styles.drawerPanel, { paddingTop: (insets.top || 0) + 8 }]} elevation={4}>
            <View style={styles.drawerHeader}>
              <Text variant="titleMedium" style={{ flex: 1 }}>
                Menu
              </Text>
              <IconButton icon="close" onPress={() => setDrawerVisible(false)} />
            </View>
            <Sidebar tier={tier || 'basic'} onNavigate={() => setDrawerVisible(false)} />
          </Surface>
          <Pressable style={styles.backdrop} onPress={() => setDrawerVisible(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 260 },
  main: { flex: 1, backgroundColor: '#f5f6f7' },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  content: { flex: 1, padding: 12 },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  drawerPanel: { width: 280, backgroundColor: '#fff' },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
});
