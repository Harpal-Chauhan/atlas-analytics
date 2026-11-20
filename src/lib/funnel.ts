export type FunnelEvent = {
  distinctId: string;
  eventName: string;
  occurredAt: Date | string;
};

export type FunnelStepResult = {
  eventName: string;
  reachedUsers: number;
  conversionRate: number;
  dropOff: number;
};

export type FunnelResult = {
  totalUsers: number;
  steps: FunnelStepResult[];
};

export const calculateFunnel = (
  events: FunnelEvent[],
  stepNames: string[],
  conversionWindowDays = 7,
): FunnelResult => {
  if (stepNames.length < 2 || stepNames.length > 6) {
    throw new Error("A funnel must contain between 2 and 6 steps.");
  }

  if (new Set(stepNames).size !== stepNames.length) {
    throw new Error("Funnel steps must be unique.");
  }

  if (
    !Number.isInteger(conversionWindowDays) ||
    conversionWindowDays < 1 ||
    conversionWindowDays > 30
  ) {
    throw new Error("Conversion window must be an integer between 1 and 30 days.");
  }

  const eventsByUser = new Map<string, FunnelEvent[]>();

  for (const event of events) {
    const userEvents = eventsByUser.get(event.distinctId) ?? [];
    userEvents.push(event);
    eventsByUser.set(event.distinctId, userEvents);
  }

  const reachedCounts = stepNames.map(() => 0);
  const windowMs = conversionWindowDays * 24 * 60 * 60 * 1000;

  for (const userEvents of eventsByUser.values()) {
    const sortedEvents = [...userEvents].sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() -
        new Date(b.occurredAt).getTime(),
    );

    const firstStepEvent = sortedEvents.find(
      (event) => event.eventName === stepNames[0],
    );

    if (!firstStepEvent) {
      continue;
    }

    const firstStepTime = new Date(firstStepEvent.occurredAt).getTime();
    const deadline = firstStepTime + windowMs;

    reachedCounts[0] = (reachedCounts[0] ?? 0) + 1;

    let previousStepTime = firstStepTime;

    for (let stepIndex = 1; stepIndex < stepNames.length; stepIndex += 1) {
      const nextStepEvent = sortedEvents.find((event) => {
        const eventTime = new Date(event.occurredAt).getTime();

        return (
          event.eventName === stepNames[stepIndex] &&
          eventTime > previousStepTime &&
          eventTime <= deadline
        );
      });

      if (!nextStepEvent) {
        break;
      }

      previousStepTime = new Date(nextStepEvent.occurredAt).getTime();
      reachedCounts[stepIndex] = (reachedCounts[stepIndex] ?? 0) + 1;
    }
  }

  const totalUsers = reachedCounts[0] ?? 0;

  const results = stepNames.map((eventName, index) => {
    const previousCount =
      index === 0 ? totalUsers : (reachedCounts[index - 1] ?? 0);

    const reachedUsers = reachedCounts[index] ?? 0;

    return {
      eventName,
      reachedUsers,
      conversionRate:
        previousCount === 0 ? 0 : (reachedUsers / previousCount) * 100,
      dropOff: previousCount - reachedUsers,
    };
  });

  return {
    totalUsers,
    steps: results,
  };
};