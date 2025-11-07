import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import BudgetDialog from "@/components/BudgetDialog";
import ExpenseDialog from "@/components/ExpenseDialog";
import PurchaseRequestDialog from "@/components/PurchaseRequestDialog";
import IncomeDialog from "@/components/IncomeDialog";
import ErrorBoundary from "@/components/ErrorBoundary";

type Budget = {
  id: string;
  name: string;
  description: string | null;
  phase: string;
  allocated_amount: number;
  spent_amount: number;
  forecasted_amount: number;
  currency: string;
  project_id: string | null;
  projects: {
    id: string;
    name: string;
  } | null;
};

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  is_approved: boolean;
  budget_id: string | null;
};

type PurchaseRequest = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  status: string;
  requested_by: string | null;
  requested_by_profile: {
    id: string;
    full_name: string;
  } | null;
};

type Income = {
  id: string;
  source: string;
  description: string | null;
  amount: number;
  received_date: string;
  received_from: string | null;
  is_confirmed: boolean;
  project_id: string | null;
  budget_id: string | null;
};

const Budgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [availableFunds, setAvailableFunds] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("budgets");
  const [searchQuery, setSearchQuery] = useState("");
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [purchaseRequestDialogOpen, setPurchaseRequestDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === "budgets") {
        const { data, error } = await supabase
          .from("budgets")
          .select("*, projects(id, name)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBudgets(data || []);
      } else if (activeTab === "expenses") {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false });

        if (error) throw error;
        setExpenses(data || []);
      } else if (activeTab === "income") {
        const { data, error } = await supabase
          .from("income")
          .select("*")
          .eq("is_confirmed", true)
          .order("received_date", { ascending: false });

        if (error) throw error;
        setIncome(data || []);
      } else if (activeTab === "purchase-requests") {
        const { data: requestsData, error: requestsError } = await supabase
          .from("purchase_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (requestsError) throw requestsError;

        // Fetch requester profiles
        const requestsWithProfiles = await Promise.all(
          (requestsData || []).map(async (req: any) => {
            if (req.requested_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("id", req.requested_by)
                .single();
              return { ...req, requested_by_profile: profile };
            }
            return req;
          })
        );

        setPurchaseRequests(requestsWithProfiles);
      }

      // Always calculate totals for available funds display
      const [incomeRes, expensesRes] = await Promise.all([
        supabase
          .from("income")
          .select("amount")
          .eq("is_confirmed", true),
        supabase
          .from("expenses")
          .select("amount")
          .eq("is_approved", true),
      ]);

      const incomeTotal = (incomeRes.data || []).reduce(
        (sum, item) => sum + parseFloat(item.amount.toString()),
        0
      );
      const expensesTotal = (expensesRes.data || []).reduce(
        (sum, item) => sum + parseFloat(item.amount.toString()),
        0
      );

      setTotalIncome(incomeTotal);
      setTotalExpenses(expensesTotal);
      setAvailableFunds(incomeTotal - expensesTotal);
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

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      planning: "Planning",
      design: "Design",
      manufacturing: "Manufacturing",
      testing: "Testing",
      competition: "Competition",
      post_competition: "Post-Competition",
    };
    return labels[phase] || phase;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      materials: "Materials",
      manufacturing: "Manufacturing",
      tools: "Tools",
      software: "Software",
      competition_fees: "Competition Fees",
      travel: "Travel",
      accommodation: "Accommodation",
      food: "Food",
      marketing: "Marketing",
      sponsorship: "Sponsorship",
      other: "Other",
    };
    return labels[category] || category;
  };

  const getIncomeSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      sponsorship: "Sponsorship",
      university_funding: "University Funding",
      competition_prize: "Competition Prize",
      donation: "Donation",
      fundraising: "Fundraising",
      grant: "Grant",
      other: "Other",
    };
    return labels[source] || source;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700",
      approved: "bg-green-500/20 text-green-700",
      rejected: "bg-red-500/20 text-red-700",
      cancelled: "bg-gray-500/20 text-gray-700",
    };
    return colors[status] || colors.pending;
  };

  const calculateSpentPercentage = (budget: Budget) => {
    if (budget.allocated_amount === 0) return 0;
    return Math.min((budget.spent_amount / budget.allocated_amount) * 100, 100);
  };

  const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent_amount), 0);
  const totalForecasted = budgets.reduce((sum, b) => sum + Number(b.forecasted_amount), 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Financial Preparation</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track budgets, expenses, income, and purchase requests
          </p>
        </div>

        {/* Available Funds Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Available Funds</p>
                <p className={`text-3xl font-bold ${availableFunds >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  €{availableFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Total Income: <span className="font-medium text-green-600 dark:text-green-400">€{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Total Expenses: <span className="font-medium text-red-600 dark:text-red-400">€{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </div>
              <Wallet className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalAllocated.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {totalAllocated > 0
                  ? ((totalSpent / totalAllocated) * 100).toFixed(1)
                  : 0}% of allocated
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Forecasted</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalForecasted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Estimated total cost
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="purchase-requests">Purchase Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="budgets" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setBudgetDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Budget
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No budgets yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first budget to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const spentPercentage = calculateSpentPercentage(budget);
                  const remaining = budget.allocated_amount - budget.spent_amount;
                  return (
                    <Card key={budget.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{budget.name}</CardTitle>
                            <CardDescription>
                              {budget.projects?.name || "No project"} • {getPhaseLabel(budget.phase)}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{budget.currency}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Allocated</span>
                            <span className="font-medium">€{budget.allocated_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Spent</span>
                            <span className="font-medium">€{budget.spent_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className={`font-medium ${remaining < 0 ? "text-red-500" : ""}`}>
                              €{remaining.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={spentPercentage} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {spentPercentage.toFixed(1)}% spent
                          </p>
                        </div>
                        {budget.description && (
                          <p className="text-sm text-muted-foreground">{budget.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIncomeDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Record Income
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : income.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No income recorded</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Record your first income source to get started
                  </p>
                  <Button onClick={() => setIncomeDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Income
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {income
                  .filter((item) =>
                    searchQuery
                      ? item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.received_from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.source.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {item.received_from || getIncomeSourceLabel(item.source)}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {getIncomeSourceLabel(item.source)}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                            €{item.amount.toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          {new Date(item.received_date).toLocaleDateString()}
                        </div>
                        {item.is_confirmed ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                            Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                            Pending
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setExpenseDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No expenses yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{expense.description}</CardTitle>
                          <CardDescription>
                            {getCategoryLabel(expense.category)} • {new Date(expense.expense_date).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">€{expense.amount.toLocaleString()}</div>
                          {expense.is_approved ? (
                            <Badge className="bg-green-500/20 text-green-700">Approved</Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-700">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {expense.vendor && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Vendor: {expense.vendor}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchase-requests" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setPurchaseRequestDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Purchase Request
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : purchaseRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No purchase requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchaseRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <CardDescription>
                            {getCategoryLabel(request.category)} • Requested by{" "}
                            {request.requested_by_profile?.full_name || "Unknown"}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">€{request.amount.toLocaleString()}</div>
                          <Badge className={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {request.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ErrorBoundary>
          <BudgetDialog
            open={budgetDialogOpen}
            onOpenChange={setBudgetDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <ExpenseDialog
            open={expenseDialogOpen}
            onOpenChange={setExpenseDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <PurchaseRequestDialog
            open={purchaseRequestDialogOpen}
            onOpenChange={setPurchaseRequestDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <IncomeDialog
            open={incomeDialogOpen}
            onOpenChange={setIncomeDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Budgets;

