import { AlertTriangle, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock SEO issues data
const seoIssues = [
  {
    id: "1",
    type: "critical",
    title: "Missing Meta Descriptions",
    description: "Several pages are missing meta descriptions, which are important for search engine results.",
    website: "RestaurantSite.com",
    affectedPages: 8,
    autoFixAvailable: true,
  },
  {
    id: "2",
    type: "warning",
    title: "Slow Page Load Speed",
    description: "Page load times are above recommended thresholds, affecting user experience and rankings.",
    website: "E-Commerce.store",
    affectedPages: 3,
    autoFixAvailable: false,
  },
  {
    id: "3",
    type: "success",
    title: "Schema Markup Added",
    description: "All pages now have proper structured data markup for better search visibility.",
    website: "TechBlog.com",
    affectedPages: 0,
    autoFixAvailable: false,
  },
];

const getIssueIcon = (type: string) => {
  switch (type) {
    case "critical":
      return <AlertCircle className="w-4 h-4 text-white" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-white" />;
    case "success":
      return <CheckCircle className="w-4 h-4 text-white" />;
    default:
      return <AlertCircle className="w-4 h-4 text-white" />;
  }
};

const getIssueStyles = (type: string) => {
  switch (type) {
    case "critical":
      return {
        container: "bg-red-50 border-l-4 border-red-400",
        icon: "bg-red-500",
        title: "text-red-800",
        description: "text-red-600",
        button: "bg-red-100 hover:bg-red-200 text-red-800",
      };
    case "warning":
      return {
        container: "bg-yellow-50 border-l-4 border-yellow-400",
        icon: "bg-yellow-500",
        title: "text-yellow-800",
        description: "text-yellow-600",
        button: "bg-yellow-100 hover:bg-yellow-200 text-yellow-800",
      };
    case "success":
      return {
        container: "bg-green-50 border-l-4 border-green-400",
        icon: "bg-green-500",
        title: "text-green-800",
        description: "text-green-600",
        button: "bg-green-100 hover:bg-green-200 text-green-800",
      };
    default:
      return {
        container: "bg-gray-50 border-l-4 border-gray-400",
        icon: "bg-gray-500",
        title: "text-gray-800",
        description: "text-gray-600",
        button: "bg-gray-100 hover:bg-gray-200 text-gray-800",
      };
  }
};

export default function SEOIssues() {
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">SEO Issues & Fixes</h3>
        <p className="text-sm text-gray-500">Automated SEO analysis and recommendations</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {seoIssues.map((issue) => {
            const styles = getIssueStyles(issue.type);
            const icon = getIssueIcon(issue.type);
            
            return (
              <div key={issue.id} className={`flex items-start space-x-4 p-4 rounded-lg ${styles.container}`}>
                <div className={`w-6 h-6 ${styles.icon} rounded-full flex items-center justify-center flex-shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${styles.title}`}>{issue.title}</p>
                  <p className={`text-xs ${styles.description} mt-1`}>
                    {issue.website}
                    {issue.affectedPages > 0 && ` • ${issue.affectedPages} pages affected`}
                  </p>
                  <p className={`text-xs ${styles.description} mt-1`}>{issue.description}</p>
                  {issue.autoFixAvailable && issue.type !== "success" && (
                    <Button
                      size="sm"
                      className={`mt-2 text-xs px-2 py-1 h-6 ${styles.button}`}
                      variant="ghost"
                    >
                      Auto-Fix Available
                    </Button>
                  )}
                  {issue.type === "success" && (
                    <div className="flex items-center mt-2">
                      <span className={`text-xs ${styles.title} flex items-center`}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    </div>
                  )}
                </div>
                {issue.type !== "success" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
