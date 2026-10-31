import { allocateBudget } from "./budget";
import type { EventPlan, EventRequest, Expense, PlanTask, RunOfShowItem, Vendor } from "./schema";

function dateOffset(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function createPlan(
  request: EventRequest,
  id = crypto.randomUUID(),
  today = new Date().toISOString().slice(0, 10),
): EventPlan {
  const isWedding = request.type === "Wedding";
  const isCommunity = request.type === "Community event";
  const eventDay = new Date(`${request.date}T12:00:00.000Z`);
  const currentDay = new Date(`${today}T12:00:00.000Z`);
  const daysUntilEvent = Math.max(
    1,
    Math.ceil((eventDay.getTime() - currentDay.getTime()) / 86_400_000),
  );
  const deadline = (share: number) => {
    if (request.date < today) return request.date;
    const suggested = dateOffset(
      request.date,
      Math.min(90, Math.max(1, Math.floor(daysUntilEvent * share))),
    );
    return suggested < today ? today : suggested;
  };
  const suggestions: Omit<PlanTask, "id" | "completed">[] = [
    {
      title: "Confirm venue and accessibility",
      dueDate: deadline(0.8),
      priority: "High",
      category: "Venue",
    },
    {
      title: "Build guest list and send invitations",
      dueDate: deadline(0.64),
      priority: "High",
      category: "Guests",
    },
    {
      title: isCommunity
        ? "Confirm permits and community partners"
        : "Book catering and confirm dietary needs",
      dueDate: deadline(0.48),
      priority: "High",
      category: "Food & drink",
    },
    {
      title: "Choose a theme and source decor",
      dueDate: deadline(0.32),
      priority: "Medium",
      category: "Design",
    },
    {
      title: isWedding
        ? "Confirm ceremony and reception run of show"
        : "Draft the event day schedule",
      dueDate: deadline(0.18),
      priority: "Medium",
      category: "Schedule",
    },
    {
      title: "Check final details with every vendor",
      dueDate: deadline(0.06),
      priority: "Low",
      category: "Vendors",
    },
  ];
  const tasks = suggestions.map((task, index) => ({
    ...task,
    id: `${id}-${index + 1}`,
    completed: false,
  }));
  const budget = allocateBudget(request.budget, request.type, request.priorities);
  const vendors: Vendor[] = [
    {
      id: `${id}-vendor-venue`,
      name: "Venue shortlist",
      category: "Venue",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Venue")?.amount ?? 0,
      notes: "Confirm date, accessibility, capacity, and cancellation terms.",
    },
    {
      id: `${id}-vendor-food`,
      name: "Catering shortlist",
      category: "Food & drink",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Food & drink")?.amount ?? 0,
      notes: "Confirm dietary requirements, service style, and taxes.",
    },
    {
      id: `${id}-vendor-photo`,
      name: "Photography shortlist",
      category: "Photography",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Photography")?.amount ?? 0,
      notes: "Review portfolio, hours, deliverables, and usage rights.",
    },
  ];
  const runOfShow: RunOfShowItem[] = [
    {
      id: `${id}-ros-1`,
      time: "09:00",
      activity: "Venue access and setup check",
      lead: "Event host",
      location: request.location,
      notes: "Confirm accessible routes, restrooms, seating, and vendor arrival points.",
    },
    {
      id: `${id}-ros-2`,
      time: "10:00",
      activity: "Vendor arrival and sound check",
      lead: "Day-of coordinator",
      location: request.location,
      notes: "Check deliveries against the agreed schedule and contact list.",
    },
    {
      id: `${id}-ros-3`,
      time: "11:00",
      activity: "Guest welcome and arrivals",
      lead: "Welcome team",
      location: request.location,
      notes: "Keep the entrance clear and direct guests to seating and amenities.",
    },
    {
      id: `${id}-ros-4`,
      time: "12:00",
      activity: "Meal service and dietary check",
      lead: "Catering lead",
      location: request.location,
      notes: `Confirm the ${request.guests} guest estimate and agreed dietary arrangements.`,
    },
    {
      id: `${id}-ros-5`,
      time: "14:00",
      activity: "Main celebration and shared moment",
      lead: "Event host",
      location: request.location,
      notes: "Leave a short buffer between activities and announce any changes clearly.",
    },
    {
      id: `${id}-ros-6`,
      time: "16:00",
      activity: "Closing, guest departure, and pack-down",
      lead: "Day-of coordinator",
      location: request.location,
      notes: "Check lost property, vendor pickup, and venue handover requirements.",
    },
  ];
  return {
    id,
    request,
    tasks,
    budget,
    expenses: [] as Expense[],
    vendors,
    runOfShow,
    createdAt: new Date().toISOString(),
  };
}
