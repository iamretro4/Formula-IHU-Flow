import DashboardLayout from "@/components/DashboardLayout";
import { DashboardWidgets } from "@/components/DashboardWidgets";
import { ProfileLinkCard } from "@/components/ProfileLinkCard";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back! Connect your Discord account and manage your server channels.
          </p>
        </div>

        {/* Profile Link Card - Prominent placement */}
        <ProfileLinkCard />

        {/* Discord Widgets */}
        <DashboardWidgets />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
