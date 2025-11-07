import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { WorkloadStats, ProductivityStats } from "@/lib/workload";

type WorkloadProductivityCardProps = {
  workload: WorkloadStats;
  productivity: ProductivityStats;
};

export function WorkloadProductivityCard({
  workload,
  productivity,
}: WorkloadProductivityCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-gradient-racing text-primary-foreground">
              {getInitials(workload.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{workload.userName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {workload.totalTasks} total tasks
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getProductivityColor(productivity.productivityScore)}`}>
              {productivity.productivityScore}
            </div>
            <p className="text-xs text-muted-foreground">Productivity</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workload Stats */}
        <div>
          <h4 className="text-sm font-medium mb-2">Workload</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active</span>
              <Badge variant="outline">{workload.activeTasks}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <Badge variant="outline" className="bg-green-500/10">
                {workload.completedTasks}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Overdue</span>
              <Badge
                variant="outline"
                className={workload.overdueTasks > 0 ? "bg-red-500/10 text-red-600" : ""}
              >
                {workload.overdueTasks}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Critical</span>
              <Badge variant="outline" className="bg-red-500/10">
                {workload.tasksByPriority.critical}
              </Badge>
            </div>
          </div>
        </div>

        {/* Productivity Stats */}
        <div>
          <h4 className="text-sm font-medium mb-2">Productivity</h4>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">On-Time Rate</span>
                <span className="font-medium">
                  {productivity.onTimeCompletionRate}%
                </span>
              </div>
              <Progress value={productivity.onTimeCompletionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {productivity.completedOnTime} on-time
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                {productivity.completedOverdue} overdue
              </div>
            </div>
            {productivity.averageDaysOverdue > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Avg {productivity.averageDaysOverdue} days overdue
              </div>
            )}
            {productivity.averageDaysOnTime > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-600" />
                Avg {productivity.averageDaysOnTime} days early
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-2">Status Breakdown</h4>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(workload.tasksByStatus).map(([status, count]) => (
              count > 0 && (
                <Badge key={status} variant="outline" className="text-xs">
                  {status.replace("_", " ")}: {count}
                </Badge>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

