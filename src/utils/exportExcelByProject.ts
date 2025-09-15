import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { format, isValid } from "date-fns";

const exportExcelByProject = (projects: any, dateRange: any) => {
  const workbook = XLSX.utils.book_new();

  // ===== 1️⃣ Summary Sheet =====
  const summaryData: any[][] = [];
  summaryData.push([{ v: "Summary", s: { font: { bold: true, sz: 14 } } }]);

  if (isValid(new Date(dateRange.start)) && isValid(new Date(dateRange.end))) {
    summaryData.push([
      { v: "Date Range", s: { font: { bold: true } } },
      { v: `${format(new Date(dateRange.start), "dd-MMM-yy")} to ${format(new Date(dateRange.end), "dd-MMM-yy")}` }
    ]);
  } else {
    summaryData.push([{ v: "Date Range", s: { font: { bold: true } } }, { v: "All Data (Full History)" }]);
  }

  // Table headers
  summaryData.push([
    { v: "Project Name", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
    { v: "Description", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
    { v: "Allocated Hours", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
    { v: "Status", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
    { v: "Client", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
    { v: "Total Hours Worked", s: { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } } },
  ]);

  Object.keys(projects).forEach((k) => {
    const p = projects[k];
    // Calculate total hours for this project
    let projectTotalHours = 0;
    if (p.allUsers) {
      Object.keys(p.allUsers).forEach((u) => {
        const user = p.allUsers[u];
        user.timeSheetData.forEach((ts: any) => {
          Object.keys(ts.month_hours).forEach((monthKey) => {
            const mh = ts.month_hours[monthKey];
            projectTotalHours += mh.monday_hours + mh.tuesday_hours + mh.wednesday_hours + mh.thursday_hours + mh.friday_hours;
          });
        });
      });
    }

    summaryData.push([
      { v: p.project.name },
      { v: p.project.description || "N/A" },
      { v: p.project.allocated_hours },
      { v: p.project.status },
      { v: p.project.client.name },
      { v: projectTotalHours },
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Auto width
  const colWidths = summaryData[0].map((_, colIndex) => {
    const maxLength = summaryData.reduce((acc, row) => {
      const val = row[colIndex]?.v?.toString() || "";
      return Math.max(acc, val.length);
    }, 10);
    return { wch: maxLength + 2 }; // add padding
  });
  summarySheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // ===== 2️⃣ Project Sheets =====
  Object.keys(projects).forEach((m) => {
    const project = projects[m];
    const sheetData: any[][] = [];
    let totalProjectHours = 0; // Total hours for all users

    // ===== Project Info =====
    const projectInfoStyle = { font: { bold: true } };
    const projectTitleStyle = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: "BDD7EE" } } };

    sheetData.push([
      { v: "Project Name", s: projectTitleStyle },
      { v: project.project.name, s: projectInfoStyle },
    ]);
    sheetData.push([{ v: "Description", s: projectInfoStyle }, { v: project.project.description || "N/A" }]);
    sheetData.push([{ v: "Allocated Hours", s: projectInfoStyle }, { v: project.project.allocated_hours }]);
    sheetData.push([{ v: "Status", s: projectInfoStyle }, { v: project.project.status }]);
    sheetData.push([{ v: "Client", s: projectInfoStyle }, { v: project.project.client.name }]);
    sheetData.push([]); // empty row

    const mergedWeeks: { [key: string]: any } = {};

    if (project.allUsers) {
      Object.keys(project.allUsers).forEach((n) => {
        const userObj = project.allUsers[n];

        // ===== User Header =====
        const userHeaderStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFD966" } } };
        sheetData.push([
          { v: "User Name", s: userHeaderStyle },
          { v: userObj.user.name || userObj.user.username, s: userHeaderStyle },
        ]);
        sheetData.push([
          { v: "Email", s: userHeaderStyle },
          { v: userObj.user.email || "N/A", s: userHeaderStyle },
        ]);

        // ===== Timesheet Headers =====
        const tableHeaderStyle = { font: { bold: true }, fill: { fgColor: { rgb: "BDD7EE" } } };
        sheetData.push([
          { v: "Week Number", s: tableHeaderStyle },
          { v: "Year", s: tableHeaderStyle },
          { v: "Date", s: tableHeaderStyle },
          { v: "Day", s: tableHeaderStyle },
          { v: "Hours", s: tableHeaderStyle },
          { v: "Month", s: tableHeaderStyle },
        ]);

        let rowIndex = sheetData.length; // starting index for alternating rows

        // Populate timesheet rows
        userObj.timeSheetData.forEach((ts: any) => {
          Object.keys(ts.month_hours).forEach((monthKey) => {
            const mh = ts.month_hours[monthKey];
            const weekDays = [
              { day: "Monday", hours: mh.monday_hours },
              { day: "Tuesday", hours: mh.tuesday_hours },
              { day: "Wednesday", hours: mh.wednesday_hours },
              { day: "Thursday", hours: mh.thursday_hours },
              { day: "Friday", hours: mh.friday_hours },
            ];

            const firstDayOfWeek = getDateOfISOWeek(ts.week_number, ts.year);

            if (!mergedWeeks[ts.week_number]) {
              mergedWeeks[ts.week_number] = {
                monday: { hours: 0, date: null },
                tuesday: { hours: 0, date: null },
                wednesday: { hours: 0, date: null },
                thursday: { hours: 0, date: null },
                friday: { hours: 0, date: null },
                total: 0,
              };
            }

            weekDays.forEach((wd, idx) => {
              const date = new Date(firstDayOfWeek);
              date.setUTCDate(firstDayOfWeek.getUTCDate() + idx);
              if (dateRange.end === "Data" || (date >= new Date(dateRange.start) && date <= new Date(dateRange.end))) {
                mergedWeeks[ts.week_number][wd.day.toLowerCase()] = {
                  hours: mergedWeeks[ts.week_number][wd.day.toLowerCase()].hours + wd.hours,
                  date: date.toISOString().split("T")[0],
                };
                mergedWeeks[ts.week_number].total += wd.hours;
                totalProjectHours += wd.hours; // accumulate total hours for this project
              }
            });
          });
        });

        // Append merged data
        Object.keys(mergedWeeks).forEach((weekNumStr) => {
          const weekNum = parseInt(weekNumStr);
          const weekData = mergedWeeks[weekNum];

          ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach((day, idx) => {
            if (weekData[day].date) {
              const isOddRow = (rowIndex + idx) % 2 === 1;
              const rowStyle = isOddRow
                ? { fill: { fgColor: { rgb: "F2F2F2" } } } // light gray
                : {}; // default white

              sheetData.push([
                { v: weekNum, s: rowStyle },
                { v: new Date(weekData[day].date).getUTCFullYear(), s: { ...rowStyle, alignment: { horizontal: "center" } } },
                { v: weekData[day].date, s: rowStyle },
                { v: day.charAt(0).toUpperCase() + day.slice(1), s: rowStyle },
                { v: weekData[day].hours, s: rowStyle },
                { v: new Date(weekData[day].date).toLocaleString("en-US", { month: "long", timeZone: "UTC" }), s: rowStyle },
              ]);
            }
          });
          rowIndex += 5;

          // Weekly total bold
          sheetData.push([
            "",
            "",
            "",
            { v: "Weekly Total", s: { font: { bold: true } } },
            { v: weekData.total, s: { font: { bold: true } } },
            "",
          ]);
          rowIndex++;

          sheetData.push([]); // blank row
          rowIndex++;
        });

        sheetData.push([]); // extra empty row
        rowIndex++;
      });
    }

    // ===== Total Hours Worked for Project =====
    sheetData.push([
      "",
      "",
      "",
      { v: "Total Hours Worked", s: { font: { bold: true } } },
      { v: totalProjectHours, s: { font: { bold: true } } },
      "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto column width, small width for Year column
    const colWidths = sheetData[0]?.map((_, colIndex) => {
      if (colIndex === 1) return { wch: 6 }; // Year column small
      const maxLength = sheetData.reduce((acc, row) => {
        const val = row[colIndex]?.v?.toString() || "";
        return Math.max(acc, val.length);
      }, 10);
      return { wch: maxLength + 2 };
    });
    worksheet["!cols"] = colWidths;

    const safeSheetName = project.project.name.replace(/[:\\\/\?\*\[\]]/g, " ").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  });

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(
    blob,
    `Projects-${isValid(new Date(dateRange.start)) ? format(new Date(dateRange.start), "dd-MMM-yy") : dateRange.start} ${isValid(new Date(dateRange.end)) ? "to " : ""}${isValid(new Date(dateRange.end)) ? format(new Date(dateRange.end), "dd-MMM-yy") : dateRange.end} (${format(new Date(), "ddMMyy:HHmmss")}).xlsx`
  );
};

export default exportExcelByProject;

// UTC-safe ISO week Monday calculation
function getDateOfISOWeek(week: any, year: any) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay();
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - ((dayOfWeek + 6) % 7));
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);
  return targetMonday;
}
