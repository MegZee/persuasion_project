"use client";

import React, { useState, useMemo } from "react";
import { useDateContext } from "../context/DateContext";
import { usePartyContext } from "../context/PartyContext";
import DateSelector from "./DateSelectorComp";
import { defaultStartDate, defaultEndDate, parties } from "../lib/config";
import { formatNumber } from "../lib/util";
import PartySelectionComponent from "./PartySelectionComponent";
import { useTheme } from "@/context/ThemeContext";
import { useStaticData } from "@/context/DataContext";
import { computeGeneralStats } from "@/lib/staticCalculations";

import {
  Calendar,
  MousePointer,
  DollarSign,
  Eye,
  BarChart2,
  Percent,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";

const Sidebar = () => {
  const { startDate, endDate, updateStartDate, updateEndDate } =
    useDateContext();
  const { selectedParties, updateSelectedParties } = usePartyContext();
  const { isDarkMode } = useTheme();
  const { data, error, isLoading } = useStaticData();

  const generalStats = useMemo(() => {
    if (!data) return null;
    return computeGeneralStats(data, defaultStartDate, defaultEndDate);
  }, [data]);

  return (
    <div
      className={`w-full sticky top-12 md:h-screen p-5 overflow-y-auto border ${
        isDarkMode
          ? "border-slate-800 bg-slate-900/50"
          : "border-slate-200 bg-white/50"
      }`}
    >
      <div
        className={`mb-6 p-4 rounded-lg shadow-lg ${
          isDarkMode
            ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30"
            : "bg-gradient-to-r from-blue-100 to-purple-100"
        }`}
      >
        <h3
          className={`font-semibold mb-3 flex items-center ${
            isDarkMode ? "text-white" : "text-gray-800"
          }`}
        >
          <Calendar size={18} className="mr-2" />
          Date Range Selection
        </h3>
        <DateSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={updateStartDate}
          onEndDateChange={updateEndDate}
        />
      </div>

      {!isLoading && !error && generalStats && (
        <div
          className={`mb-6 p-4 rounded-lg shadow-lg ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30"
              : "bg-gradient-to-r from-blue-100 to-purple-100"
          }`}
        >
          <h3
            className={`font-semibold mb-3 flex items-center ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            <BarChart2 size={18} className="mr-2" />
            Key Facts
          </h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <TrendingUp size={16} className="mr-2" />
              {formatNumber(generalStats.data.total_ads)} total ads run
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <DollarSign size={16} className="mr-2" />$
              {formatNumber(generalStats.data.total_spend)} total ad spend
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Users size={16} className="mr-2" />
              {formatNumber(
                generalStats.data.total_number_of_unique_funding_entities
              )}{" "}
              unique funding entities
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Eye size={16} className="mr-2" />
              Total Impressions:{" "}
              {formatNumber(generalStats.data.total_impressions)}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Percent size={16} className="mr-2" />
              High Persuasive Ads:{" "}
              {(generalStats.data.proportion_high_persuasive * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      <div
        className={`p-4 backdrop-blur-md rounded-md flex items-start space-x-2 mb-2 ${
          isDarkMode ? "bg-[#020617b3]" : "bg-white/80"
        }`}
      >
        <AlertCircle
          className={`h-5 w-5 mt-0.5 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        />
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Party selection affects only plots surrounded by a{" "}
          <span className="text-[#f7b21a]">yellow</span> border.
        </p>
      </div>
      <PartySelectionComponent
        parties={parties}
        selectedParties={selectedParties}
        updateSelectedParties={updateSelectedParties}
      />

      <div
        className={`mt-6 p-3 rounded-lg ${
          isDarkMode
            ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30"
            : "bg-gradient-to-r from-blue-100 to-purple-100"
        }`}
      >
        <h3
          className={`font-semibold mb-2 flex items-center ${
            isDarkMode ? "text-white" : "text-gray-800"
          }`}
        >
          <MousePointer size={16} className="mr-2" />
          Tip
        </h3>
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Click on the plots to show more detailed information about how the
          data was obtained and processed.
        </p>
      </div>

      {/* <div className="mt-6 text-xs text-gray-400">
        Data last updated: {new Date().toLocaleDateString()}
      </div> */}
    </div>
  );
};

export default Sidebar;
