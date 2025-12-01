import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const steps: Step[] = [
  {
    target: "body",
    content: (
      <div className="text-foreground">
        <h3 className="font-bold mb-2 text-foreground">Welcome to Formula IHU Preparation Hub! 🏎️</h3>
        <p className="text-foreground">This platform helps you manage tasks, documents, projects, and team collaboration.</p>
        <p className="mt-2 text-foreground">We'll show you the key features in the next few steps.</p>
        <div className="mt-3 p-2 bg-muted rounded text-xs text-foreground">
          <p className="font-semibold text-foreground">Quick Stats:</p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-foreground">
            <li>Track tasks and deadlines</li>
            <li>Manage document approvals</li>
            <li>Collaborate with your team</li>
            <li>Monitor project progress</li>
          </ul>
        </div>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content: (
      <div className="text-foreground">
        <h3 className="font-bold mb-2 text-foreground">📊 Dashboard Overview</h3>
        <p className="text-foreground">The dashboard shows task statistics, recent documents, and team activity.</p>
        <div className="mt-2 p-2 bg-muted rounded text-xs text-foreground">
          <p className="font-semibold text-foreground">Key Metrics:</p>
          <ul className="list-disc list-inside mt-1 text-foreground">
            <li>Task completion rate</li>
            <li>Pending document approvals</li>
            <li>Team member activity</li>
            <li>Recent updates</li>
          </ul>
        </div>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="tasks"]',
    content: (
      <div className="text-foreground">
        <h3 className="font-bold mb-2 text-foreground">✅ Task Management</h3>
        <p className="text-foreground">Create tasks, switch between List and Kanban views, track time, and collaborate with comments.</p>
        <div className="mt-2 p-2 bg-muted rounded text-xs text-foreground">
          <p className="font-semibold text-foreground">Features:</p>
          <ul className="list-disc list-inside mt-1 text-foreground">
            <li>Kanban board for visual task management</li>
            <li>Time tracking for productivity</li>
            <li>Comments and @mentions</li>
            <li>Task dependencies</li>
          </ul>
        </div>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="documents"]',
    content: (
      <div className="text-foreground">
        <h3 className="font-bold mb-2 text-foreground">📄 Document Management</h3>
        <p className="text-foreground">Upload documents, preview files, view version history, and collaborate with your team.</p>
        <div className="mt-2 p-2 bg-muted rounded text-xs text-foreground">
          <p className="font-semibold text-foreground">Features:</p>
          <ul className="list-disc list-inside mt-1 text-foreground">
            <li>PDF and image preview</li>
            <li>Version history and restore</li>
            <li>Document comments</li>
            <li>Approval workflows</li>
          </ul>
        </div>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="command-palette"]',
    content: (
      <div className="text-foreground">
        <h3 className="font-bold mb-2 text-foreground">⌨️ Keyboard Shortcuts</h3>
        <p className="text-foreground">Press <kbd className="px-2 py-1 bg-muted rounded text-xs text-foreground border border-border">Ctrl/Cmd + K</kbd> for Command Palette, <kbd className="px-2 py-1 bg-muted rounded text-xs text-foreground border border-border">Ctrl/Cmd + /</kbd> for shortcuts help.</p>
        <div className="mt-2 p-2 bg-muted rounded text-xs text-foreground">
          <p className="font-semibold text-foreground">Quick Actions:</p>
          <ul className="list-disc list-inside mt-1 text-foreground">
            <li><kbd className="px-1 py-0.5 bg-background rounded text-xs text-foreground border border-border">Ctrl+K</kbd> - Command Palette</li>
            <li><kbd className="px-1 py-0.5 bg-background rounded text-xs text-foreground border border-border">Ctrl+/</kbd> - Shortcuts Help</li>
            <li><kbd className="px-1 py-0.5 bg-background rounded text-xs text-foreground border border-border">Ctrl+F</kbd> - Search</li>
          </ul>
        </div>
      </div>
    ),
    placement: "bottom",
  },
];

export function OnboardingFlow() {
  const [run, setRun] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAndOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const onboardingKey = `hasSeenOnboarding_${session.user.id}`;
        const hasSeenOnboarding = localStorage.getItem(onboardingKey);
        if (!hasSeenOnboarding) {
          // Delay to ensure DOM is ready and user is authenticated
          setTimeout(() => setRun(true), 1000);
        }
      }
    };

    checkUserAndOnboarding();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const onboardingKey = `hasSeenOnboarding_${session.user.id}`;
        const hasSeenOnboarding = localStorage.getItem(onboardingKey);
        if (!hasSeenOnboarding) {
          setTimeout(() => setRun(true), 1000);
        }
      } else {
        setUserId(null);
        setRun(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (userId) {
        const onboardingKey = `hasSeenOnboarding_${userId}`;
        localStorage.setItem(onboardingKey, "true");
      }
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--foreground))",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
        },
        tooltipContainer: {
          color: "hsl(var(--foreground))",
        },
        tooltipTitle: {
          color: "hsl(var(--foreground))",
        },
        tooltipContent: {
          color: "hsl(var(--foreground))",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        },
        buttonBack: {
          color: "hsl(var(--foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
      }}
      locale={{
        back: "Previous",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}

