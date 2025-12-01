
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { CommandPalette } from "./components/CommandPalette";
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Documents = lazy(() => import("./pages/Documents"));
const Team = lazy(() => import("./pages/Team"));
const Projects = lazy(() => import("./pages/Projects"));
const Budgets = lazy(() => import("./pages/Budgets"));
const GanttChart = lazy(() => import("./pages/GanttChart"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingFlow = lazy(() => import("./components/OnboardingFlow").then(m => ({ default: m.OnboardingFlow })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md p-8">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-2 mt-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 60 seconds - increased for better caching
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      refetchOnReconnect: true,
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
    mutations: {
      retry: 1,
      onError: (error: any) => {
        console.error("Mutation error:", error);
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
          <CommandPalette />
          <KeyboardShortcutsDialog />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/gantt-chart" element={<GanttChart />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Suspense fallback={null}>
              <OnboardingFlow />
            </Suspense>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
