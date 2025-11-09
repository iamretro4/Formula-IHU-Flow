import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Star, X, CheckSquare, FileText, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type RecentItem = {
  id: string;
  type: "task" | "document" | "project";
  title: string;
  path: string;
  viewedAt: string;
  isBookmarked?: boolean;
};

export function RecentItemsSidebar() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<RecentItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentItems();
    loadBookmarks();
  }, []);

  const loadRecentItems = () => {
    const stored = localStorage.getItem("recentItems");
    if (stored) {
      setRecentItems(JSON.parse(stored));
    }
  };

  const loadBookmarks = () => {
    const stored = localStorage.getItem("bookmarkedItems");
    if (stored) {
      setBookmarkedItems(JSON.parse(stored));
    }
  };

  const toggleBookmark = (item: RecentItem) => {
    const bookmarks = [...bookmarkedItems];
    const index = bookmarks.findIndex((b) => b.id === item.id && b.type === item.type);

    if (index >= 0) {
      bookmarks.splice(index, 1);
    } else {
      bookmarks.push({ ...item, isBookmarked: true });
    }

    setBookmarkedItems(bookmarks);
    localStorage.setItem("bookmarkedItems", JSON.stringify(bookmarks));
  };

  const clearRecent = () => {
    setRecentItems([]);
    localStorage.removeItem("recentItems");
  };

  const getIcon = (type: RecentItem["type"]) => {
    switch (type) {
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "project":
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Recent Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent
            </CardTitle>
            {recentItems.length > 0 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearRecent}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            {recentItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No recent items
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {recentItems.slice(0, 10).map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                    onClick={() => navigate(item.path)}
                  >
                    {getIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(item);
                      }}
                    >
                      <Star
                        className={`h-3 w-3 ${
                          bookmarkedItems.some((b) => b.id === item.id && b.type === item.type)
                            ? "fill-yellow-400 text-yellow-400"
                            : ""
                        }`}
                      />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bookmarks */}
      {bookmarkedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[150px]">
              <div className="space-y-1 p-2">
                {bookmarkedItems.map((item) => (
                  <div
                    key={`bookmark-${item.type}-${item.id}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                    onClick={() => navigate(item.path)}
                  >
                    {getIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(item);
                      }}
                    >
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook to track recent items
export function useTrackRecentItem() {
  const trackItem = (type: RecentItem["type"], id: string, title: string, path: string) => {
    const stored = localStorage.getItem("recentItems");
    const items: RecentItem[] = stored ? JSON.parse(stored) : [];

    // Remove existing item if present
    const filtered = items.filter((item) => !(item.id === id && item.type === type));

    // Add to beginning
    const newItem: RecentItem = {
      id,
      type,
      title,
      path,
      viewedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem("recentItems", JSON.stringify(updated));
  };

  return { trackItem };
}

