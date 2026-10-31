import type { SyntheticEvent } from "react";
import type { EventPlan, TaskDraft } from "@/features/planning/schema";
import { EventFormDialog, type NewEventForm } from "@/features/planning/components/EventFormDialog";
import { ExpenseDialog } from "@/features/planning/components/ExpenseDialog";
import { TaskDialog } from "@/features/planning/components/TaskDialog";

interface WorkspaceDialogsProps {
  eventOpen: boolean;
  eventForm: NewEventForm;
  eventError: string;
  expenseOpen: boolean;
  expensePlan: EventPlan;
  expenseCategory: string;
  expenseDescription: string;
  expenseAmount: string;
  taskOpen: boolean;
  taskDraft: TaskDraft;
  onEventFormChange: (field: keyof NewEventForm, value: string) => void;
  onEventClose: () => void;
  onEventSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onExpenseCategoryChange: (value: string) => void;
  onExpenseDescriptionChange: (value: string) => void;
  onExpenseAmountChange: (value: string) => void;
  onExpenseClose: () => void;
  onExpenseSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onTaskChange: (field: keyof TaskDraft, value: string) => void;
  onTaskClose: () => void;
  onTaskSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}

export function WorkspaceDialogs({
  eventOpen,
  eventForm,
  eventError,
  expenseOpen,
  expensePlan,
  expenseCategory,
  expenseDescription,
  expenseAmount,
  taskOpen,
  taskDraft,
  onEventFormChange,
  onEventClose,
  onEventSubmit,
  onExpenseCategoryChange,
  onExpenseDescriptionChange,
  onExpenseAmountChange,
  onExpenseClose,
  onExpenseSubmit,
  onTaskChange,
  onTaskClose,
  onTaskSubmit,
}: WorkspaceDialogsProps) {
  return (
    <>
      {eventOpen && (
        <EventFormDialog
          form={eventForm}
          error={eventError}
          onChange={onEventFormChange}
          onClose={onEventClose}
          onSubmit={onEventSubmit}
        />
      )}
      {expenseOpen && (
        <ExpenseDialog
          plan={expensePlan}
          category={expenseCategory}
          description={expenseDescription}
          amount={expenseAmount}
          onCategoryChange={onExpenseCategoryChange}
          onDescriptionChange={onExpenseDescriptionChange}
          onAmountChange={onExpenseAmountChange}
          onClose={onExpenseClose}
          onSubmit={onExpenseSubmit}
        />
      )}
      {taskOpen && (
        <TaskDialog
          task={taskDraft}
          onChange={onTaskChange}
          onClose={onTaskClose}
          onSubmit={onTaskSubmit}
        />
      )}
    </>
  );
}
