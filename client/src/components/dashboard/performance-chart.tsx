import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { api } from "@/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PerformanceChart() {
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/performance"],
    queryFn: api.getPerformanceData,
  });

  if (isLoading || !performanceData) {
    return (
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">SEO Performance Trend</h3>
          <p className="text-sm text-gray-500">Last 7 days performance across all websites</p>
        </div>
        <div className="p-6 h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: performanceData.map((item: any) => {
      const date = new Date(item.date);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Average SEO Score",
        data: performanceData.map((item: any) => item.score),
        borderColor: "#1976D2",
        backgroundColor: "rgba(25, 118, 210, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 70,
        max: 100,
        grid: {
          color: "#f3f4f6",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">SEO Performance Trend</h3>
        <p className="text-sm text-gray-500">Last 7 days performance across all websites</p>
      </div>
      <div className="p-6" style={{ height: "300px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
