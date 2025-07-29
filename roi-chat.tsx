import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { RoiMetric } from "@shared/schema";

export function RoiChart() {
  const { data: roiMetrics, isLoading } = useQuery<RoiMetric[]>({
    queryKey: ["/api/roi-metrics"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quarterly ROI Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quarterlyData = roiMetrics?.reduce((acc, metric) => {
    const key = `${metric.quarter} ${metric.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(metric);
    return acc;
  }, {} as Record<string, RoiMetric[]>) || {};

  const quarters = Object.keys(quarterlyData).slice(-4); // Last 4 quarters

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quarterly ROI Analytics</CardTitle>
          <Select defaultValue="12months">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="thisyear">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 h-full">
            {quarters.map((quarterKey, index) => {
              const metrics = quarterlyData[quarterKey] || [];
              const avgROI = metrics.length > 0 
                ? metrics.reduce((sum, m) => sum + parseFloat(m.roi || "0"), 0) / metrics.length
                : 0;
              
              const height = Math.min((avgROI / 300) * 100, 100); // Scale to max 300% ROI
              const color = index === quarters.length - 1 ? "bg-green-500" : "bg-primary";
              
              return (
                <div key={quarterKey} className="flex flex-col justify-end items-center">
                  <div 
                    className={`w-12 ${color} rounded-t transition-all duration-300`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {quarterKey.split(' ')[0]}
                  </span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {avgROI.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
