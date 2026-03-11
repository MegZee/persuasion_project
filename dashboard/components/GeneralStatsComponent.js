"use client";

import React, { useMemo } from "react";
import { useDateContext } from "@/context/DateContext";
import { useStaticData } from "@/context/DataContext";
import { computeGeneralStats } from "@/lib/staticCalculations";
import { formatNumber, formatPercentage } from "@/lib/util";

const StatItem = ({ label, value, subValue }) => (
  <div className="flex flex-col items-center justify-center p-2 text-center h-full">
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </h4>
    <div className="flex-grow flex flex-col items-center justify-center">
      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {subValue}
        </p>
      )}
    </div>
  </div>
);

const GeneralStatsComponent = () => {
  const { startDate, endDate } = useDateContext();
  const { data, error, isLoading } = useStaticData();

  const statsResponse = useMemo(() => {
    if (!data) return null;
    return computeGeneralStats(data, startDate, endDate);
  }, [data, startDate, endDate]);

  if (error)
    return (
      <div className="text-red-600 dark:text-red-400">
        Failed to load dataset
      </div>
    );
  if (isLoading || !statsResponse)
    return (
      <div className="h-[300px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-black dark:text-white"></span>
      </div>
    );

  const stats = statsResponse.data;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 h-full -mt-4">
      <StatItem
        label="Total Ads"
        value={stats.total_ads.toLocaleString()}
        subValue={`${formatPercentage(
          stats.proportion_high_persuasive
        )}% highly persuasive`}
      />
      <StatItem
        label="Total Spend"
        value={`$${formatNumber(stats.total_spend)}`}
        subValue={`$${stats.average_spend_per_ad.toFixed(2)} avg/ad`}
      />
      <StatItem
        label="Total Impressions"
        value={formatNumber(stats.total_impressions)}
        subValue={`${formatNumber(stats.average_impressions_per_ad)} avg/ad`}
      />
      <StatItem
        label="Cost per 1K Impressions"
        value={`$${stats.cost_per_thousand_impressions.toFixed(2)}`}
        subValue="&nbsp;"
      />
      <StatItem
        label="Unique Funding Entities"
        value={stats.total_number_of_unique_funding_entities.toLocaleString()}
        subValue="&nbsp;"
      />
      <StatItem
        label="Avg Campaign Duration"
        value={`${stats.avg_campaign_duration.toFixed(1)} days`}
        subValue={`${stats.avg_campaign_duration_high_persuasive.toFixed(
          1
        )} highly persuasive`}
      />
    </div>
  );
};

export default GeneralStatsComponent;
