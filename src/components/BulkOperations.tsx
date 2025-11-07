import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Square, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkOperationsProps<T extends { id: string }> {
  items: T[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkAction: (action: string, itemIds: string[]) => Promise<void>;
  availableActions: Array<{
    label: string;
    value: string;
    variant?: "default" | "destructive";
  }>;
}

export function BulkOperations<T extends { id: string }>({
  items,
  selectedItems,
  onSelectionChange,
  onBulkAction,
  availableActions,
}: BulkOperationsProps<T>) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => item.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No items selected",
        description: "Please select at least one item to perform this action",
      });
      return;
    }

    setLoading(true);
    try {
      await onBulkAction(action, selectedItems);
      toast({
        title: "Bulk action completed",
        description: `${selectedItems.length} item(s) updated`,
      });
      onSelectionChange([]);
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

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSelectAll}
        className="h-8"
      >
        {selectedItems.length === items.length ? (
          <CheckSquare className="h-4 w-4 mr-2" />
        ) : (
          <Square className="h-4 w-4 mr-2" />
        )}
        {selectedItems.length > 0
          ? `${selectedItems.length} selected`
          : "Select all"}
      </Button>

      {selectedItems.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <MoreVertical className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableActions.map((action) => (
                <DropdownMenuItem
                  key={action.value}
                  onClick={() => handleBulkAction(action.value)}
                  className={action.variant === "destructive" ? "text-destructive" : ""}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

