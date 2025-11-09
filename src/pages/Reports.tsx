import DashboardLayout from "@/components/DashboardLayout";
import { AdvancedReportBuilder } from "@/components/AdvancedReportBuilder";
import { ScheduledReports } from "@/components/ScheduledReports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, TrendingUp } from "lucide-react";

const Reports = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate custom reports and analyze your data
          </p>
        </div>

        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList>
            <TabsTrigger value="builder">
              <FileText className="mr-2 h-4 w-4" />
              Report Builder
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <TrendingUp className="mr-2 h-4 w-4" />
              Scheduled Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <AdvancedReportBuilder />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Custom metrics dashboard and trend analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Task Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">0%</p>
                      <p className="text-sm text-muted-foreground">No tasks yet</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Document Approval Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">0%</p>
                      <p className="text-sm text-muted-foreground">No documents yet</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Average Task Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">-</p>
                      <p className="text-sm text-muted-foreground">No data available</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Trend Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Trend analysis charts will appear here once you have sufficient data.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Features coming soon:
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-4 text-sm text-muted-foreground">
                      <li>Custom metrics dashboard</li>
                      <li>Trend analysis charts</li>
                      <li>Forecasting algorithms</li>
                      <li>Performance benchmarking</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <ScheduledReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

