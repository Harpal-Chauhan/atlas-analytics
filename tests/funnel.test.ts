import { describe, expect, it } from "vitest";
import { calculateFunnel } from "../src/lib/funnel";

describe("calculateFunnel", () => {
    it("calculates ordered funnel conversion and drop-off correctly", () => {
        const events = [
            { distinctId: "user-1", eventName: "signup", occurredAt: "2026-01-01T10:00:00Z" },
            { distinctId: "user-1", eventName: "purchase", occurredAt: "2026-01-03T10:00:00Z" },
            { distinctId: "user-1", eventName: "checkout", occurredAt: "2026-01-02T10:00:00Z" },

            { distinctId: "user-2", eventName: "signup", occurredAt: "2026-01-01T11:00:00Z" },
            { distinctId: "user-2", eventName: "checkout", occurredAt: "2026-01-02T11:00:00Z" },

            { distinctId: "user-3", eventName: "signup", occurredAt: "2026-01-01T12:00:00Z" },
            { distinctId: "user-3", eventName: "checkout", occurredAt: "2026-01-02T12:00:00Z" },
            { distinctId: "user-3", eventName: "purchase", occurredAt: "2026-01-03T12:00:00Z" },

            { distinctId: "user-4", eventName: "purchase", occurredAt: "2026-01-02T13:00:00Z" },
        ];

        const result = calculateFunnel(events, [
            "signup",
            "checkout",
            "purchase",
        ]);

        expect(result.totalUsers).toBe(3);

        expect(result.steps).toEqual([
            {
                eventName: "signup",
                reachedUsers: 3,
                conversionRate: 100,
                dropOff: 0,
            },
            {
                eventName: "checkout",
                reachedUsers: 3,
                conversionRate: 100,
                dropOff: 0,
            },
            {
                eventName: "purchase",
                reachedUsers: 2,
                conversionRate: (2 / 3) * 100,
                dropOff: 1,
            },
        ]);
    });

    it("does not count events outside the conversion window", () => {
        const events = [
            {
                distinctId: "user-1",
                eventName: "signup",
                occurredAt: "2026-01-01T10:00:00Z",
            },
            {
                distinctId: "user-1",
                eventName: "purchase",
                occurredAt: "2026-01-09T10:00:00Z",
            },
        ];

        const result = calculateFunnel(events, ["signup", "purchase"], 7);

        expect(result.steps[1]?.reachedUsers).toBe(0);
    });

    it("requires each step to happen after the previous step", () => {
        const events = [
            {
                distinctId: "user-1",
                eventName: "checkout",
                occurredAt: "2026-01-01T09:00:00Z",
            },
            {
                distinctId: "user-1",
                eventName: "signup",
                occurredAt: "2026-01-01T10:00:00Z",
            },
        ];

        const result = calculateFunnel(events, ["signup", "checkout"]);

        expect(result.steps[1]?.reachedUsers).toBe(0);
    });

    it("rejects funnels with fewer than 2 or more than 6 steps", () => {
        expect(() => calculateFunnel([], ["signup"])).toThrow();
        expect(() =>
            calculateFunnel([], [
                "a",
                "b",
                "c",
                "d",
                "e",
                "f",
                "g",
            ]),
        ).toThrow();
    });

    it("rejects duplicate funnel steps", () => {
        expect(() =>
            calculateFunnel([], ["signup", "signup"]),
        ).toThrow();
    });
});