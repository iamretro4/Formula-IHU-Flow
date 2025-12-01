import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPreferences } from "@/components/UserPreferences";
import { ThirdPartyIntegrations } from "@/components/ThirdPartyIntegrations";
import { AdvancedPermissions } from "@/components/AdvancedPermissions";
import { VisualWorkflowBuilder } from "@/components/VisualWorkflowBuilder";
import { DiscordIntegration } from "@/components/DiscordIntegration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

function EmailSettingsComponent() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [documentApprovals, setDocumentApprovals] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("email_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setEmailNotifications(data.email_notifications ?? true);
        setDocumentApprovals(data.document_approvals ?? true);
        setTaskAssignments(data.task_assignments ?? true);
        setMentions(data.mentions ?? true);
      }
    } catch (error) {
      // Table might not exist yet
    }
  };

  const saveEmailSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("email_preferences" as any)
        .upsert({
          user_id: user.id,
          email_notifications: emailNotifications,
          document_approvals: documentApprovals,
          task_assignments: taskAssignments,
          mentions: mentions,
        });

      toast({ title: "Email preferences saved successfully" });
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
    <Card>
      <CardHeader>
        <CardTitle>Email Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications">Enable Email Notifications</Label>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="document-approvals">Document Approval Requests</Label>
          <Switch
            id="document-approvals"
            checked={documentApprovals}
            onCheckedChange={setDocumentApprovals}
            disabled={!emailNotifications}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="task-assignments">Task Assignments</Label>
          <Switch
            id="task-assignments"
            checked={taskAssignments}
            onCheckedChange={setTaskAssignments}
            disabled={!emailNotifications}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mentions">@Mentions in Comments</Label>
          <Switch
            id="mentions"
            checked={mentions}
            onCheckedChange={setMentions}
            disabled={!emailNotifications}
          />
        </div>
        <Button onClick={saveEmailSettings} disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your preferences and account settings
          </p>
        </div>

        <Tabs defaultValue="preferences" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
          </TabsList>
          <TabsContent value="preferences">
            <UserPreferences />
          </TabsContent>
          <TabsContent value="email">
            <EmailSettingsComponent />
          </TabsContent>
          <TabsContent value="integrations" className="space-y-4">
            <DiscordIntegration />
            <ThirdPartyIntegrations />
          </TabsContent>
          <TabsContent value="permissions">
            <AdvancedPermissions />
          </TabsContent>
          <TabsContent value="workflows">
            <VisualWorkflowBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

