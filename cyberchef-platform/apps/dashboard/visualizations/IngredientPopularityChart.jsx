import React from 'react';
import { Bar } from 'react-chartjs-2';

export default function IngredientPopularityChart({ data, options }) {
  return <Bar data={data} options={options} />;
}
