import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, CheckSquare, FileText, Users, LogOut, Menu, Target, Workflow, DollarSign, MessageSquare, AlertTriangle, GanttChart, Calendar, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import formulaIhuLogo from "@/assets/formula-ihu-logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: FileText, label: "Documents", path: "/documents" },
    { icon: Workflow, label: "Approval Workflows", path: "/approval-workflows" },
    { icon: Target, label: "Projects", path: "/projects" },
    { icon: GanttChart, label: "Gantt Chart", path: "/gantt-chart" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: History, label: "Activity Log", path: "/activity-log" },
    { icon: DollarSign, label: "Budgets", path: "/budgets" },
    { icon: MessageSquare, label: "Communications", path: "/communications" },
    { icon: Users, label: "Team", path: "/team" },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center">
          <img 
            src={formulaIhuLogo} 
            alt="Formula IHU" 
            className="h-12 object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className="w-full justify-start touch-target text-sm sm:text-base"
            onClick={() => navigate(item.path)}
          >
            <item.icon className="mr-3 h-4 w-4 sm:h-5 sm:w-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      {profile && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-2">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role?.replace("_", " ")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src={formulaIhuLogo} 
            alt="Formula IHU" 
            className="h-16 object-contain mx-auto mb-4 animate-pulse"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card">
        <NavContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 border-b border-border bg-card z-50 flex items-center justify-between px-4 shadow-sm">
          <img 
            src={formulaIhuLogo} 
            alt="Formula IHU" 
            className="h-8 sm:h-10 object-contain"
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 sm:w-80 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 md:pt-8 pt-20 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
