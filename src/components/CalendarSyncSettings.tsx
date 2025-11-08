import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { useCalendarConnection, useInitiateGoogleCalendar, useDisconnectCalendar } from "@/hooks/useCalendarConnection";
import { useSyncCalendarToGoogle, useSyncCalendarFromGoogle } from "@/hooks/useCalendarSync";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CalendarSyncSettings() {
  const { data: connection, isLoading } = useCalendarConnection();
  const initiateMutation = useInitiateGoogleCalendar();
  const disconnectMutation = useDisconnectCalendar();
  const syncToGoogleMutation = useSyncCalendarToGoogle();
  const syncFromGoogleMutation = useSyncCalendarFromGoogle();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Sync</CardTitle>
          <CardDescription>Loading connection status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Sync</CardTitle>
          <CardDescription>
            Connect your Google Calendar to sync tasks, milestones, and deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => initiateMutation.mutate()}
            disabled={initiateMutation.isPending}
            className="w-full"
          >
            {initiateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Google Calendar Sync</CardTitle>
            <CardDescription>
              Connected to {connection.calendar_name || "Google Calendar"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last synced:</span>
            <span className="font-medium">
              {connection.last_sync_at
                ? formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })
                : "Never"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Calendar:</span>
            <span className="font-medium">{connection.calendar_name || "Primary"}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncToGoogleMutation.mutate([])}
            disabled={syncToGoogleMutation.isPending || syncFromGoogleMutation.isPending}
            className="flex-1"
          >
            {syncToGoogleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync to Google
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => syncFromGoogleMutation.mutate()}
            disabled={syncToGoogleMutation.isPending || syncFromGoogleMutation.isPending}
            className="flex-1"
          >
            {syncFromGoogleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync from Google
              </>
            )}
          </Button>
        </div>

        <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect Calendar
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop syncing events between your app and Google Calendar. You can reconnect at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  disconnectMutation.mutate();
                  setDisconnectDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

