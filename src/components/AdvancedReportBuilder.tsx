import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/export";
import { useTasks } from "@/hooks/useTasks";
import { useDocuments } from "@/hooks/useDocuments";
import { useProjects } from "@/hooks/useProjects";

type ReportType = "tasks" | "documents" | "projects" | "combined";
type ExportFormat = "csv" | "pdf" | "excel";

export function AdvancedReportBuilder() {
  const [reportType, setReportType] = useState<ReportType>("tasks");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [includeFilters, setIncludeFilters] = useState(true);
  const { data: tasks } = useTasks();
  const { data: documents } = useDocuments();
  const { data: projects } = useProjects();

  const availableFields: Record<ReportType, string[]> = {
    tasks: ["title", "description", "status", "priority", "due_date", "assigned_to", "project"],
    documents: ["title", "description", "document_type", "status", "submission_deadline", "uploaded_by"],
    projects: ["name", "description", "status", "start_date", "end_date", "competition_date"],
    combined: ["all"],
  };

  const handleExport = () => {
    let data: any[] = [];

    switch (reportType) {
      case "tasks":
        data = (tasks || []).map((task) => ({
          Title: task.title,
          Description: task.description || "",
          Status: task.status,
          Priority: task.priority,
          "Due Date": task.due_date ? new Date(task.due_date).toLocaleDateString() : "",
          "Assigned To": task.assigned_to_profile?.full_name || "N/A",
          Project: task.projects?.name || "N/A",
        }));
        break;
      case "documents":
        data = (documents || []).map((doc) => ({
          Title: doc.title,
          Description: doc.description || "",
          Type: doc.document_type,
          Status: doc.is_approved ? "Approved" : "Pending",
          "Submission Deadline": doc.submission_deadline
            ? new Date(doc.submission_deadline).toLocaleDateString()
            : "",
        }));
        break;
      case "projects":
        data = (projects || []).map((project) => ({
          Name: project.name,
          Description: project.description || "",
          Status: project.status,
          "Start Date": new Date(project.start_date).toLocaleDateString(),
          "End Date": new Date(project.end_date).toLocaleDateString(),
        }));
        break;
    }

    // Apply date filter if set
    let filteredData = data;
    if (dateRange?.from && dateRange?.to) {
      filteredData = data.filter((item: any) => {
        // Try to find a date field (created_at, due_date, etc.)
        const dateField = item['Created At'] || item['Due Date'] || item['Start Date'] || item['Submission Deadline'];
        if (!dateField) return true;
        
        try {
          const itemDate = new Date(dateField);
          return itemDate >= dateRange.from! && itemDate <= dateRange.to!;
        } catch {
          return true;
        }
      });
    }

    const filename = `report-${reportType}-${new Date().toISOString().split("T")[0]}`;
    const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;

    switch (exportFormat) {
      case "csv":
        exportToCSV(filteredData, filename);
        break;
      case "excel":
        exportToExcel(filteredData, filename, reportTitle);
        break;
      case "pdf":
        exportToPDF(filteredData, filename, reportTitle, true);
        break;
      default:
        exportToCSV(filteredData, filename);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Report Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="combined">Combined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Export Format</Label>
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-filters"
            checked={includeFilters}
            onCheckedChange={(checked) => setIncludeFilters(!!checked)}
          />
          <Label htmlFor="include-filters" className="text-sm font-normal">
            Include current filters in report
          </Label>
        </div>

        <Button onClick={handleExport} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}

