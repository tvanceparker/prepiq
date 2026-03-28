import React, { useState, useContext, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Switch } from 'react-native-paper';
import { useAppTheme } from '../contexts/ThemeContext';
import { sidebarDataByTier, SidebarSection } from '../navigation/sidebarData';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigation, useNavigationState } from '@react-navigation/native';

interface Props {
  tier?: string;
  onNavigate?: () => void;
}

function normalizePathToScreenName(path: string) {
  return path.replace(/^\//, '').replace(/\//g, '_');
}

function getActiveRouteNames(state: any): string[] {
  if (!state?.routes?.length) {
    return [];
  }

  const activeRoute = state.routes[state.index ?? state.routes.length - 1];
  const childRouteNames = activeRoute?.state ? getActiveRouteNames(activeRoute.state) : [];
  return [activeRoute.name, ...childRouteNames].filter(Boolean);
}

export default function Sidebar({ tier, onNavigate }: Props) {
  const { logout } = useContext(AuthContext);
  const theme = useTheme();
  const nav = useNavigation<any>();
  const [openSectionLabel, setOpenSectionLabel] = useState<string | null>(null);
  const activeRouteNames = useNavigationState(state => getActiveRouteNames(state));
  if (!tier) return null;
  const normalizedTier = tier === 'basic' ? 'basic' : 'full';
  const sections: SidebarSection[] = sidebarDataByTier[normalizedTier] || [];

  const activeSectionLabel = useMemo(() => {
    const activeSection = sections.find(section =>
      section.children.some(child =>
        activeRouteNames.includes(normalizePathToScreenName(child.path))
      )
    );
    return activeSection?.label ?? null;
  }, [activeRouteNames, sections]);

  useEffect(() => {
    if (activeSectionLabel) {
      setOpenSectionLabel(current =>
        current === activeSectionLabel ? current : activeSectionLabel
      );
      return;
    }

    if (sections.length) {
      setOpenSectionLabel(current => current ?? sections[0].label);
    }
  }, [activeSectionLabel, sections]);

  const toggle = (label: string) =>
    setOpenSectionLabel(current => (current === label ? null : label));

  const go = (path: string) => {
    const screenName = normalizePathToScreenName(path);
    try {
      nav.navigate(screenName as never);
    } catch {}
    onNavigate?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            (theme.colors as any).elevation?.level2 ||
            (theme.colors as any).surface ||
            theme.colors.background,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: theme.colors.outlineVariant || theme.colors.outline,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.logoText}>PIQ</Text>
        </View>
        <Text variant="titleMedium" style={[styles.brand, { color: theme.colors.onSurface }]}>
          PrepIQ
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
        style={{ backgroundColor: 'transparent' }}
      >
        {sections.map(section => {
          const children = section.children;
          if (!children.length) return null; // hide section if still empty after filtering
          const isOpen = openSectionLabel === section.label;
          return (
            <View key={section.label} style={styles.section}>
              <TouchableOpacity
                onPress={() => toggle(section.label)}
                style={[styles.sectionHeader, { borderRadius: 8 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                  {section.label}
                </Text>
                <IconButton
                  icon={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  onPress={() => toggle(section.label)}
                />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.items}>
                  {children.map(child => {
                    const screenName = normalizePathToScreenName(child.path);
                    const isActive = activeRouteNames.includes(screenName);
                    return (
                      <TouchableOpacity
                        key={child.path}
                        style={[
                          styles.itemBtn,
                          isActive && {
                            backgroundColor:
                              (theme.colors as any).surfaceVariant || 'rgba(255,255,255,0.08)',
                          },
                        ]}
                        onPress={() => go(child.path)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            { color: theme.colors.onSurfaceVariant },
                            isActive && {
                              color: theme.colors.primary,
                              fontWeight: '600',
                              opacity: 1,
                            },
                          ]}
                        >
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
            <Text style={{ color: theme.colors.onSurface }}>Dark mode</Text>
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
  itemActive: {},
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
