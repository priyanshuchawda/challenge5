"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addExpense,
  addTask,
  completedTaskCount,
  createPlan,
  remainingBudget,
  totalSpent,
  updateRunOfShowItem,
  updateVendor,
} from "../planner";
import { applyAIPlan } from "../apply-ai-plan";
import { createDemoPlan } from "../demo-plan";
import {
  getPlansSnapshot,
  getServerPlansSnapshot,
  readPlans,
  savePlans,
  subscribeToPlans,
} from "../plan-store";
import type { EventPlan, EventRequest, Expense, RunOfShowItem, TaskDraft, Vendor } from "../schema";

type ShowNotice = (message: string) => void;

export function usePlannerWorkspace(showNotice: ShowNotice) {
  const snapshot = useSyncExternalStore(subscribeToPlans, getPlansSnapshot, getServerPlansSnapshot);
  const storedPlans = readPlans(snapshot);
  const demoPlan = useMemo(() => createDemoPlan(), []);
  const plans = storedPlans.length > 0 ? storedPlans : [demoPlan];
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePlan = plans.find((plan) => plan.id === activeId) ?? plans[0] ?? demoPlan;

  function saveActivePlan(update: (plan: EventPlan) => EventPlan) {
    savePlans(plans.map((plan) => (plan.id === activePlan.id ? update(plan) : plan)));
  }

  function selectPlan(planId: string) {
    setActiveId(planId);
  }

  function createEvent(request: EventRequest) {
    const plan = createPlan(request);
    savePlans([plan, ...plans.filter((item) => item.id !== demoPlan.id)]);
    setActiveId(plan.id);
    return plan;
  }

  function toggleTask(taskId: string) {
    saveActivePlan((plan) => ({
      ...plan,
      tasks: plan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    }));
  }

  function changeVendorStatus(vendorId: string, status: Vendor["status"]) {
    saveActivePlan((plan) => updateVendor(plan, vendorId, { status }));
  }

  function changeScheduleItem(
    itemId: string,
    field: keyof Omit<RunOfShowItem, "id">,
    value: string,
  ) {
    try {
      saveActivePlan((plan) => updateRunOfShowItem(plan, itemId, { [field]: value }));
    } catch {
      showNotice("That schedule change is invalid. Check the time and text length.");
    }
  }

  function addExpenseToActivePlan(input: Omit<Expense, "id">) {
    saveActivePlan((plan) => addExpense(plan, input));
  }

  function addTaskToActivePlan(input: TaskDraft) {
    saveActivePlan((plan) => addTask(plan, input));
  }

  function applyPlanProposal(proposal: Parameters<typeof applyAIPlan>[1]) {
    saveActivePlan((plan) => applyAIPlan(plan, proposal));
  }

  return {
    plans,
    activePlan,
    activePlanStats: {
      completed: completedTaskCount(activePlan.tasks),
      spent: totalSpent(activePlan.expenses),
      remaining: remainingBudget(activePlan.request.budget, activePlan.expenses),
    },
    selectPlan,
    createEvent,
    toggleTask,
    changeVendorStatus,
    changeScheduleItem,
    addExpenseToActivePlan,
    addTaskToActivePlan,
    applyPlanProposal,
  };
}
