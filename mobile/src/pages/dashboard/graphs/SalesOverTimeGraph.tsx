import React from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryTheme,
  VictoryLegend,
} from 'victory-native';

const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export interface SeriesPoint {
  x: Date;
  y: number;
}
export interface SalesSeries {
  key: string;
  color?: string;
  points: SeriesPoint[];
}

export function SalesOverTimeGraph({
  series,
  xMin,
  xMax,
  yMax,
}: {
  series: SalesSeries[];
  xMin: Date;
  xMax: Date;
  yMax: number;
}) {
  const legendData = series.map((s, i) => ({
    name: s.key,
    symbol: { fill: s.color || COLORS[i % COLORS.length] },
  }));
  return (
    <View style={{ height: 260, overflow: 'hidden' }}>
      <Svg height={240} width="100%" viewBox="0 0 400 240">
        <VictoryChart
          standalone={false}
          width={400}
          height={240}
          theme={VictoryTheme.material}
          scale={{ x: 'time' }}
          domain={{ x: [xMin, xMax], y: [0, yMax] }}
          padding={{ left: 50, right: 30, top: 10, bottom: 60 }}
        >
          <VictoryAxis
            fixLabelOverlap
            tickFormat={(t: any) => {
              const dt = new Date(t);
              return isNaN(dt.getTime()) ? '' : `${dt.getMonth() + 1}/${dt.getDate()}`;
            }}
            tickCount={5}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(v: any) => `${Math.round(Number(v))}`}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          {series.map((s, i) => (
            <VictoryLine
              key={s.key}
              data={s.points}
              x="x"
              y="y"
              interpolation="monotoneX"
              animate={{ duration: 400 }}
              style={{ data: { stroke: s.color || COLORS[i % COLORS.length], strokeWidth: 2 } }}
            />
          ))}
          <VictoryLegend
            x={70}
            y={185}
            orientation="horizontal"
            gutter={12}
            itemsPerRow={3}
            style={{ labels: { fontSize: 10 } }}
            data={legendData}
          />
        </VictoryChart>
      </Svg>
    </View>
  );
}
