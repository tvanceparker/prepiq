import React, { useState, useContext, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Switch } from 'react-native-paper';
import { useAppTheme } from '../contexts/ThemeContext';
import { sidebarDataByTier, SidebarSection } from '../navigation/sidebarData';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface Props {
  tier?: string;
  onNavigate?: () => void;
}

export default function Sidebar({ tier, onNavigate }: Props) {
  const { permissions = [], logout } = useContext(AuthContext);
  const theme = useTheme();
  const nav = useNavigation<any>();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!tier) return null;
  const sections: SidebarSection[] = sidebarDataByTier[tier] || [];

  // open first two sections by default for quicker access
  useEffect(() => {
    if (Object.keys(open).length === 0) {
      const init: Record<string, boolean> = {};
      sections.slice(0, 2).forEach(s => {
        init[s.label] = true;
      });
      setOpen(init);
    }
  }, [sections]);

  const toggle = (label: string) => setOpen(o => ({ ...o, [label]: !o[label] }));

  const go = (path: string) => {
    const screenName = path.replace(/^\//, '').replace(/\//g, '_');
    try {
      nav.navigate(screenName as never);
    } catch {}
    onNavigate?.();
  };

  return (
  <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.logoText}>PIQ</Text>
        </View>
        <Text variant="titleMedium" style={styles.brand}>
          PrepIQ
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map(section => {
          const children =
            permissions.length === 0
              ? section.children // show all while permissions not yet loaded
              : section.children.filter(c => !c.permission || permissions.includes(c.permission));
          if (!children.length) return null; // hide section if still empty after filtering
          const isOpen = !!open[section.label];
          return (
            <View key={section.label} style={styles.section}>
              <TouchableOpacity onPress={() => toggle(section.label)} style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <IconButton
                  icon={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  onPress={() => toggle(section.label)}
                />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.items}>
                  {children.map(child => {
                    const screenName = child.path.replace(/^\/?/, '').replace(/\//g, '_');
                    const isActive = nav
                      .getState?.()
                      ?.routes?.some((r: any) => r.name === screenName);
                    return (
                      <TouchableOpacity
                        key={child.path}
                        style={[styles.itemBtn, isActive && styles.itemActive]}
                        onPress={() => go(child.path)}
                      >
                        <Text style={[styles.itemText, isActive && styles.itemTextActive]}>
                          {child.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        <View style={styles.footer}>
          <Button icon="logout" mode="outlined" onPress={logout} style={styles.logoutBtn}>
            Logout
          </Button>
          {/* Theme toggle for development/testing */}
          <View style={styles.themeRow}>
            <Text>Dark mode</Text>
            <ThemeToggle />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ThemeToggle() {
  const { themeName, toggleTheme } = useAppTheme();
  return <Switch value={themeName === 'dark'} onValueChange={toggleTheme} />;
}

const styles = StyleSheet.create({
  container: { width: 260, flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  brand: { fontWeight: 'bold' },
  scroll: { paddingHorizontal: 8, paddingBottom: 40 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sectionLabel: { fontWeight: '600' },
  items: { paddingLeft: 12 },
  itemBtn: { paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 },
  itemText: { opacity: 0.85 },
  itemActive: { backgroundColor: 'rgba(0,0,0,0.07)' },
  itemTextActive: { fontWeight: '600', opacity: 1 },
  footer: { marginTop: 16, paddingHorizontal: 8 },
  logoutBtn: { marginTop: 8 },
  themeRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
