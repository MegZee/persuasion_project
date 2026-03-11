import React, { useState, useEffect } from "react";
import wordTableData from "@/data/wordTablesData.json";
import { useTheme } from "@/context/ThemeContext";

const TableComponent = ({ tableType = "tfidf" }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useTheme();
  
  // Get the correct data based on tableType prop
  const data = wordTableData[tableType];
  
  // Set the display name based on the tableType
  const displayName = tableType === "tfidf" ? "TF-IDF" : "Bi-grams";

  useEffect(() => {
    const randomLoadingTime = Math.floor(Math.random() * (2200 - 1400 + 1) + 1000);
    
    // Simulate loading data for random duration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, randomLoadingTime);
    
    // Clear the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, []);

  if (isLoading)
    return (
      <div className="h-[300px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-black dark:text-white"></span>
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-black"}`}>
        {displayName} Persuasion Analysis
      </h2>
      
      <div className="overflow-x-auto flex-grow">
        <table className="w-full">
          <thead>
            <tr>
              <th className={`py-3 text-center font-semibold ${isDarkMode ? "text-white" : "text-black"}`}></th>
              <th className={`py-3 text-center font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>High Persuasion</th>
              <th className={`py-3 text-center font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Low Persuasion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`py-2 pl-4 pr-2 font-medium ${isDarkMode ? "text-white" : "text-black"}`}>{displayName}</td>
              <td className="py-2 px-2">
                <div className="grid grid-cols-1 gap-y-2">
                  {data.highPersuasion.map((term, index) => (
                    <div key={`high-${index}`} className="text-center text-blue-600 dark:text-blue-400">
                      {term}
                    </div>
                  ))}
                </div>
              </td>
              <td className="py-2 px-2">
                <div className="grid grid-cols-1 gap-y-2">
                  {data.lowPersuasion.map((term, index) => (
                    <div key={`low-${index}`} className="text-center text-gray-600 dark:text-gray-400">
                      {term}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
        <p>Analysis compares linguistic features between high and low persuasion political advertisements.</p>
      </div>
    </div>
  );
};

export default TableComponent;