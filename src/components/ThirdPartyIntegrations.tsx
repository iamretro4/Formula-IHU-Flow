import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Github, Users, CheckCircle2, X, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Integration = {
  id: string;
  type: "slack" | "teams" | "github";
  name: string;
  webhook_url?: string;
  channel?: string;
  repository?: string;
  is_active: boolean;
  created_at: string;
};

export function ThirdPartyIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"slack" | "teams" | "github" | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    webhook_url: "",
    channel: "",
    repository: "",
    is_active: true,
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real implementation, this would fetch from a integrations table
      // For now, we'll use localStorage as a demo
      const stored = localStorage.getItem(`integrations_${user.id}`);
      setIntegrations(stored ? JSON.parse(stored) : []);
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

  const handleConnect = async (type: "slack" | "teams" | "github") => {
    setSelectedType(type);
    setFormData({
      webhook_url: "",
      channel: "",
      repository: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedType) return;

      const newIntegration: Integration = {
        id: crypto.randomUUID(),
        type: selectedType,
        name: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Integration`,
        webhook_url: formData.webhook_url,
        channel: formData.channel || undefined,
        repository: formData.repository || undefined,
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
      };

      const updated = [...integrations, newIntegration];
      localStorage.setItem(`integrations_${user.id}`, JSON.stringify(updated));
      setIntegrations(updated);
      setDialogOpen(false);
      setSelectedType(null);
      toast({ title: "Integration connected successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = integrations.map((int) =>
        int.id === id ? { ...int, is_active: !int.is_active } : int
      );
      localStorage.setItem(`integrations_${user.id}`, JSON.stringify(updated));
      setIntegrations(updated);
      toast({ title: "Integration updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = integrations.filter((int) => int.id !== id);
      localStorage.setItem(`integrations_${user.id}`, JSON.stringify(updated));
      setIntegrations(updated);
      toast({ title: "Integration disconnected" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case "slack":
        return <MessageSquare className="h-5 w-5" />;
      case "teams":
        return <Users className="h-5 w-5" />;
      case "github":
        return <Github className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Third-Party Integrations</h2>
        <p className="text-muted-foreground">Connect with external services for notifications and automation</p>
      </div>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">Available Integrations</TabsTrigger>
          <TabsTrigger value="connected">Connected ({integrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                  <CardTitle>Slack</CardTitle>
                </div>
                <CardDescription>Send notifications to Slack channels</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 mb-4">
                  <li>• Task assignment notifications</li>
                  <li>• Document approval alerts</li>
                  <li>• Project milestone updates</li>
                </ul>
                <Button onClick={() => handleConnect("slack")} className="w-full">
                  Connect Slack
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  <CardTitle>Microsoft Teams</CardTitle>
                </div>
                <CardDescription>Integrate with Teams for collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 mb-4">
                  <li>• Team channel notifications</li>
                  <li>• Meeting reminders</li>
                  <li>• Status updates</li>
                </ul>
                <Button onClick={() => handleConnect("teams")} className="w-full">
                  Connect Teams
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Github className="h-6 w-6" />
                  <CardTitle>GitHub</CardTitle>
                </div>
                <CardDescription>Link repositories and track issues</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 mb-4">
                  <li>• Repository linking</li>
                  <li>• Issue tracking sync</li>
                  <li>• Commit notifications</li>
                </ul>
                <Button onClick={() => handleConnect("github")} className="w-full">
                  Connect GitHub
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No integrations connected</p>
                <p className="text-sm text-muted-foreground">
                  Connect an integration to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getIntegrationIcon(integration.type)}
                        <div>
                          <CardTitle>{integration.name}</CardTitle>
                          <CardDescription>
                            {integration.channel && `Channel: ${integration.channel}`}
                            {integration.repository && `Repository: ${integration.repository}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={() => handleToggle(integration.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {integration.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Connect {selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Configure your {selectedType} integration settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedType === "slack" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel Name</Label>
                  <Input
                    id="channel"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    placeholder="#general"
                  />
                </div>
              </>
            )}

            {selectedType === "teams" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    placeholder="https://outlook.office.com/webhook/..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel Name</Label>
                  <Input
                    id="channel"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    placeholder="General"
                  />
                </div>
              </>
            )}

            {selectedType === "github" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="repository">Repository</Label>
                  <Input
                    id="repository"
                    value={formData.repository}
                    onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
                    placeholder="owner/repo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL (optional)</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    placeholder="https://api.github.com/repos/..."
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Enable immediately</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Connect</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

