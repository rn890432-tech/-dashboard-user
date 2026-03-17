import React from 'react';
import { Line } from 'react-chartjs-2';

export default function UserGrowthChart({ data, options }) {
  return <Line data={data} options={options} />;
}
