// Workload and Productivity Calculation Utilities

export type TaskWithDetails = {
  id: string;
  title: string;
  status: string;
  priority: string;
  difficulty?: string;
  due_date: string | null;
  completion_date: string | null;
  assigned_to: string | null;
  project_id: string;
};

export type WorkloadStats = {
  userId: string;
  userName: string;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByStatus: {
    pending: number;
    in_progress: number;
    review: number;
    completed: number;
    blocked: number;
  };
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  tasksByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
    expert: number;
  };
};

export type ProductivityStats = {
  userId: string;
  userName: string;
  productivityScore: number; // 0-100
  onTimeCompletionRate: number; // 0-100
  averageDaysOnTime: number;
  averageDaysOverdue: number;
  totalCompleted: number;
  completedOnTime: number;
  completedOverdue: number;
  weightedScore: number; // Based on priority and difficulty
};

/**
 * Calculate workload statistics for a user
 */
export function calculateWorkload(
  userId: string,
  userName: string,
  tasks: TaskWithDetails[]
): WorkloadStats {
  const userTasks = tasks.filter((t) => t.assigned_to === userId);

  const now = new Date();
  const overdueTasks = userTasks.filter((task) => {
    if (!task.due_date || task.status === "completed") return false;
    return new Date(task.due_date) < now;
  });

  const activeTasks = userTasks.filter(
    (task) => task.status !== "completed"
  );

  const completedTasks = userTasks.filter(
    (task) => task.status === "completed"
  );

  // Count by status
  const tasksByStatus = {
    pending: userTasks.filter((t) => t.status === "pending").length,
    in_progress: userTasks.filter((t) => t.status === "in_progress").length,
    review: userTasks.filter((t) => t.status === "review").length,
    completed: completedTasks.length,
    blocked: userTasks.filter((t) => t.status === "blocked").length,
  };

  // Count by priority
  const tasksByPriority = {
    low: userTasks.filter((t) => t.priority === "low").length,
    medium: userTasks.filter((t) => t.priority === "medium").length,
    high: userTasks.filter((t) => t.priority === "high").length,
    critical: userTasks.filter((t) => t.priority === "critical").length,
  };

  // Count by difficulty
  const tasksByDifficulty = {
    easy: userTasks.filter((t) => t.difficulty === "easy").length,
    medium: userTasks.filter((t) => t.difficulty === "medium" || !t.difficulty).length,
    hard: userTasks.filter((t) => t.difficulty === "hard").length,
    expert: userTasks.filter((t) => t.difficulty === "expert").length,
  };

  return {
    userId,
    userName,
    totalTasks: userTasks.length,
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    tasksByStatus,
    tasksByPriority,
    tasksByDifficulty,
  };
}

/**
 * Calculate productivity statistics for a user
 */
export function calculateProductivity(
  userId: string,
  userName: string,
  tasks: TaskWithDetails[]
): ProductivityStats {
  const userTasks = tasks.filter((t) => t.assigned_to === userId);
  const completedTasks = userTasks.filter((t) => t.status === "completed");

  if (completedTasks.length === 0) {
    return {
      userId,
      userName,
      productivityScore: 0,
      onTimeCompletionRate: 0,
      averageDaysOnTime: 0,
      averageDaysOverdue: 0,
      totalCompleted: 0,
      completedOnTime: 0,
      completedOverdue: 0,
      weightedScore: 0,
    };
  }

  // Calculate on-time vs overdue
  const now = new Date();
  let completedOnTime = 0;
  let completedOverdue = 0;
  let totalDaysOnTime = 0;
  let totalDaysOverdue = 0;

  // Priority weights
  const priorityWeights: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  // Difficulty weights
  const difficultyWeights: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  completedTasks.forEach((task) => {
    if (!task.due_date || !task.completion_date) {
      // No due date or completion date, skip timing calculation
      const weight = priorityWeights[task.priority] || 1;
      const diffWeight = difficultyWeights[task.difficulty || "medium"] || 1;
      totalWeightedScore += weight * diffWeight;
      totalWeight += weight * diffWeight;
      return;
    }

    const dueDate = new Date(task.due_date);
    const completionDate = new Date(task.completion_date);
    const daysDiff = Math.ceil(
      (completionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const weight = priorityWeights[task.priority] || 1;
    const diffWeight = difficultyWeights[task.difficulty || "medium"] || 1;
    const taskWeight = weight * diffWeight;

    if (daysDiff <= 0) {
      // Completed on time or early
      completedOnTime++;
      totalDaysOnTime += Math.abs(daysDiff);
      totalWeightedScore += taskWeight * 1.0; // Full score for on-time
    } else {
      // Completed late
      completedOverdue++;
      totalDaysOverdue += daysDiff;
      // Penalty: reduce score based on how late (max 50% of score)
      const penalty = Math.min(daysDiff / 30, 0.5); // Max 50% penalty after 30 days
      totalWeightedScore += taskWeight * (1.0 - penalty);
    }

    totalWeight += taskWeight;
  });

  const onTimeCompletionRate =
    (completedOnTime / completedTasks.length) * 100;
  const averageDaysOnTime =
    completedOnTime > 0 ? totalDaysOnTime / completedOnTime : 0;
  const averageDaysOverdue =
    completedOverdue > 0 ? totalDaysOverdue / completedOverdue : 0;

  // Productivity score: weighted average (0-100)
  const weightedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;

  // Overall productivity score combines on-time rate and weighted score
  const productivityScore = (onTimeCompletionRate * 0.6 + weightedScore * 0.4);

  return {
    userId,
    userName,
    productivityScore: Math.round(productivityScore),
    onTimeCompletionRate: Math.round(onTimeCompletionRate),
    averageDaysOnTime: Math.round(averageDaysOnTime * 10) / 10,
    averageDaysOverdue: Math.round(averageDaysOverdue * 10) / 10,
    totalCompleted: completedTasks.length,
    completedOnTime,
    completedOverdue,
    weightedScore: Math.round(weightedScore),
  };
}

/**
 * Calculate workload for all users
 */
export function calculateAllWorkloads(
  users: Array<{ id: string; full_name: string }>,
  tasks: TaskWithDetails[]
): WorkloadStats[] {
  return users.map((user) =>
    calculateWorkload(user.id, user.full_name, tasks)
  );
}

/**
 * Calculate productivity for all users
 */
export function calculateAllProductivity(
  users: Array<{ id: string; full_name: string }>,
  tasks: TaskWithDetails[]
): ProductivityStats[] {
  return users.map((user) =>
    calculateProductivity(user.id, user.full_name, tasks)
  );
}

