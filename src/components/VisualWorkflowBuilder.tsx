import { useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Play, Plus, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const nodeTypes = {
  start: ({ data }: any) => (
    <div className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg">
      <div className="font-bold">Start</div>
      {data.label && <div className="text-xs mt-1">{data.label}</div>}
    </div>
  ),
  task: ({ data }: any) => (
    <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg min-w-[120px]">
      <div className="font-bold">{data.label || "Task"}</div>
      {data.description && <div className="text-xs mt-1">{data.description}</div>}
    </div>
  ),
  condition: ({ data }: any) => (
    <div className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-lg transform rotate-45 min-w-[100px]">
      <div className="font-bold transform -rotate-45">{data.label || "Condition"}</div>
    </div>
  ),
  end: ({ data }: any) => (
    <div className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg">
      <div className="font-bold">End</div>
      {data.label && <div className="text-xs mt-1">{data.label}</div>}
    </div>
  ),
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "start",
    position: { x: 250, y: 0 },
    data: { label: "Workflow Start" },
  },
];

const initialEdges: Edge[] = [];

export function VisualWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const { toast } = useToast();

  const [nodeFormData, setNodeFormData] = useState({
    label: "",
    description: "",
    type: "task",
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type,
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeFormData({
      label: node.data.label || "",
      description: node.data.description || "",
      type: node.type || "task",
    });
    setDialogOpen(true);
  };

  const handleSaveNode = () => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: nodeFormData.label,
                description: nodeFormData.description,
              },
              type: nodeFormData.type,
            }
          : node
      )
    );
    setDialogOpen(false);
    setSelectedNode(null);
    toast({ title: "Node updated" });
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    toast({ title: "Node deleted" });
  };

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a workflow name",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real implementation, save to workflows table
      const workflowData = {
        name: workflowName,
        nodes,
        edges,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(`workflow_${crypto.randomUUID()}`, JSON.stringify(workflowData));
      toast({ title: "Workflow saved successfully" });
      setWorkflowName("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Workflow Builder</h2>
          <p className="text-muted-foreground">Create and manage automated workflows visually</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Workflow name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-[200px]"
          />
          <Button onClick={handleSaveWorkflow}>
            <Save className="mr-2 h-4 w-4" />
            Save Workflow
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Canvas</CardTitle>
          <CardDescription>Drag nodes to position, connect them to create workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] border rounded-lg relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <Background />
              <MiniMap />
            </ReactFlow>
            <div className="absolute top-4 left-4 bg-background p-2 rounded-lg shadow-lg border z-10">
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNode("start")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Start Node
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNode("task")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Task Node
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNode("condition")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Condition
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNode("end")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  End Node
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>Configure node properties</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="node-type">Node Type</Label>
              <Select
                value={nodeFormData.type}
                onValueChange={(value) => setNodeFormData({ ...nodeFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-label">Label</Label>
              <Input
                id="node-label"
                value={nodeFormData.label}
                onChange={(e) => setNodeFormData({ ...nodeFormData, label: e.target.value })}
                placeholder="Node label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-description">Description</Label>
              <Input
                id="node-description"
                value={nodeFormData.description}
                onChange={(e) => setNodeFormData({ ...nodeFormData, description: e.target.value })}
                placeholder="Node description"
              />
            </div>
            {selectedNode && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteNode(selectedNode.id);
                  setDialogOpen(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Node
              </Button>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNode}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

