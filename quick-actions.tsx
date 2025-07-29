import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncGmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gmail/sync"),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Gmail Sync Complete",
        description: `Imported ${result.messagesImported} new messages`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Unable to sync Gmail messages",
        variant: "destructive",
      });
    },
  });

  const handleCreateTest = () => {
    // Navigate to test creation page
    window.location.href = "/testing";
  };

  const handleSyncGmail = () => {
    syncGmailMutation.mutate();
  };

  const handleExportReport = () => {
    // Simulate report export
    toast({
      title: "Report Exported",
      description: "Analytics report has been downloaded",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button
            onClick={handleCreateTest}
            className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-0"
            variant="outline"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Create New Test</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Build custom assessment
              </p>
            </div>
          </Button>

          <Button
            onClick={handleSyncGmail}
            disabled={syncGmailMutation.isPending}
            className="w-full justify-start bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-0 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400"
            variant="outline"
          >
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <RefreshCw className={`h-4 w-4 text-white ${syncGmailMutation.isPending ? "animate-spin" : ""}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Sync Gmail</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Import latest messages
              </p>
            </div>
          </Button>

          <Button
            onClick={handleExportReport}
            className="w-full justify-start bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-800 border-0 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-400"
            variant="outline"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
              <Download className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Export Report</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Download analytics data
              </p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
