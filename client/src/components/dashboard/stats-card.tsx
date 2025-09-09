import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  change,
  changeType,
}: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 ${iconColor} rounded-lg flex items-center justify-center`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900 flex items-center">
                {value}
                {change && (
                  <span
                    className={`ml-2 text-sm flex items-center ${
                      changeType === "positive"
                        ? "text-green-600"
                        : changeType === "negative"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {change}
                  </span>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
