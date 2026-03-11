import React from "react";
import { legendTextColor } from "@/lib/config";

const CustomLegend = (props) => {
  const { payload } = props;

  return (
    <ul className="flex justify-center gap-3">
      {payload.map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center text-black">
          <span
            className="inline-block w-3 h-3 mr-2"
            style={{ backgroundColor: entry.color }}
          ></span>
          <span style={{ color: legendTextColor }}>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

export default CustomLegend;
