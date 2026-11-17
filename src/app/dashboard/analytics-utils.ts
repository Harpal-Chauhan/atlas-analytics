export const getDateRange = (
    startDate?: string,
    endDate?: string,
) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const defaultEnd = today.toISOString().slice(0, 10);

    const defaultStartDate = new Date(today);
    defaultStartDate.setUTCDate(defaultStartDate.getUTCDate() - 29);

    const defaultStart = defaultStartDate.toISOString().slice(0, 10);

    const isValidDate = (value?: string) =>
        Boolean(
            value &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
            new Date(`${value}T00:00:00.000Z`)
                .toISOString()
                .slice(0, 10) === value,
        );

    const start = isValidDate(startDate) ? startDate! : defaultStart;
    const end = isValidDate(endDate) ? endDate! : defaultEnd;

    if (start > end || end > defaultEnd) {
        return {
            startDate: new Date(`${defaultStart}T00:00:00.000Z`),
            endDate: new Date(`${defaultEnd}T00:00:00.000Z`),
        };
    }

    const endExclusive = new Date(`${end}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    return {
        startDate: new Date(`${start}T00:00:00.000Z`),
        endDate: endExclusive,
    };
};

export const formatNumber = (value: bigint | number) =>
    Number(value).toLocaleString("en-IN");