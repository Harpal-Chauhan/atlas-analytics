
export type RetentionRow = {
    cohortWeek: string;
    weekNumber: number;
    cohortSize: bigint;
    activeUsers: bigint;
};

export type RetentionWeek = {
    weekNumber: number;
    activeUsers: number;
    retentionRate: number;
};

export type RetentionCohort = {
    cohortWeek: string;
    cohortSize: number;
    weeks: RetentionWeek[];
};

export const buildRetentionCohorts = (
    rows: RetentionRow[],
): RetentionCohort[] => {
    const cohortMap = new Map<string, RetentionCohort>();

    for (const row of rows) {
        const cohortSize = Number(row.cohortSize);
        const activeUsers = Number(row.activeUsers);

        if (!cohortMap.has(row.cohortWeek)) {
            cohortMap.set(row.cohortWeek, {
                cohortWeek: row.cohortWeek,
                cohortSize,
                weeks: [],
            });
        }

        const cohort = cohortMap.get(row.cohortWeek);

        if (!cohort) {
            continue;
        }

        cohort.weeks.push({
            weekNumber: row.weekNumber,
            activeUsers,
            retentionRate:
                cohortSize === 0 ? 0 : (activeUsers / cohortSize) * 100,
        });
    }

    return Array.from(cohortMap.values());
};