// Dynamic import wrapper for recharts that ensures React is ready
import { useState, useEffect } from "react";

// Cache for loaded recharts
let rechartsCache: any = null;
let loadingPromise: Promise<any> | null = null;

async function loadRecharts() {
  if (rechartsCache) return rechartsCache;
  if (loadingPromise) return loadingPromise;
  
  // Just load recharts directly - no need to check for window.React
  // React will be available when this runs because it's imported in the component
  loadingPromise = import("recharts").then((mod) => {
    rechartsCache = mod;
    return mod;
  });
  
  return loadingPromise;
}

// Hook to get recharts components - returns all components at once
export function useRecharts() {
  const [recharts, setRecharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRecharts().then((mod) => {
      setRecharts(mod);
      setLoading(false);
    });
  }, []);
  
  return { 
    recharts, 
    loading,
    // Export commonly used components for convenience
    BarChart: recharts?.BarChart,
    Bar: recharts?.Bar,
    XAxis: recharts?.XAxis,
    YAxis: recharts?.YAxis,
    CartesianGrid: recharts?.CartesianGrid,
    Tooltip: recharts?.Tooltip,
    ResponsiveContainer: recharts?.ResponsiveContainer,
    PieChart: recharts?.PieChart,
    Pie: recharts?.Pie,
    Cell: recharts?.Cell,
    Legend: recharts?.Legend,
    LineChart: recharts?.LineChart,
    Line: recharts?.Line,
  };
}

