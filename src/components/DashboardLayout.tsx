import { ReactNode, useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Profile } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RecentItemsSidebar } from "@/components/RecentItemsSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
      }
      
      setProfile(profileData || null);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
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

  // Memoize navigation items to prevent recreation on each render
  const navigationItems = useMemo(() => [
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
    { icon: FileText, label: "Reports", path: "/reports" },
  ], []);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <img 
            src={formulaIhuLogo} 
            alt="Formula IHU" 
            className="h-12 object-contain"
            loading="lazy"
          />
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start touch-target text-sm sm:text-base"
              onClick={() => navigate(item.path)}
              data-tour={
                item.path === "/dashboard" ? "dashboard" :
                item.path === "/tasks" ? "tasks" :
                item.path === "/documents" ? "documents" : undefined
              }
            >
              <item.icon className="mr-3 h-4 w-4 sm:h-5 sm:w-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border overflow-y-auto max-h-[200px]">
        <RecentItemsSidebar />
      </div>

      <div className="p-4 border-t border-border">
        {profile && (
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
        )}
        <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
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
            loading="eager"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col">
        <NavContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 border-b border-border bg-card z-50 flex items-center justify-between px-4 shadow-sm">
          <img 
            src={formulaIhuLogo} 
            alt="Formula IHU" 
            className="h-8 sm:h-10 object-contain"
            loading="lazy"
          />
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="touch-target">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-64 sm:w-80 p-0 flex flex-col">
              <NavContent />
            </SheetContent>
          </Sheet>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 md:pt-8 pt-20 pb-20 md:pb-8 safe-top safe-bottom mobile-smooth-scroll">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
