"use client";

import React, { useState } from "react";
import { cn } from "@/lib/util";
import InfoIcon from "./InfoIconComponent";
import { useTheme } from "@/context/ThemeContext";

const GridItem = ({
  className,
  children,
  infoContent,
  blurText = "No additional information available.",
}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const { isDarkMode } = useTheme();

  const handleClick = () => {
    setIsBlurred(!isBlurred);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-4 border rounded-xl h-[350px] my-4",
        "transition-all duration-300 ease-in-out",
        "hover:scale-[1.01]",
        "border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/50",
        className
      )}
      onClick={handleClick}
    >
      {infoContent && (
        <div className="absolute top-2 right-2">
          <InfoIcon content={infoContent} />
        </div>
      )}
      {children}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-xl overflow-y-auto",
          "transition-all duration-300 ease-in-out",
          isBlurred
            ? "backdrop-blur-md bg-opacity-90 opacity-100 visible"
            : "backdrop-blur-none bg-transparent opacity-0 invisible",
          isDarkMode ? "bg-[#020617b3]" : "bg-[#f8fafc]"
        )}
      >
        <div
          className={`text-left px-4 py-2 max-w-full ${
            isDarkMode ? "text-white" : "text-black"
          }`}
          dangerouslySetInnerHTML={{ __html: blurText }}
        />
      </div>
    </div>
  );
};

export default GridItem;
