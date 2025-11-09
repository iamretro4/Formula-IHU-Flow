import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bottleneck = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  type: string;
  severity: string;
  description: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_suggestion: string | null;
  is_resolved: boolean;
  tasks?: {
    id: string;
    title: string;
  } | null;
  projects?: {
    id: string;
    name: string;
  } | null;
};

const Bottlenecks = () => {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("active");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchBottlenecks();
    }
  }, [user]);

  // Memoize filtered bottlenecks for performance
  const filteredBottlenecks = useMemo(() => {
    let filtered = bottlenecks;

    if (severityFilter !== "all") {
      filtered = filtered.filter((b) => b.severity === severityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((b) => b.type === typeFilter);
    }

    if (resolvedFilter === "active") {
      filtered = filtered.filter((b) => !b.is_resolved);
    } else if (resolvedFilter === "resolved") {
      filtered = filtered.filter((b) => b.is_resolved);
    }

    return filtered;
  }, [bottlenecks, severityFilter, typeFilter, resolvedFilter]);

  const fetchBottlenecks = async () => {
    try {
      const { data, error } = await supabase
        .from("bottlenecks")
        .select(`
          *,
          tasks(id, title),
          projects(id, name)
        `)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      setBottlenecks(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDetectBottlenecks = async () => {
    try {
      const { error } = await supabase.rpc("detect_bottlenecks");

      if (error) throw error;

      toast({
        title: "Bottleneck detection completed",
        description: "New bottlenecks have been detected and added",
      });

      fetchBottlenecks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleResolveBottleneck = async (bottleneckId: string) => {
    try {
      const { error } = await supabase
        .from("bottlenecks")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", bottleneckId);

      if (error) throw error;

      toast({
        title: "Bottleneck marked as resolved",
      });

      fetchBottlenecks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/20 text-red-700 dark:text-red-400",
      high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      low: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    };
    return colors[severity] || colors.medium;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dependency: "Dependency",
      resource: "Resource",
      deadline: "Deadline",
      skill_gap: "Skill Gap",
      approval: "Approval",
    };
    return labels[type] || type;
  };

  const stats = {
    total: bottlenecks.length,
    active: bottlenecks.filter((b) => !b.is_resolved).length,
    resolved: bottlenecks.filter((b) => b.is_resolved).length,
    critical: bottlenecks.filter((b) => b.severity === "critical" && !b.is_resolved).length,
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bottleneck Detection</h1>
            <p className="text-muted-foreground">
              Identify and resolve preparation timeline bottlenecks
            </p>
          </div>
          <Button onClick={handleDetectBottlenecks}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Detect Bottlenecks
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Detected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.critical}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dependency">Dependency</SelectItem>
              <SelectItem value="resource">Resource</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="skill_gap">Skill Gap</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="resolved">Resolved Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredBottlenecks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium mb-2">No bottlenecks detected</p>
              <p className="text-sm text-muted-foreground">
                {resolvedFilter === "active"
                  ? "Great! No active bottlenecks at the moment."
                  : "No bottlenecks match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBottlenecks.map((bottleneck) => (
              <Card key={bottleneck.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(bottleneck.severity)}
                      <div>
                        <CardTitle>{getTypeLabel(bottleneck.type)} Bottleneck</CardTitle>
                        <CardDescription className="mt-1">
                          {bottleneck.tasks?.title && `Task: ${bottleneck.tasks.title} • `}
                          {bottleneck.projects?.name && `Project: ${bottleneck.projects.name}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityBadge(bottleneck.severity)}>
                        {bottleneck.severity}
                      </Badge>
                      {bottleneck.is_resolved && (
                        <Badge className="bg-green-500/20 text-green-700">Resolved</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{bottleneck.description}</p>
                  {bottleneck.resolution_suggestion && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Resolution Suggestion</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {bottleneck.resolution_suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Detected: {new Date(bottleneck.detected_at).toLocaleString()}
                    </p>
                    {!bottleneck.is_resolved && (
                      <Button
                        size="sm"
                        onClick={() => handleResolveBottleneck(bottleneck.id)}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Bottlenecks;

