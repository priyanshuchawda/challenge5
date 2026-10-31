"use client";

import { useState, type SyntheticEvent } from "react";
import {
  eventRequestSchema,
  taskDraftSchema,
  type EventPlan,
  type EventRequest,
  type Expense,
  type TaskDraft,
} from "../schema";
import type { NewEventForm } from "../components/EventFormDialog";

interface WorkspaceFormActions {
  createEvent: (request: EventRequest) => EventPlan;
  addExpenseToActivePlan: (expense: Omit<Expense, "id">) => void;
  addTaskToActivePlan: (task: TaskDraft) => void;
}

interface UseWorkspaceFormsOptions {
  actions: WorkspaceFormActions;
  onNotice: (message: string) => void;
  onEventCreated: () => void;
}

const initialEventForm: NewEventForm = {
  name: "",
  type: "Wedding",
  date: "2027-06-12",
  guests: "80",
  budget: "1200000",
  currency: "INR",
  location: "Pune, India",
  priorities: "Step-free access, Vegetarian menu",
};

function initialTaskDraft(): TaskDraft {
  return {
    title: "",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "Medium",
    category: "Planning",
  };
}

export function useWorkspaceForms({ actions, onNotice, onEventCreated }: UseWorkspaceFormsOptions) {
  const [eventOpen, setEventOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [expenseCategory, setExpenseCategory] = useState("Venue");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(initialTaskDraft);

  function changeEventForm(field: keyof NewEventForm, value: string) {
    setEventForm((current) => ({ ...current, [field]: value }));
  }

  function changeTaskDraft(field: keyof TaskDraft, value: string) {
    setTaskDraft((current) => ({ ...current, [field]: value }));
  }

  function saveExpense(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      actions.addExpenseToActivePlan({
        category: expenseCategory,
        description: expenseDescription,
        amount: Number(expenseAmount),
        date: new Date().toISOString().slice(0, 10),
      });
      setExpenseOpen(false);
      setExpenseDescription("");
      setExpenseAmount("");
      onNotice("Expense added. Budget totals are up to date.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Check the expense details.");
    }
  }

  function saveTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskDraftSchema.safeParse(taskDraft);
    if (!parsed.success) {
      onNotice(parsed.error.issues[0]?.message ?? "Check the task details.");
      return;
    }
    actions.addTaskToActivePlan(parsed.data);
    setTaskOpen(false);
    setTaskDraft(initialTaskDraft());
    onNotice("Task added to your plan.");
  }

  function saveEvent(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = {
      name: eventForm.name,
      type: eventForm.type,
      date: eventForm.date,
      guests: Number(eventForm.guests),
      budget: Number(eventForm.budget),
      currency: eventForm.currency,
      location: eventForm.location,
      priorities: eventForm.priorities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const parsed = eventRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      onNotice(parsed.error.issues[0]?.message ?? "Please check the event details.");
      return;
    }
    actions.createEvent(parsed.data);
    onEventCreated();
    setEventOpen(false);
    onNotice(`${parsed.data.name} is ready to plan.`);
  }

  return {
    eventOpen,
    setEventOpen,
    eventForm,
    changeEventForm,
    saveEvent,
    expenseOpen,
    setExpenseOpen,
    expenseCategory,
    setExpenseCategory,
    expenseDescription,
    setExpenseDescription,
    expenseAmount,
    setExpenseAmount,
    saveExpense,
    taskOpen,
    setTaskOpen,
    taskDraft,
    changeTaskDraft,
    saveTask,
  };
}
