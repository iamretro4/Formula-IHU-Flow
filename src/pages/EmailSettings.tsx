import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type EmailPreferences = {
  id: string;
  user_id: string;
  email_enabled: boolean;
  task_assigned: boolean;
  document_approval: boolean;
  deadline_alert: boolean;
  purchase_request: boolean;
  bottleneck_detected: boolean;
  certification_expiring: boolean;
  meeting_reminder: boolean;
};

const EmailSettings = () => {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (!data) {
        // Create default preferences
        const { data: newPrefs, error: createError } = await supabase
          .from("email_preferences")
          .insert({
            user_id: user.id,
            email_enabled: true,
            task_assigned: true,
            document_approval: true,
            deadline_alert: true,
            purchase_request: true,
            bottleneck_detected: true,
            certification_expiring: true,
            meeting_reminder: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      } else {
        setPreferences(data);
      }
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

  const updatePreference = async (field: keyof EmailPreferences, value: boolean) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("email_preferences")
        .update({ [field]: value })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences({ ...preferences, [field]: value });
      toast({
        title: "Preferences updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!preferences) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Loading preferences...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Notifications</h1>
          <p className="text-muted-foreground">
            Manage your email notification preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which email notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled" className="text-base font-medium">
                  Enable Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all email notifications
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
                disabled={saving}
              />
            </div>

            {preferences.email_enabled && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="task-assigned">Task Assigned</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a task is assigned to you
                    </p>
                  </div>
                  <Switch
                    id="task-assigned"
                    checked={preferences.task_assigned}
                    onCheckedChange={(checked) => updatePreference("task_assigned", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="document-approval">Document Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about document approval requests
                    </p>
                  </div>
                  <Switch
                    id="document-approval"
                    checked={preferences.document_approval}
                    onCheckedChange={(checked) => updatePreference("document_approval", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="deadline-alert">Deadline Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about upcoming deadlines
                    </p>
                  </div>
                  <Switch
                    id="deadline-alert"
                    checked={preferences.deadline_alert}
                    onCheckedChange={(checked) => updatePreference("deadline_alert", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="purchase-request">Purchase Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about purchase request approvals
                    </p>
                  </div>
                  <Switch
                    id="purchase-request"
                    checked={preferences.purchase_request}
                    onCheckedChange={(checked) => updatePreference("purchase_request", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="bottleneck-detected">Bottleneck Detected</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when bottlenecks are detected
                    </p>
                  </div>
                  <Switch
                    id="bottleneck-detected"
                    checked={preferences.bottleneck_detected}
                    onCheckedChange={(checked) => updatePreference("bottleneck_detected", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="certification-expiring">Certification Expiring</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when certifications are about to expire
                    </p>
                  </div>
                  <Switch
                    id="certification-expiring"
                    checked={preferences.certification_expiring}
                    onCheckedChange={(checked) => updatePreference("certification_expiring", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="meeting-reminder">Meeting Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about upcoming meetings
                    </p>
                  </div>
                  <Switch
                    id="meeting-reminder"
                    checked={preferences.meeting_reminder}
                    onCheckedChange={(checked) => updatePreference("meeting_reminder", checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmailSettings;

