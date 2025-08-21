import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock client reports data
const clientReports = [
  {
    id: "1",
    name: "TechBlog Monthly Report",
    period: "Nov 2024",
    seoChange: 8,
    contentPublished: 12,
    trafficChange: 24,
    type: "monthly",
  },
  {
    id: "2",
    name: "E-Commerce Weekly",
    period: "Week 46",
    seoChange: 2,
    contentPublished: 3,
    trafficChange: 15,
    type: "weekly",
  },
  {
    id: "3",
    name: "Restaurant Report",
    period: "Nov 2024",
    seoChange: -3,
    contentPublished: 6,
    trafficChange: 0,
    type: "monthly",
  },
];

const getTrendIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="w-3 h-3" />;
  if (change < 0) return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const getTrendColor = (change: number) => {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-gray-600";
};

export default function ClientReports() {
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Client Reports</h3>
            <p className="text-sm text-gray-500">Automated weekly and monthly client reports</p>
          </div>
          <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            Generate Report
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientReports.map((report) => (
            <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                <span className="text-xs text-gray-500">{report.period}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">SEO Score</span>
                  <span className={`font-medium flex items-center ${getTrendColor(report.seoChange)}`}>
                    {getTrendIcon(report.seoChange)}
                    <span className="ml-1">
                      {report.seoChange > 0 ? '+' : ''}{report.seoChange}%
                    </span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Content Published</span>
                  <span className="font-medium">{report.contentPublished} posts</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Traffic Change</span>
                  <span className={`font-medium flex items-center ${getTrendColor(report.trafficChange)}`}>
                    {report.trafficChange !== 0 && getTrendIcon(report.trafficChange)}
                    <span className="ml-1">
                      {report.trafficChange > 0 ? '+' : ''}
                      {report.trafficChange === 0 ? 'Stable' : `${report.trafficChange}%`}
                    </span>
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
