export const isDateInSelectedMonth = (inputDate: Date, selectedMonth: any, selectedYear: any) => {
    const date = new Date(inputDate);
    return (
        date.getMonth() + 1 === selectedMonth &&  // getMonth() returns 0-based month
        date.getFullYear() === selectedYear
    );
}

export const getWeekNumber = (d: Date) => {
    const firstJan = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
};

export const getWeekNumberRangeBetweenTwoDates = (start: Date, end: Date) => {
    const result: { startWeek: number; endWeek: number; year: number }[] = [];

    let currentYear = start.getFullYear();
    const endYear = end.getFullYear();

    while (currentYear <= endYear) {
        let startWeek: number;
        let endWeek: number;

        if (currentYear === start.getFullYear()) {
            startWeek = getWeekNumber(start);
        } else {
            startWeek = 1;
        }

        if (currentYear === end.getFullYear()) {
            endWeek = getWeekNumber(end);
        } else {
            // Get last week of the currentYear
            const lastDayOfYear = new Date(currentYear, 11, 31);
            endWeek = getWeekNumber(lastDayOfYear);
        }

        result.push({
            startWeek,
            endWeek,
            year: currentYear
        });

        currentYear++;
    }

    return { dateRangeWeek: result, startDate: start, endDate: end };
};

