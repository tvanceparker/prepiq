import React from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryTheme } from 'victory-native';

const COLORS = ['#2563eb'];

export function WeekdayBarGraph({
  labels,
  values,
  color,
}: {
  labels: string[];
  values: number[];
  color?: string;
}) {
  const data = labels.map((lbl, i) => ({ x: lbl, y: values[i] || 0 }));
  const max = data.reduce((s, d: any) => Math.max(s, Math.abs(d.y)), 0);
  const yMax = max > 0 ? max * 1.15 : 1;
  return (
    <View style={{ height: 240, overflow: 'hidden' }}>
      <Svg height={220} width="100%" viewBox="0 0 400 220">
        <VictoryChart
          standalone={false}
          width={400}
          height={220}
          theme={VictoryTheme.material}
          categories={{ x: labels }}
          domainPadding={{ x: [24, 24], y: 12 }}
          padding={{ left: 48, right: 32, top: 10, bottom: 48 }}
          domain={{ y: [0, yMax] }}
        >
          <VictoryAxis offsetY={48} />
          <VictoryAxis dependentAxis tickFormat={v => `${Math.round(Number(v))}`} />
          <VictoryBar data={data} style={{ data: { fill: color || COLORS[0] } }} barRatio={0.82} />
        </VictoryChart>
      </Svg>
    </View>
  );
}
