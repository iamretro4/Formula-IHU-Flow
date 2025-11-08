import { Task } from "@/types";

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(","),
    ...data.map((row) =>
      csvHeaders.map((header) => {
        const value = row[header];
        // Handle nested objects and arrays
        if (value === null || value === undefined) return "";
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        // Escape commas and quotes
        return String(value).replace(/"/g, '""').replace(/,/g, ";");
      }).join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToJSON = <T>(data: T[], filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportTasksToCSV = (tasks: Task[]) => {
  const csvData = tasks.map((task) => ({
    Title: task.title,
    Description: task.description || "",
    Status: task.status,
    Priority: task.priority,
    "Due Date": task.due_date ? new Date(task.due_date).toLocaleDateString() : "",
    "Assigned To": task.assigned_to_profile?.full_name || "Unassigned",
    Project: task.projects?.name || "No Project",
    "Created At": new Date(task.created_at).toLocaleDateString(),
  }));

  exportToCSV(csvData, `tasks-${new Date().toISOString().split("T")[0]}`, [
    "Title",
    "Description",
    "Status",
    "Priority",
    "Due Date",
    "Assigned To",
    "Project",
    "Created At",
  ]);
};

