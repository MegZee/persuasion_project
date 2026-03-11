"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { useDateContext } from "../../context/DateContext";
import { chartColors } from "@/lib/config.js";
import { formatDate, formatNumber } from "@/lib/util.js";
import { useMemo, useState } from "react";
import { PartySelector } from "../ui/partySelector";
import { useTheme } from "@/context/ThemeContext";
import { useStaticData } from "@/context/DataContext";
import { getTimeSeriesForParty } from "@/lib/staticCalculations";

const LineChartComponent = () => {
  const { startDate, endDate } = useDateContext();
  const [party1, setParty1] = useState("Labor");
  const [party2, setParty2] = useState("Liberal");
  const { isDarkMode } = useTheme();
  const { data, error, isLoading } = useStaticData();

  const [series1, series2] = useMemo(() => {
    if (!data) return [null, null];
    const partySeries1 = getTimeSeriesForParty(data, party1);
    const partySeries2 = getTimeSeriesForParty(data, party2);
    const filterByDate = (series) =>
      series.filter(
        (entry) => entry.date >= startDate && entry.date <= endDate
      );
    return [filterByDate(partySeries1), filterByDate(partySeries2)];
  }, [data, party1, party2, startDate, endDate]);

  const chartTitle = data?.timeSeries?.[party1]?.length
    ? "3-Day Moving Average Time Series of Ad Impressions"
    : "Time Series";

  if (error) return <div>Failed to load dataset</div>;
  if (isLoading || !series1 || !series2)
    return (
      <div className="h-[300px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-black dark:text-white"></span>
      </div>
    );

  const CustomTooltipImpressions = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-4 ${
            isDarkMode ? "bg-slate-900" : "bg-white"
          } flex flex-col gap-4 rounded-md ${
            !isDarkMode ? "border border-gray-200" : ""
          }`}
        >
          <p
            className={`text-medium text-lg ${
              isDarkMode ? "text-white" : "text-black"
            }`}
          >
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.stroke }}>
              <span className="ml-2">{formatNumber(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getDotColor = () => (isDarkMode ? "white" : "black");

  return (
    <div className="w-full flex flex-col items-center justify-center h-full">
      <h3
        className={`text-lg font-semibold ${
          isDarkMode ? "text-white" : "text-black"
        } mt-5`}
      >
        {chartTitle}
      </h3>
      <div className="w-full relative">
        <PartySelector
          value={party1}
          onChange={(e) => setParty1(e.target.value)}
        />

        <ResponsiveContainer width="100%" height={270}>
          <LineChart
            data={series1}
            syncId="timeSeriesCharts"
            margin={{
              right: 30,
              left: 0,
              top: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? "#555555" : "#e0e0e0"}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: isDarkMode ? "#999" : "#333" }}
            />
            <YAxis
              tickFormatter={(x) => `${x / 1000000}M`}
              tick={{ fill: isDarkMode ? "#999" : "#333" }}
            />

            <Tooltip content={<CustomTooltipImpressions />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="high_persuasive_impressions"
              stroke={chartColors.chart_color_1}
              name="High Persuasive Impressions"
              dot={{ r: 1, strokeWidth: 0, fill: getDotColor() }}
              activeDot={{
                strokeWidth: 0,
                fill: getDotColor(),
                r: 3,
              }}
              strokeWidth={1.7}
            />

            <Line
              type="monotone"
              dataKey="low_persuasive_impressions"
              stroke={chartColors.chart_color_3}
              name="Low Persuasive Impressions"
              dot={{ r: 1, strokeWidth: 0, fill: getDotColor() }}
              activeDot={{
                strokeWidth: 0,
                fill: getDotColor(),
                r: 3,
              }}
              strokeWidth={1.7}
            />

            <ReferenceLine
              x="2022-05-21"
              stroke="red"
              strokeDasharray="3 3"
              label={{
                value: "Election Day (21 May)",
                fill: isDarkMode ? "white" : "black",
                position: "top",
              }}
            />

            <ReferenceLine
              x="2022-04-10"
              stroke="green"
              strokeDasharray="3 3"
              label={{
                value: "Call for Election (10 April)",
                fill: isDarkMode ? "white" : "black",
                position: "top",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full relative">
        <PartySelector
          value={party2}
          onChange={(e) => setParty2(e.target.value)}
        />
        <ResponsiveContainer width="100%" height={270}>
          <LineChart
            data={series2}
            syncId="timeSeriesCharts"
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? "#555555" : "#e0e0e0"}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: isDarkMode ? "#999" : "#333" }}
            />
            <YAxis
              tickFormatter={(x) => `${x / 1000000}M`}
              tick={{ fill: isDarkMode ? "#999" : "#333" }}
            />
            <Tooltip content={<CustomTooltipImpressions />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="high_persuasive_impressions"
              stroke={chartColors.chart_color_1}
              name="High Persuasive Impressions"
              dot={{ r: 1, strokeWidth: 0, fill: getDotColor() }}
              activeDot={{
                strokeWidth: 0,
                fill: getDotColor(),
                r: 3,
              }}
              strokeWidth={1.7}
            />
            <Line
              type="monotone"
              dataKey="low_persuasive_impressions"
              stroke={chartColors.chart_color_3}
              name="Low Persuasive Impressions"
              dot={{ r: 1, strokeWidth: 0, fill: getDotColor() }}
              activeDot={{
                strokeWidth: 0,
                fill: getDotColor(),
                r: 3,
              }}
              strokeWidth={1.7}
            />
            <ReferenceLine x="2022-05-21" stroke="red" strokeDasharray="3 3" />
            <ReferenceLine
              x="2022-04-10"
              stroke="green"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChartComponent;
