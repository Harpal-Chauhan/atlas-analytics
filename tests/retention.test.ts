
import { describe, expect, it } from "vitest";
import { buildRetentionCohorts } from "../src/lib/retention";

describe("buildRetentionCohorts", () => {
  it("calculates weekly retention using cohort size", () => {
    const rows = [
      {
        cohortWeek: "2026-01-05",
        weekNumber: 0,
        cohortSize: BigInt(10),
        activeUsers: BigInt(10),
      },
      {
        cohortWeek: "2026-01-05",
        weekNumber: 1,
        cohortSize: BigInt(10),
        activeUsers: BigInt(6),
      },
      {
        cohortWeek: "2026-01-05",
        weekNumber: 2,
        cohortSize: BigInt(10),
        activeUsers: BigInt(3),
      },
      {
        cohortWeek: "2026-01-12",
        weekNumber: 0,
        cohortSize: BigInt(4),
        activeUsers: BigInt(4),
      },
      {
        cohortWeek: "2026-01-12",
        weekNumber: 1,
        cohortSize: BigInt(4),
        activeUsers: BigInt(2),
      },
    ];

    const result = buildRetentionCohorts(rows);

    expect(result).toEqual([
      {
        cohortWeek: "2026-01-05",
        cohortSize: 10,
        weeks: [
          { weekNumber: 0, activeUsers: 10, retentionRate: 100 },
          { weekNumber: 1, activeUsers: 6, retentionRate: 60 },
          { weekNumber: 2, activeUsers: 3, retentionRate: 30 },
        ],
      },
      {
        cohortWeek: "2026-01-12",
        cohortSize: 4,
        weeks: [
          { weekNumber: 0, activeUsers: 4, retentionRate: 100 },
          { weekNumber: 1, activeUsers: 2, retentionRate: 50 },
        ],
      },
    ]);
  });

  it("returns zero retention when cohort size is zero", () => {
    const result = buildRetentionCohorts([
      {
        cohortWeek: "2026-02-02",
        weekNumber: 0,
        cohortSize: BigInt(0),
        activeUsers: BigInt(0),
      },
    ]);

    expect(result[0]?.weeks[0]?.retentionRate).toBe(0);
  });

  it("returns an empty array when there are no rows", () => {
    expect(buildRetentionCohorts([])).toEqual([]);
  });
});
