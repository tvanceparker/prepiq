export function getLastNDates(n = 3) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - n);
    const format = (d) => d.toISOString().split("T")[0];
    return [format(start), format(end)];
}
