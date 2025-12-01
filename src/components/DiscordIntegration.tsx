import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Link2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DiscordIntegration() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUserId, setDiscordUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDiscordStatus();
  }, []);

  const loadDiscordStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_user_id, discord_link_code")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDiscordLinked(!!profile.discord_user_id);
        setDiscordUserId(profile.discord_user_id || null);
      }
    } catch (error) {
      console.error("Error loading Discord status:", error);
    }
  };

  const generateLinkCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to link your Discord account.",
        });
        return;
      }

      // Generate a random 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from("profiles")
        .update({ discord_link_code: code })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setLinkCode(code);
      toast({
        title: "Link code generated",
        description: "Use this code in Discord to link your account.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate link code",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Link code copied!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard",
      });
    }
  };

  const unlinkAccount = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          discord_user_id: null,
          discord_link_code: null 
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setDiscordLinked(false);
      setDiscordUserId(null);
      setLinkCode(null);
      
      toast({
        title: "Account unlinked",
        description: "Your Discord account has been unlinked.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unlink account",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Discord Integration</CardTitle>
          </div>
          {discordLinked && (
            <Badge variant="default" className="bg-green-600">
              Linked
            </Badge>
          )}
        </div>
        <CardDescription>
          Link your Discord account to receive notifications and use slash commands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {discordLinked ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✅ Your Discord account is linked!
              </p>
              {discordUserId && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Discord ID: {discordUserId}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Available Discord Commands</Label>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• <code className="bg-muted px-1 py-0.5 rounded">/addtask</code> - Create a new task</p>
                <p>• <code className="bg-muted px-1 py-0.5 rounded">/listtasks</code> - View your tasks</p>
                <p>• <code className="bg-muted px-1 py-0.5 rounded">/mytasks</code> - View assigned tasks</p>
                <p>• <code className="bg-muted px-1 py-0.5 rounded">/completetask</code> - Mark task as complete</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={unlinkAccount}
              disabled={loading}
              className="w-full"
            >
              Unlink Discord Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">How to link your account:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click "Generate Link Code" below</li>
                <li>Open Discord and use the command: <code className="bg-background px-1 py-0.5 rounded">/linkaccount code:YOUR_CODE</code></li>
                <li>Your accounts will be linked automatically</li>
              </ol>
            </div>

            {linkCode ? (
              <div className="space-y-2">
                <Label>Your Link Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={linkCode}
                    readOnly
                    className="font-mono font-bold text-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(linkCode)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this code in Discord: <code className="bg-muted px-1 py-0.5 rounded">/linkaccount code:{linkCode}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  ⚠️ This code expires after use. Generate a new one if needed.
                </p>
              </div>
            ) : (
              <Button
                onClick={generateLinkCode}
                disabled={loading}
                className="w-full"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Generate Link Code
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

