import React, { useState, useContext } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { Surface, IconButton, Text, Portal, Modal } from 'react-native-paper';
import Sidebar from './Sidebar';
import { AuthContext } from '../contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { tier, user } = useContext(AuthContext);
  const [open, setOpen] = useState(true); // desktop sidebar expanded
  const [drawerVisible, setDrawerVisible] = useState(false); // mobile drawer
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
          {isMobile ? (
            <IconButton icon="menu" onPress={() => setDrawerVisible(true)} />
          ) : (
            <IconButton icon={open ? 'backburger' : 'menu'} onPress={() => setOpen(o=>!o)} />
          )}
          <Text variant="titleMedium" style={{ flex:1 }}>PrepIQ</Text>
          <Text variant="bodySmall" numberOfLines={1}>{user?.name}</Text>
        </Surface>
        <View style={styles.content}>{children}</View>
      </View>
      {isMobile && (
        <Portal>
          <Modal visible={drawerVisible} onDismiss={() => setDrawerVisible(false)} contentContainerStyle={styles.drawerModal}>
            <View style={styles.drawerHeader}> 
              <Text variant="titleMedium" style={{ flex:1 }}>Menu</Text>
              <IconButton icon="close" onPress={() => setDrawerVisible(false)} />
            </View>
            <Sidebar tier={tier || 'basic'} onNavigate={() => setDrawerVisible(false)} />
            <Pressable style={styles.dismissArea} onPress={() => setDrawerVisible(false)} />
          </Modal>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1, flexDirection:'row' },
  sidebar: { width:260 },
  main: { flex:1, backgroundColor:'#f5f6f7' },
  header: { height:48, flexDirection:'row', alignItems:'center', paddingHorizontal:4, paddingTop:2 },
  content: { flex:1, padding:12 },
  drawerModal: { backgroundColor:'white', alignSelf:'flex-start', width:280, maxHeight:'90%', marginTop:40, marginLeft:4, borderRadius:12, overflow:'hidden' },
  drawerHeader: { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:4, borderBottomWidth:StyleSheet.hairlineWidth, borderColor:'#ddd' },
  dismissArea: { position:'absolute', top:0, left:0, right:0, bottom:0 },
});
