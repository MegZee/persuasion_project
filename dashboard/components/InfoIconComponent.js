"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

const InfoIcon = ({ content }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <Info
        className="h-5 w-5 text-gray-400 hover:text-gray-300 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {isHovered && (
        <div className="absolute z-10 w-64 p-2 mt-2 text-white bg-gray-800 rounded-lg shadow-white -right-2 top-full">
          {content}
        </div>
      )}
    </div>
  );
};

export default InfoIcon;
