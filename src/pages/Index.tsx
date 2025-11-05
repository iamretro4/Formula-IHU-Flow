import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Gauge, 
  CheckSquare, 
  FileText, 
  Users, 
  BarChart3, 
  Shield, 
  Zap,
  ArrowRight
} from "lucide-react";
import heroImage from "@/assets/hero-racing.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: CheckSquare,
      title: "Advanced Task Management",
      description: "Multi-level Gantt charts, automated assignments, and real-time progress tracking aligned with Formula IHU deadlines.",
    },
    {
      icon: FileText,
      title: "Document & Compliance Hub",
      description: "Version-controlled repository with automated deadline alerts for all mandatory Formula IHU submission requirements.",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Hierarchical permissions from Team Leaders to Members, with skill-based task recommendations and certifications tracking.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Intelligence",
      description: "Customizable dashboards tracking team readiness, document status, budget health, and compliance metrics.",
    },
    {
      icon: Shield,
      title: "Risk & Safety Management",
      description: "Comprehensive risk register, safety protocols, and incident reporting for preparation activities.",
    },
    {
      icon: Zap,
      title: "Real-Time Collaboration",
      description: "Department-specific channels, automated notifications, and integrated video conferencing for seamless coordination.",
    },
  ];

  const roles = [
    { title: "Team Leader", description: "Global administrator with end-to-end oversight" },
    { title: "Department Directors", description: "Electrical, Mechanical, Operations governance" },
    { title: "Sub-team Chiefs", description: "Tactical leadership and coordination" },
    { title: "Team Members", description: "Role-based access and execution" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-racing rounded-lg flex items-center justify-center">
              <Gauge className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Formula IHU</h1>
              <p className="text-xs text-muted-foreground">Team Management Platform</p>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Access Platform
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background z-0" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <span className="text-sm font-medium text-primary">Formula Student Competition</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Transform Your Team
                <span className="block bg-gradient-racing bg-clip-text text-transparent">
                  Preparation Process
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                A comprehensive platform designed to optimize pre-competition coordination, 
                compliance, and readiness for Formula IHU teams. From task management to 
                document submission, all in one intelligent ecosystem.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="shadow-racing">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-racing opacity-20 blur-3xl rounded-full" />
              <img
                src={heroImage}
                alt="Formula Student Racing Car"
                className="rounded-xl shadow-racing relative z-10 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Everything Your Team Needs
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Formula Student teams competing in Formula IHU, 
              with features that address every aspect of pre-competition preparation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-racing rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Organizational Structure */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Hierarchical Role Management
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reflecting the unique structure of Formula IHU teams with role-based 
              permissions and responsibilities.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {roles.map((role, index) => (
              <Card key={index} className="shadow-card text-center">
                <CardHeader>
                  <div className="h-16 w-16 bg-gradient-tech rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold">
              Ready to Elevate Your Team's Performance?
            </h3>
            <p className="text-lg text-muted-foreground">
              Join leading Formula Student teams using our platform to achieve 
              competitive excellence through data-driven coordination.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-racing">
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-racing rounded-lg flex items-center justify-center">
                <Gauge className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Formula IHU Management</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Formula IHU Team Platform. Built for excellence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
