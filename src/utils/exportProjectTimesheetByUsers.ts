// import * as XLSX from "xlsx";
// @ts-ignore
import * as XLSX from "xlsx-js-style";

import { saveAs } from "file-saver";
import { format, isValid } from "date-fns";

// This excel is for when we export whole projects where we get all the users and their timesheet for a particular project
interface MonthHours {
  status: string;
  approved_at: string | null;
  approved_by: string | null;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  submitted_at: string | null;
  rejection_reason: string | null;
}

interface TimeSheet {
  id: string;
  user_id: string;
  project_id: string;
  week_number: number;
  year: number;
  month_hours: Record<string, MonthHours>;
}

interface Users {
  id: string;
  full_name: string;
  username: string;
  email: string;
  designation: string;
  hoursUsed: number;
  timeSheetData: TimeSheet[];
}

export const exportProjectTimesheetByUsersToExcel = (
  users: Users[],
  project: any,
  dateRange: { start: string; end: string }
) => {
  const workbook = XLSX.utils.book_new();

  // ===== 1️⃣ Summary Sheet =====
  const summaryData: any[] = [];

  // Project Info
  summaryData.push(["Project Name", project.name]);
  // summaryData.push(["Project ID", project.id]);
  summaryData.push(["Total Allocated Hours", project.allocated_hours + ' hrs']);
  // Date Range
  if (isValid(new Date(dateRange.start)) && isValid(new Date(dateRange.end))) {
    summaryData.push(["Date Range", `${format(new Date(dateRange.start), 'dd-MMM-yy')} to ${format(new Date(dateRange.end), 'dd-MMM-yy')}`]); // show date range
  }
  else {
    summaryData.push(["Date Range", "All Data (Full History)"]); // show all data
  }

  summaryData.push(["Total Users Worked", (users.length + ' users')]);

  // Total hours
  const totalHours = users.reduce((acc, user) => acc + user.hoursUsed, 0);
  summaryData.push(["Total Hours Worked", (totalHours + ' hrs')]);

  summaryData.push([]); // empty row
  summaryData.push(["Name", "Email", "Designation", "Hours Worked"]);

  users.forEach((user) => {
    summaryData.push([
      user.full_name || user.username,
      user.email || "N/A",
      user.designation || "N/A",
      user.hoursUsed + ' hrs',
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);





  // Apply styles to the header row
  // --- 🎨 Apply styles ---
  const range = XLSX.utils.decode_range(summarySheet["!ref"] || "A1");

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = summarySheet[cellRef];
      if (!cell) continue;

      // Bold labels (first column in project info)
      if (R >= 0 && R <= 4 && C === 0) {
        cell.s = { font: { bold: true } };
      }

      // Header row (row index 6, since 0-based)
      if (R === 6) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }



      // Zebra rows (alternating background for readability)
      if (R > 6 && R % 2 === 0 && cell.v && cell.v !== "Weekly Total") {
        cell.s = {
          ...cell.s,
          fill: { fgColor: { rgb: "F2F2F2" } },
        };
      }
    }
  }

  // Freeze header row
  summarySheet["!freeze"] = { xSplit: 0, ySplit: 6 };

  // Auto column width
  const colWidths = new Array(range.e.c + 1).fill(10);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = summarySheet[cellRef];
      if (cell && cell.v) {
        const len = cell.v.toString().length;
        colWidths[C] = Math.max(colWidths[C], len + 2);
      }
    }
  }
  summarySheet["!cols"] = colWidths.map((w) => ({ wch: w }));

  // style done


  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // ===== 2️⃣ Per-user Sheets =====

  users.forEach((user) => {
    const sheetData: any[] = [];

    // Project info
    sheetData.push(["Project Name", project.name]);
    // sheetData.push(["Project ID", project.id]);
    sheetData.push(["Name", user.full_name || user.username]);
    sheetData.push(["Email", user.email || ""]);
    sheetData.push(["Designation", user.designation || ""]);


    sheetData.push(["Total Hours", (user.hoursUsed + ' hrs')]);
    sheetData.push([]); // empty row

    // Headers
    sheetData.push(["Week Number", "Year", "Date", "Day", "Hours", "Month"]);

    const mergedWeeks: { [key: number]: any } = {}; // To store merged week data

    // Populate timesheet rows
    user.timeSheetData.forEach((ts: any) => {
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

        // Detect cross-month
        const mondayDate = new Date(firstDayOfWeek);
        const fridayDate = new Date(firstDayOfWeek);
        fridayDate.setUTCDate(firstDayOfWeek.getUTCDate() + 4);
        const isCrossMonth = mondayDate.getUTCMonth() !== fridayDate.getUTCMonth();

        // Initialize week data if not already initialized
        if (!mergedWeeks[ts.week_number]) {
          mergedWeeks[ts.week_number] = {
            monday: { hours: 0, date: null },
            tuesday: { hours: 0, date: null },
            wednesday: { hours: 0, date: null },
            thursday: { hours: 0, date: null },
            friday: { hours: 0, date: null },
            total: 0,
            //isCrossMonth,
          };
        }

        // Accumulate hours for each day
        weekDays.forEach((wd, idx) => {
          const date = new Date(firstDayOfWeek);
          date.setUTCDate(firstDayOfWeek.getUTCDate() + idx);
          if (dateRange.end == "Data" || (date >= new Date(dateRange.start) && date <= new Date(dateRange.end))) {
            mergedWeeks[ts.week_number][wd.day.toLowerCase()] = {
              hours: mergedWeeks[ts.week_number][wd.day.toLowerCase()].hours + wd.hours,
              date: date.toISOString().split("T")[0], // Store the date
            };
            mergedWeeks[ts.week_number].total += wd.hours;
          }
        });
      });
    });

    // Now, append the merged data to sheetData
    Object.keys(mergedWeeks).forEach((weekNumStr) => {
      const weekNum = parseInt(weekNumStr);
      const weekData = mergedWeeks[weekNum];

      const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      weekDays.forEach((day) => {
        if (weekData[day].date) {
          sheetData.push([
            (weekNum + ''),
            (new Date(weekData[day].date).getUTCFullYear() + ''),
            weekData[day].date,
            ((day.charAt(0).toUpperCase() + day.slice(1)) + ''), // Capitalize first letter of the day
            (weekData[day].hours + ''),
            new Date(weekData[day].date).toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
            //weekData.isCrossMonth ? "Yes" : "", // Mark cross-month weeks
          ]);
        }
      });

      // Weekly total
      sheetData.push(["", "", "", "Weekly Total", weekData.total, "", ""]);

      // Add a separator row for cross-month weeks
      // if (weekData.isCrossMonth) {
      sheetData.push([]); // blank row
      //}
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);


    // Apply styles to the header row
    // --- 🎨 Apply styles ---
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellRef];
        if (!cell) continue;

        // Bold labels (first column in project info)
        if (R >= 0 && R <= 4 && C === 0) {
          cell.s = { font: { bold: true } };
        }

        // Header row (row index 6, since 0-based)
        if (R === 6) {
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };
        }
        // Weekly Total row (column D contains "Weekly Total")
        if (cell.v === "Weekly Total") {
          worksheet[XLSX.utils.encode_cell({ r: R, c: 3 })].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "D9D9D9" } },
          };
          worksheet[XLSX.utils.encode_cell({ r: R, c: 4 })].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "D9D9D9" } },
          };
        }

        // Zebra rows (alternating background for readability)
        if (R > 6 && R % 2 === 0 && cell.v && cell.v !== "Weekly Total") {
          cell.s = {
            ...cell.s,
            fill: { fgColor: { rgb: "F2F2F2" } },
          };
        }
      }
    }

    // Freeze header row
    worksheet["!freeze"] = { xSplit: 0, ySplit: 6 };

    // Auto column width
    const colWidths = new Array(range.e.c + 1).fill(10);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellRef];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          colWidths[C] = Math.max(colWidths[C], len + 2);
        }
      }
    }
    worksheet["!cols"] = colWidths.map((w) => ({ wch: w }));

    // style done

    const safeSheetName = (user.full_name || user.username)
      .replace(/[:\\\/\?\*\[\]]/g, " ") // replace invalid characters with space
      .substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  });

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  // saveAs(blob, `${project.name}_${dateRange.start}_${dateRange.end}_${new Date().getTime()}.xlsx`);

  saveAs(blob, `${project.name}-${isValid(new Date(dateRange.start)) ? format(new Date(dateRange.start), 'dd-MMM-yy') : dateRange.start} ${isValid(new Date(dateRange.start)) ? 'to ' : ""}${isValid(new Date(dateRange.end)) ? format(new Date(dateRange.end), 'dd-MMM-yy') : dateRange.end} (${format(new Date(), 'ddMMyy:HHmmss')}).xlsx`);

};

// UTC-safe ISO week Monday calculation
function getDateOfISOWeek(week: number, year: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay(); // 0 = Sunday
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - ((dayOfWeek + 6) % 7));
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);
  return targetMonday;
}

