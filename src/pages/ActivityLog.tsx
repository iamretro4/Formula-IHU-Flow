import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { History, Search, User, Calendar, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { exportToCSV } from "@/utils/export";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { AdvancedFilters, FilterState } from "@/components/AdvancedFilters";

type Activity = {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: any;
  created_at: string;
  user_id: string | null;
  user?: {
    id: string;
    full_name: string;
  } | null;
};

const ActivityLog = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    paginatedData: paginatedActivities,
    currentPage,
    totalPages,
    goToPage,
  } = usePagination(filteredActivities, itemsPerPage);

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
      fetchActivities();
    }
  }, [user]);

  useEffect(() => {
    let filtered = activities;

    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          activity.user?.full_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((activity) => activity.type === typeFilter);
    }

    if (entityFilter !== "all") {
      filtered = filtered.filter((activity) => activity.entity_type === entityFilter);
    }

    // Apply date range filter
    if (advancedFilters.dateRange?.from || advancedFilters.dateRange?.to) {
      filtered = filtered.filter((activity) => {
        const activityDate = parseISO(activity.created_at);
        if (advancedFilters.dateRange?.from && activityDate < advancedFilters.dateRange.from) {
          return false;
        }
        if (advancedFilters.dateRange?.to) {
          const toDate = new Date(advancedFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (activityDate > toDate) {
            return false;
          }
        }
        return true;
      });
    }

    setFilteredActivities(filtered);
  }, [activities, debouncedSearchQuery, typeFilter, entityFilter, advancedFilters]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Fetch user profiles
      const activitiesWithUsers = await Promise.all(
        (data || []).map(async (activity: any) => {
          if (activity.user_id) {
            const { data: userData } = await supabase
              .from("profiles")
              .select("id, full_name")
              .eq("id", activity.user_id)
              .single();
            return { ...activity, user: userData };
          }
          return activity;
        })
      );

      setActivities(activitiesWithUsers);
      setFilteredActivities(activitiesWithUsers);
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

  const handleExport = () => {
    const csvData = filteredActivities.map((activity) => ({
      Type: getTypeLabel(activity.type),
      Description: activity.description,
      Entity: activity.entity_type || "",
      User: activity.user?.full_name || "System",
      Date: format(parseISO(activity.created_at), "PPpp"),
      "Relative Time": formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true }),
    }));

    exportToCSV(csvData, `activity-log-${new Date().toISOString().split("T")[0]}`, [
      "Type",
      "Description",
      "Entity",
      "User",
      "Date",
      "Relative Time",
    ]);
  };

  const getActivityIcon = (type: string) => {
    if (type.includes("created")) return "➕";
    if (type.includes("updated")) return "✏️";
    if (type.includes("deleted")) return "🗑️";
    if (type.includes("completed") || type.includes("approved")) return "✅";
    if (type.includes("assigned")) return "👤";
    return "📝";
  };

  const getActivityColor = (type: string) => {
    if (type.includes("created")) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    if (type.includes("deleted")) return "bg-red-500/20 text-red-700 dark:text-red-400";
    if (type.includes("completed") || type.includes("approved")) return "bg-green-500/20 text-green-700 dark:text-green-400";
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Complete audit trail of all system activities
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task_created">Task Created</SelectItem>
              <SelectItem value="task_updated">Task Updated</SelectItem>
              <SelectItem value="task_completed">Task Completed</SelectItem>
              <SelectItem value="document_created">Document Created</SelectItem>
              <SelectItem value="document_approved">Document Approved</SelectItem>
              <SelectItem value="comment_created">Comment Created</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="milestone">Milestones</SelectItem>
            </SelectContent>
          </Select>
          <AdvancedFilters
            onFilterChange={setAdvancedFilters}
            availableFilters={{
              status: ["created", "updated", "deleted", "completed", "approved"],
            }}
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No activities found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || typeFilter !== "all" || entityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Activities will appear here as users interact with the system"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {paginatedActivities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{activity.description}</p>
                            <Badge className={getActivityColor(activity.type)}>
                              {getTypeLabel(activity.type)}
                            </Badge>
                            {activity.entity_type && (
                              <Badge variant="outline" className="text-xs">
                                {activity.entity_type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {activity.user && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{activity.user.full_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(parseISO(activity.created_at), "PPp")}</span>
                              <span className="ml-2">
                                ({formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })})
                              </span>
                            </div>
                          </div>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <details>
                                <summary className="cursor-pointer">View details</summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredActivities.length}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityLog;
