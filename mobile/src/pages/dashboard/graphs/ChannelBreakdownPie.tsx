import React from 'react';
import { View } from 'react-native';
import { VictoryPie } from 'victory-native';

const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export function ChannelBreakdownPie({ data }: { data: { x: string; y: number }[] }) {
  const total = data.reduce((s, r) => s + r.y, 0);
  if (data.length === 0 || total === 0) return null;
  return (
    <View
      style={{ height: 220, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <VictoryPie
        data={data}
        colorScale={COLORS}
        height={200}
        labels={({ datum }) => `${datum.x}: ${Math.round((datum.y / total) * 100)}%`}
      />
    </View>
  );
}
