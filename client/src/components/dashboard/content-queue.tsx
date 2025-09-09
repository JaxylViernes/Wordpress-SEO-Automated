import { Bot, Clock, CheckCircle } from "lucide-react";

// Mock content queue data
const queueItems = [
  {
    id: "1",
    title: "Latest WordPress Security Tips",
    website: "TechBlog.com",
    aiModel: "GPT-4",
    status: "in_progress",
    progress: 65,
  },
  {
    id: "2",
    title: "Product Review: Smart Home Devices",
    website: "E-Commerce.store",
    aiModel: "Claude-3",
    status: "queued",
    progress: 0,
  },
  {
    id: "3",
    title: "Local SEO for Restaurants 2024",
    website: "RestaurantSite.com",
    aiModel: "GPT-4",
    status: "completed",
    progress: 100,
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "in_progress":
      return <Bot className="w-4 h-4 text-white" />;
    case "queued":
      return <Clock className="w-4 h-4 text-white" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-white" />;
    default:
      return <Bot className="w-4 h-4 text-white" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "in_progress":
      return "bg-blue-500";
    case "queued":
      return "bg-yellow-500";
    case "completed":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "queued":
      return "Queued";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

export default function ContentQueue() {
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Content Generation Queue
        </h3>
        <p className="text-sm text-gray-500">
          AI-powered content creation in progress
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {queueItems.map((item) => {
            const statusColor = getStatusColor(item.status);
            const statusIcon = getStatusIcon(item.status);
            const statusText = getStatusText(item.status);

            return (
              <div
                key={item.id}
                className={`flex items-center space-x-4 p-4 rounded-lg ${
                  item.status === "in_progress"
                    ? "bg-blue-50"
                    : item.status === "queued"
                    ? "bg-yellow-50"
                    : item.status === "completed"
                    ? "bg-green-50"
                    : "bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 ${statusColor} rounded-lg flex items-center justify-center`}
                >
                  {statusIcon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.website} • {item.aiModel} • {statusText}
                  </p>
                  {item.status === "in_progress" && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
