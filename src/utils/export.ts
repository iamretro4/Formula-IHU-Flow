import { Task } from "@/types";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const csvHeaders = headers || Object.keys(data[0]);
  const csvContent = [
    csvHeaders.join(","),
    ...data.map((row) =>
      csvHeaders.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return String(value).replace(/"/g, '""').replace(/,/g, ";");
      }).join(",")
    ),
  ].join("\n");

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

export function exportToCSVSimple(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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

export function exportToExcel(data: any[], filename: string, title?: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const workbook = XLSX.utils.book_new();
    
    // Create summary sheet if title provided
    if (title) {
      const summaryData = [
        ['Report Title', title],
        ['Generated', new Date().toLocaleString()],
        ['Total Records', data.length],
        [],
        ['Summary Statistics'],
      ];
      
      // Add status counts if available
      const statusColumn = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('status')
      );
      if (statusColumn) {
        const statusCounts: Record<string, number> = {};
        data.forEach(row => {
          const status = String(row[statusColumn] || 'Unknown');
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        summaryData.push(['Status', 'Count']);
        Object.entries(statusCounts).forEach(([status, count]) => {
          summaryData.push([status, count]);
        });
      }
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
    
    // Main data sheet with formatting
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const maxWidth = 50;
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.min(Math.max(key.length, 10), maxWidth)
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error: any) {
    console.error('Excel export error:', error);
    alert(`Failed to export to Excel: ${error.message}`);
  }
}

export function exportToPDF(data: any[], filename: string, title?: string, includeCharts: boolean = false) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const doc = new jsPDF();
    let currentY = 20;
    
    // Add title if provided
    if (title) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, 14, currentY);
      currentY += 10;
      
      // Add generation date
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, currentY);
      currentY += 15;
    }

    // Add summary statistics if data is available
    if (data.length > 0 && includeCharts) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Summary Statistics', 14, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Records: ${data.length}`, 14, currentY);
      currentY += 6;
      
      // Count by status if status column exists
      const statusColumn = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('status')
      );
      if (statusColumn) {
        const statusCounts: Record<string, number> = {};
        data.forEach(row => {
          const status = String(row[statusColumn] || 'Unknown');
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          doc.text(`${status}: ${count}`, 20, currentY);
          currentY += 6;
        });
        currentY += 5;
      }
    }

    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        // Truncate long values
        const str = String(value);
        return str.length > 50 ? str.substring(0, 47) + '...' : str;
      })
    );

    // Add table with better formatting
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: currentY, left: 14, right: 14 },
      tableWidth: 'auto',
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${filename}.pdf`);
  } catch (error: any) {
    console.error('PDF export error:', error);
    alert(`Failed to export to PDF: ${error.message}`);
  }
}
