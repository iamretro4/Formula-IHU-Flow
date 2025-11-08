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
      retry: 1,
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
