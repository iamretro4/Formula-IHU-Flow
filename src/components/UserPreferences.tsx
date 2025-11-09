import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UserPreferences = {
  theme: "light" | "dark" | "system";
  defaultView: {
    tasks: "list" | "kanban";
    documents: "grid" | "list";
  };
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
  };
};

export function UserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    defaultView: {
      tasks: "list",
      documents: "grid",
    },
    language: "en",
    notifications: {
      email: true,
      browser: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    const saved = localStorage.getItem("userPreferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      localStorage.setItem("userPreferences", JSON.stringify(preferences));
      
      // Also save to database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save to user_preferences table if it exists
        await supabase
          .from("user_preferences" as any)
          .upsert({
            user_id: user.id,
            preferences: preferences,
          })
          .catch(() => {
            // Table might not exist, that's okay
          });
      }

      toast({ title: "Preferences saved successfully" });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={preferences.theme}
              onValueChange={(value) =>
                setPreferences({ ...preferences, theme: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Views</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tasks View</Label>
            <Select
              value={preferences.defaultView.tasks}
              onValueChange={(value) =>
                setPreferences({
                  ...preferences,
                  defaultView: { ...preferences.defaultView, tasks: value as any },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Documents View</Label>
            <Select
              value={preferences.defaultView.documents}
              onValueChange={(value) =>
                setPreferences({
                  ...preferences,
                  defaultView: { ...preferences.defaultView, documents: value as any },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <Switch
              id="email-notifications"
              checked={preferences.notifications.email}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, email: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="browser-notifications">Browser Notifications</Label>
            <Switch
              id="browser-notifications"
              checked={preferences.notifications.browser}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, browser: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={savePreferences} disabled={loading} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Save Preferences
      </Button>
    </div>
  );
}

