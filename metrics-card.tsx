import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function MetricsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary"
}: MetricsCardProps) {
  const changeColorClass = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500 dark:text-gray-400"
  };

  return (
    <Card className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
            {change && (
              <p className={`text-sm mt-1 ${changeColorClass[changeType]}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
