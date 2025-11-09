import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import ApprovalWorkflows from "./pages/ApprovalWorkflows";
import Budgets from "./pages/Budgets";
import Communications from "./pages/Communications";
import GanttChart from "./pages/GanttChart";
import CalendarView from "./pages/CalendarView";
import ActivityLog from "./pages/ActivityLog";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors (table doesn't exist, resource not found)
        if (error?.code === "PGRST116" || error?.code === "42P01" || error?.message?.includes("404") || error?.message?.includes("NOT_FOUND")) {
          return false;
        }
        // Retry once for other errors
        return failureCount < 1;
      },
      onError: (error: any) => {
        // Silently handle expected errors (missing tables, no rows, etc.)
        if (error?.code === "PGRST116" || error?.code === "42P01" || error?.message?.includes("does not exist")) {
          return; // Don't log expected errors
        }
        // Only log unexpected errors
        if (error?.message && !error.message.includes("404") && !error.message.includes("NOT_FOUND")) {
          console.error("Query error:", error);
        }
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <GlobalSearch />
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/approval-workflows" element={<ApprovalWorkflows />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/gantt-chart" element={<GanttChart />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/team" element={<Team />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
