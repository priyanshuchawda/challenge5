import {
  fullPlanResponseSchema,
  type EventPlan,
  type FullPlanResponse,
  type PlanTask,
  type Vendor,
} from "./schema";

type AIPlan = FullPlanResponse["plan"];

export function applyAIPlan(current: EventPlan, proposalInput: AIPlan): EventPlan {
  const proposal = fullPlanResponseSchema.shape.plan.parse(proposalInput);
  const proposedTotal = proposal.budget.reduce((sum, item) => sum + item.amount, 0);
  const allocations = proposal.budget.map((item, index) => {
    const existing = current.budget.find(
      (entry) => entry.category.toLocaleLowerCase() === item.category.toLocaleLowerCase(),
    );
    const scaled =
      proposedTotal > 0
        ? Math.floor((item.amount * current.request.budget) / proposedTotal)
        : index === 0
          ? current.request.budget
          : 0;

    return {
      category: item.category,
      amount: scaled,
      color: item.color ?? existing?.color ?? "#728a67",
      spent: 0,
    };
  });

  const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
  if (allocations[0]) allocations[0].amount += current.request.budget - allocated;

  const spentByCategory = new Map<string, number>();
  for (const expense of current.expenses) {
    const category = expense.category.toLocaleLowerCase();
    spentByCategory.set(category, (spentByCategory.get(category) ?? 0) + expense.amount);
  }
  for (const allocation of allocations) {
    allocation.spent = spentByCategory.get(allocation.category.toLocaleLowerCase()) ?? 0;
  }

  const previousTasksByTitle = new Map(
    current.tasks.map((task) => [task.title.trim().toLocaleLowerCase(), task]),
  );
  const tasks: PlanTask[] = proposal.timeline.map((task, index) => {
    const previous = previousTasksByTitle.get(task.title.trim().toLocaleLowerCase());
    return {
      ...task,
      id: previous?.id ?? `${current.id}-ai-${index}-${crypto.randomUUID()}`,
      completed: previous?.completed ?? false,
    };
  });
  const retainedCompletedTasks = current.tasks.filter(
    (task) => task.completed && !tasks.some((candidate) => candidate.id === task.id),
  );

  const vendors: Vendor[] = proposal.vendors.map((vendor, index) => {
    const previous = current.vendors.find(
      (item) => item.category.toLocaleLowerCase() === vendor.category.toLocaleLowerCase(),
    );
    return {
      id: previous?.id ?? `${current.id}-ai-vendor-${index}-${crypto.randomUUID()}`,
      name: vendor.lookFor,
      category: vendor.category,
      status: previous?.status ?? "Researching",
      estimatedCost:
        allocations.find(
          (item) => item.category.toLocaleLowerCase() === vendor.category.toLocaleLowerCase(),
        )?.amount ?? 0,
      notes: vendor.questions.join(" · ").slice(0, 300),
    };
  });

  return {
    ...current,
    tasks: [...retainedCompletedTasks, ...tasks],
    budget: allocations,
    vendors,
  };
}
