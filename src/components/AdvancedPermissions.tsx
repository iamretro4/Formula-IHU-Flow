import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, UserCheck, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Permission = {
  id: string;
  name: string;
  resource_type: string;
  action: string;
  description: string | null;
};

type RolePermission = {
  role: string;
  permission_id: string;
  permission: Permission;
};

export function AdvancedPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data: perms, error: permsError } = await supabase
        .from("permissions")
        .select("*")
        .order("resource_type, action");

      if (permsError) throw permsError;
      setPermissions(perms || []);

      const { data: rolePerms, error: rolePermsError } = await supabase
        .from("role_permissions")
        .select("role, permission_id, permissions(*)");

      if (rolePermsError) throw rolePermsError;

      const grouped: Record<string, string[]> = {};
      (rolePerms || []).forEach((rp: any) => {
        if (!grouped[rp.role]) {
          grouped[rp.role] = [];
        }
        grouped[rp.role].push(rp.permission_id);
      });
      setRolePermissions(grouped);
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

  const togglePermission = async (permissionId: string) => {
    try {
      const current = rolePermissions[selectedRole] || [];
      const hasPermission = current.includes(permissionId);

      if (hasPermission) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", selectedRole)
          .eq("permission_id", permissionId);

        if (error) throw error;
        setRolePermissions({
          ...rolePermissions,
          [selectedRole]: current.filter((id) => id !== permissionId),
        });
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .insert([{ role: selectedRole, permission_id: permissionId }]);

        if (error) throw error;
        setRolePermissions({
          ...rolePermissions,
          [selectedRole]: [...current, permissionId],
        });
      }

      toast({ title: "Permission updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource_type]) {
      acc[perm.resource_type] = [];
    }
    acc[perm.resource_type].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Advanced Permissions
        </h2>
        <p className="text-muted-foreground">Manage role-based and resource-level permissions</p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role-Based Permissions</CardTitle>
                  <CardDescription>
                    Configure permissions for each role
                  </CardDescription>
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="chief">Chief</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([resourceType, perms]) => (
                  <div key={resourceType} className="space-y-2">
                    <h3 className="font-semibold text-lg capitalize">{resourceType}</h3>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {perms.map((permission) => {
                        const hasPermission = (rolePermissions[selectedRole] || []).includes(permission.id);
                        return (
                          <div
                            key={permission.id}
                            className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={hasPermission}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <Label
                              htmlFor={permission.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">{permission.action}</div>
                              {permission.description && (
                                <div className="text-xs text-muted-foreground">
                                  {permission.description}
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Specific Permissions</CardTitle>
              <CardDescription>
                Grant or revoke permissions for individual users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">User permissions management</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a user to manage their custom permissions
                </p>
                <Button variant="outline">Select User</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

