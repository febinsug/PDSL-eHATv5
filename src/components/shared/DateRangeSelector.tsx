import React, { useState } from "react";
import { DateRangePicker } from "react-date-range";
import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface DateRangeSelectorProps {
  onDateChange: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  onDateChange,
  onClose,
}) => {
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const handleApply = () => {
    const start = format(range[0].startDate, "yyyy-MM-dd");
    const end = format(range[0].endDate, "yyyy-MM-dd");
    onDateChange(start, end);
    onClose();
  };

  return (
    <div className="absolute mt-2 bg-white shadow-lg p-2 rounded z-50">
      <DateRangePicker
        ranges={range}
        onChange={(item:any) => setRange([item.selection])}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleApply}
          className="flex-1 bg-green-500 text-white py-2 rounded"
        >
          Apply
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 text-black py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DateRangeSelector;
