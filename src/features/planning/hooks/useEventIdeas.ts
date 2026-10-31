"use client";

import { useEffect, useRef, useState } from "react";
import { type EventIdeas, type EventPlan } from "../schema";
import { requestEventIdeas } from "../ai-client";

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
      const payload =
        refinementText && ideas
          ? { ...eventContext, refinement: refinementText, currentIdeas: ideas }
          : eventContext;
      const response = await requestEventIdeas(payload, controller.signal);
      setIdeas(response.ideas);
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
