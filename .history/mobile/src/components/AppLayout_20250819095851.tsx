import React, { useState, useContext } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Surface, IconButton, Text } from 'react-native-paper';
import Sidebar from './Sidebar';
import { AuthContext } from '../contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { tier, user } = useContext(AuthContext);
  const [open, setOpen] = useState(true);
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
        <Surface style={styles.header} elevation={1}>
          <IconButton icon={open ? 'backburger' : 'menu'} onPress={() => setOpen(o=>!o)} />
          <Text variant="titleMedium" style={{ flex:1 }}>PrepIQ</Text>
          <Text variant="bodySmall">{user?.name}</Text>
        </Surface>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1, flexDirection:'row' },
  sidebar: { width:260 },
  main: { flex:1, backgroundColor:'#f5f6f7' },
  header: { height:56, flexDirection:'row', alignItems:'center', paddingHorizontal:4 },
  content: { flex:1, padding:16 },
});
