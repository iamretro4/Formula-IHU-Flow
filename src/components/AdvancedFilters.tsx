import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableFilters?: {
    status?: string[];
    priority?: string[];
    type?: string[];
    assignee?: string[];
  };
}

export interface FilterState {
  dateRange?: DateRange;
  status?: string[];
  priority?: string[];
  type?: string[];
  assignee?: string[];
  searchQuery?: string;
}

export const AdvancedFilters = ({ onFilterChange, availableFilters }: AdvancedFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: undefined, to: undefined },
  });

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilter = (key: keyof FilterState) => {
    const updated = { ...filters };
    delete updated[key];
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearAll = () => {
    const cleared = { dateRange: { from: undefined, to: undefined } };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => {
      const value = filters[key as keyof FilterState];
      if (key === "dateRange") {
        return value && (value.from || value.to);
      }
      return value && Array.isArray(value) && value.length > 0;
    }
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: filters.dateRange?.from,
                    to: filters.dateRange?.to,
                  }}
                  onSelect={(range) =>
                    updateFilters({
                      dateRange: {
                        from: range?.from,
                        to: range?.to,
                      },
                    })
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {filters.dateRange?.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("dateRange")}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear date range
              </Button>
            )}
          </div>

          {/* Status Filter */}
          {availableFilters?.status && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status?.join(",") || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    status: value === "all" ? undefined : value.split(","),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableFilters.status.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Filter */}
          {availableFilters?.priority && (
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority?.join(",") || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    priority: value === "all" ? undefined : value.split(","),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {availableFilters.priority.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs">Active Filters:</Label>
              <div className="flex flex-wrap gap-2">
                {filters.dateRange?.from && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {format(filters.dateRange.from, "MMM dd")}
                    {filters.dateRange.to && ` - ${format(filters.dateRange.to, "MMM dd")}`}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => clearFilter("dateRange")}
                    />
                  </Badge>
                )}
                {filters.status && filters.status.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filters.status.length}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => clearFilter("status")}
                    />
                  </Badge>
                )}
                {filters.priority && filters.priority.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Priority: {filters.priority.length}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => clearFilter("priority")}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

