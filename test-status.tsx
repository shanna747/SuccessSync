import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TestAssignment } from "@shared/schema";

export function TestStatus() {
  const { data: assignments, isLoading } = useQuery<TestAssignment[]>({
    queryKey: ["/api/test-assignments"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusCounts = assignments?.reduce((acc, assignment) => {
    acc[assignment.status!] = (acc[assignment.status!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusConfig = [
    {
      key: "completed",
      label: "Completed",
      color: "bg-green-500",
      count: statusCounts.completed || 0,
    },
    {
      key: "in_progress",
      label: "In Progress",
      color: "bg-yellow-500",
      count: statusCounts.in_progress || 0,
    },
    {
      key: "pending",
      label: "Pending",
      color: "bg-gray-400",
      count: statusCounts.pending || 0,
    },
    {
      key: "overdue",
      label: "Overdue",
      color: "bg-red-500",
      count: statusCounts.overdue || 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusConfig.map((status) => (
            <div key={status.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${status.color} rounded-full`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {status.label}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {status.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
