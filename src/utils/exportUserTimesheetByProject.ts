// // // excelExporter.ts
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

// interface MonthHours {
//   status: string;
//   approved_at: string | null;
//   approved_by: string | null;
//   monday_hours: number;
//   tuesday_hours: number;
//   wednesday_hours: number;
//   thursday_hours: number;
//   friday_hours: number;
//   submitted_at: string | null;
//   rejection_reason: string | null;
// }

// interface TimeSheet {
//   id: string;
//   user_id: string;
//   project_id: string;
//   week_number: number;
//   year: number;
//   month_hours: Record<string, MonthHours>;
// }

// interface Project {
//   id: string;
//   name: string;
//   allocated_hours: number;
//   total_hours: number;
//   timeSheetForProject: TimeSheet[];
// }

// export const exportProjectsToExcel = (
//   projects: Project[],
//   username: string,
//   dateRange: { start: string; end: string }
// ) => {
//   const workbook = XLSX.utils.book_new();

//   projects.forEach((project) => {
//     const sheetData: any[] = [];

//     // Project info
//     sheetData.push(["Project ID", project.id]);
//     sheetData.push(["Project Name", project.name]);
//     sheetData.push(["Total Hours", project.total_hours]);
//     sheetData.push([]); // empty row

//     // Headers
//     sheetData.push(["Week Number", "Year", "Date", "Day", "Hours", "Month", "Cross-Month"]);

//     // Populate timesheet rows
//     project.timeSheetForProject.forEach((ts) => {
//       Object.keys(ts.month_hours).forEach((monthKey) => {
//         const mh = ts.month_hours[monthKey];

//         const weekDays = [
//           { day: "Monday", hours: mh.monday_hours },
//           { day: "Tuesday", hours: mh.tuesday_hours },
//           { day: "Wednesday", hours: mh.wednesday_hours },
//           { day: "Thursday", hours: mh.thursday_hours },
//           { day: "Friday", hours: mh.friday_hours },
//         ];

//         const firstDayOfWeek = getDateOfISOWeek(ts.week_number, ts.year);

//         // Detect cross-month
//         const mondayDate = new Date(firstDayOfWeek);
//         const fridayDate = new Date(firstDayOfWeek);
//         fridayDate.setUTCDate(firstDayOfWeek.getUTCDate() + 4);
//         const isCrossMonth = mondayDate.getUTCMonth() !== fridayDate.getUTCMonth();

//         weekDays.forEach((wd, idx) => {
//           const date = new Date(firstDayOfWeek);
//           date.setUTCDate(firstDayOfWeek.getUTCDate() + idx);
//           if (dateRange.end == "" || (date >= new Date(dateRange.start) && date <= new Date(dateRange.end))) {
//             sheetData.push([
//               ts.week_number,
//               date.getUTCFullYear(),
//               date.toISOString().split("T")[0],
//               wd.day,
//               wd.hours,
//               date.toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
//               isCrossMonth ? "Yes" : "", // mark cross-month weeks
//             ]);
//           }
//         });

//         // Weekly total
//         const totalWeekHours = weekDays.reduce((acc, w) => acc + w.hours, 0);
//         sheetData.push(["", "", "", "Weekly Total", totalWeekHours, "", ""]);

//         // Add a separator row for cross-month weeks
//         if (isCrossMonth) {
//           sheetData.push([]); // blank row
//         }
//       });
//     });

//     const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
//     XLSX.utils.book_append_sheet(workbook, worksheet, project.name.substring(0, 31));
//   });

//   const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//   const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
//   saveAs(blob, `${username}_${dateRange.start}_${dateRange.end}.xlsx`);
// };

// // UTC-safe ISO week Monday calculation
// function getDateOfISOWeek(week: number, year: number) {
//   const jan4 = new Date(Date.UTC(year, 0, 4));
//   const dayOfWeek = jan4.getUTCDay(); // 0 = Sunday
//   const mondayOfWeek1 = new Date(jan4);
//   mondayOfWeek1.setUTCDate(jan4.getUTCDate() - ((dayOfWeek + 6) % 7));
//   const targetMonday = new Date(mondayOfWeek1);
//   targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);
//   return targetMonday;
// }



import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

interface Project {
  id: string;
  name: string;
  allocated_hours: number;
  total_hours: number;
  timeSheetForProject: TimeSheet[];
}

export const exportProjectsToExcel = (
  projects: Project[],
  username: string,
  dateRange: { start: string; end: string }
) => {
  const workbook = XLSX.utils.book_new();

  projects.forEach((project) => {
    const sheetData: any[] = [];

    // Project info
    sheetData.push(["Project ID", project.id]);
    sheetData.push(["Project Name", project.name]);
    sheetData.push(["Total Hours", project.total_hours]);
    sheetData.push([]); // empty row

    // Headers
    sheetData.push(["Week Number", "Year", "Date", "Day", "Hours", "Month"]);

    const mergedWeeks: { [key: number]: any } = {}; // To store merged week data

    // Populate timesheet rows
    project.timeSheetForProject.forEach((ts) => {
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
            weekNum,
            new Date(weekData[day].date).getUTCFullYear(),
            weekData[day].date,
            day.charAt(0).toUpperCase() + day.slice(1), // Capitalize first letter of the day
            weekData[day].hours,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, project.name.substring(0, 31));
  });

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `${username}_${dateRange.start}_${dateRange.end}.xlsx`);
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

