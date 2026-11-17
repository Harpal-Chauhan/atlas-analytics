export const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value);

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

export const createCsvRow = (values: unknown[]): string => {
    return values.map(escapeCsvValue).join(",") + "\r\n";
};
