import React from 'react';
import { View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLabel } from 'victory-native';

const COLORS = ['#ef4444'];

export function HeatmapPreviewGraph({ items }: { items: { x: string; y: number }[] }) {
  const data = items;
  const height = Math.min(300, data.length * 36 + 60);
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <VictoryChart
        horizontal
        domainPadding={{ x: 20, y: 8 }}
        height={height}
        padding={{ left: 120, right: 20, top: 10, bottom: 30 }}
      >
        <VictoryBar
          data={data}
          x="x"
          y="y"
          style={{ data: { fill: COLORS[0] } }}
          labels={({ datum }) => `${Math.round(datum.y)}`}
          labelComponent={<VictoryLabel dx={-8} />}
        />
      </VictoryChart>
    </View>
  );
}
