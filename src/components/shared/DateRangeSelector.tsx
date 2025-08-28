import { useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { COLORS } from "../../utils/constants";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Props {
    onDateChange: (start: string, end: string) => void;
    onClose: () => void;
    defaultStart?: Date | string;
    defaultEnd?: Date | string;
}

export default function DateRangeSelector({ onDateChange, onClose, defaultStart,
    defaultEnd, }: Props) {
    const [range, setRange] = useState([
        {
            startDate: defaultStart ? new Date(defaultStart) : new Date(),
            endDate: defaultEnd ? new Date(defaultEnd) : new Date(),
            key: "selection",
        },
    ]);

    const handleApply = () => {
        // console.log(range)
        if (range[0] && range[0].startDate && range[0].endDate) {
            onDateChange(format(range[0].startDate, 'yyyy-MM-dd'), format(range[0].endDate, 'yyyy-MM-dd'));
            onClose();
        }else{
            toast.error("Please select a valid date range.");
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white p-4 rounded-lg shadow-lg"
                onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
                <DateRangePicker
                    ranges={range}
                    onChange={(item: any) => setRange([item.selection])}
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-300 text-black py-2 rounded hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        style={{ backgroundColor: COLORS.blue1 }}
                        className={`flex-1 text-white py-2 rounded`}
                    >
                        Apply
                    </button>

                </div>
            </div>
        </div>
    );
}
