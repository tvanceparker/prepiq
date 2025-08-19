import React, { useState, useContext } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { sidebarDataByTier, SidebarSection } from '../navigation/sidebarData';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface Props { tier?: string; onNavigate?: () => void }

export default function Sidebar({ tier, onNavigate }: Props) {
  const { permissions = [] } = useContext(AuthContext);
  const theme = useTheme();
  const nav = useNavigation<any>();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!tier) return null;
  const sections: SidebarSection[] = sidebarDataByTier[tier] || [];

  const toggle = (label: string) => setOpen(o => ({ ...o, [label]: !o[label] }));

  const go = (path: string) => {
    const screenName = path.replace(/^\//,'').replace(/\//g,'_');
    try { nav.navigate(screenName as never); } catch {}
    onNavigate?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}><Text style={styles.logoText}>PIQ</Text></View>
        <Text variant="titleMedium" style={styles.brand}>PrepIQ</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map(section => {
          const children = section.children.filter(c => !c.permission || permissions.includes(c.permission));
          if (!children.length) return null;
          const isOpen = !!open[section.label];
          return (
            <View key={section.label} style={styles.section}>
              <TouchableOpacity onPress={() => toggle(section.label)} style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <IconButton icon={isOpen ? 'chevron-up' : 'chevron-down'} size={18} onPress={() => toggle(section.label)} />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.items}>
                  {children.map(child => (
                    <TouchableOpacity key={child.path} style={styles.itemBtn} onPress={() => go(child.path)}>
                      <Text style={styles.itemText}>{child.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 260, flex:1 },
  brandRow: { flexDirection:'row', alignItems:'center', padding:16, gap:12 },
  logo: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  logoText: { color:'#fff', fontWeight:'bold', fontSize:16 },
  brand: { fontWeight:'bold' },
  scroll: { paddingHorizontal:8, paddingBottom:40 },
  section: { marginBottom:8 },
  sectionHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:8, paddingVertical:6 },
  sectionLabel: { fontWeight:'600' },
  items: { paddingLeft:12 },
  itemBtn: { paddingVertical:6, paddingHorizontal:4, borderRadius:4 },
  itemText: { opacity:0.85 },
});
