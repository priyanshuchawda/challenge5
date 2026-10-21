"use client";

import { useEffect, useRef, useState } from "react";
import { ideasResponseSchema, type EventIdeas, type EventPlan } from "../schema";

export function useEventIdeas() {
  const [ideas, setIdeas] = useState<EventIdeas | null>(null);
  const [refinement, setRefinement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestController = useRef<AbortController | null>(null);

  function reset() {
    requestController.current?.abort();
    requestController.current = null;
    setIdeas(null);
    setRefinement("");
    setError("");
    setIsLoading(false);
  }

  async function requestIdeas(plan: EventPlan, refinementText?: string) {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setIsLoading(true);
    setError("");
    if (!refinementText) setIdeas(null);

    const eventContext = {
      type: plan.request.type,
      date: plan.request.date,
      guests: plan.request.guests,
      budget: plan.request.budget,
      location: plan.request.location,
      priorities: plan.request.priorities,
    };

    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(
          refinementText && ideas
            ? { ...eventContext, refinement: refinementText, currentIdeas: ideas }
            : eventContext,
        ),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "AI ideas are temporarily unavailable.";
        throw new Error(detail);
      }

      const parsed = ideasResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("The AI returned an incomplete response. Your saved plan is unchanged.");
      }
      setIdeas(parsed.data.ideas);
      if (refinementText) setRefinement("");
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "AI ideas are temporarily unavailable.");
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setIsLoading(false);
      }
    }
  }

  useEffect(() => () => requestController.current?.abort(), []);

  return { ideas, refinement, setRefinement, isLoading, error, requestIdeas, reset };
}
