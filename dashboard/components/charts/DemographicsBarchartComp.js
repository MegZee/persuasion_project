"use client";
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDateContext } from "../../context/DateContext";
import { usePartyContext } from "@/context/PartyContext";
import { formatNumber } from "@/lib/util";
import { shortNameParties } from "@/lib/config";
import { useTheme } from "@/context/ThemeContext";
import { useStaticData } from "@/context/DataContext";
import { computeDemographics } from "@/lib/staticCalculations";

const DemographicsBarchartComponent = ({ demographicType }) => {
  const { startDate, endDate } = useDateContext();
  const { selectedParties } = usePartyContext();
  const { isDarkMode } = useTheme();
  const { data, error, isLoading } = useStaticData();

  const apiResponse = useMemo(() => {
    if (!data) return null;
    return computeDemographics(
      data,
      startDate,
      endDate,
      selectedParties,
      demographicType
    );
  }, [data, startDate, endDate, selectedParties, demographicType]);

  if (error) return <div>failed to load dataset</div>;
  if (isLoading || !apiResponse)
    return (
      <div className="h-[300px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-black dark:text-white"></span>
      </div>
    );

  const { data: demographicsData, title } = apiResponse;

  const categories = Array.from(
    new Set(
      Object.values(demographicsData).flatMap((party) =>
        Object.keys(party.total)
      )
    )
  );

  const formattedData = categories.map((category) => {
    const categoryData = { category };
    Object.entries(demographicsData).forEach(([party, values]) => {
      categoryData[`${party}_others`] =
        values.total[category] -
          values.high_persuasive[category] -
          values.low_persuasive[category] || 0;
      categoryData[`${party}_high`] = values.high_persuasive[category] || 0;
      categoryData[`${party}_low`] = values.low_persuasive[category] || 0;
    });
    return categoryData;
  });

  const sortedParties = shortNameParties
    .map((party) => party.name)
    .filter((party) => demographicsData.hasOwnProperty(party));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const groupedPayload = payload.reduce((acc, entry) => {
        const [party, type] = entry.dataKey.split("_");
        if (!acc[party]) {
          acc[party] = {};
        }
        acc[party][type] = entry.value;
        return acc;
      }, {});

      const parties = Object.entries(groupedPayload);
      const rows = [];
      for (let i = 0; i < parties.length; i += 2) {
        rows.push(parties.slice(i, i + 2));
      }

      return (
        <div
          className={`p-4 ${
            isDarkMode ? "bg-slate-900" : "bg-white"
          } flex flex-col gap-4 rounded-md border border-gray-200`}
        >
          <p
            className={`text-medium text-lg ${
              isDarkMode ? "text-white" : "text-black"
            }`}
          >
            {label}
          </p>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              {row.map(([party, values]) => (
                <div
                  key={party}
                  className="flex-1"
                  style={{
                    color: shortNameParties.find((p) => p.name === party).color,
                  }}
                >
                  <p className="font-bold">{party}</p>
                  <p className="text-sm">
                    High Persuasive: {formatNumber(values.high)}
                  </p>
                  <p className="text-sm">
                    Low Persuasive: {formatNumber(values.low)}
                  </p>
                  <p className="text-sm">
                    Others: {formatNumber(values.others)}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    const uniqueParties = [
      ...new Set(payload.map((entry) => entry.dataKey.split("_")[0])),
    ];

    return (
      <div className="flex flex-col items-center mt-4">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          {uniqueParties.map((party) => {
            const color = shortNameParties.find((p) => p.name === party).color;
            return (
              <div key={party} className="flex items-center">
                <div
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: color,
                    marginRight: 5,
                  }}
                />
                <span className={isDarkMode ? "text-white" : "text-black"}>
                  {party}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center">
            <svg width="20" height="20" style={{ marginRight: 5 }}>
              <rect width="20" height="20" fill="url(#legend-dots)" />
            </svg>
            <span className={isDarkMode ? "text-white" : "text-black"}>
              Low Persuasive
            </span>
          </div>
          <div className="flex items-center">
            <svg width="20" height="20" style={{ marginRight: 5 }}>
              <rect width="20" height="20" fill="url(#legend-stripes)" />
            </svg>
            <span className={isDarkMode ? "text-white" : "text-black"}>
              High Persuasive
            </span>
          </div>
          <div className="flex items-center">
            <svg width="20" height="20" style={{ marginRight: 5 }}>
              <rect width="20" height="20" fill="#888" />
            </svg>
            <span className={isDarkMode ? "text-white" : "text-black"}>
              Others
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      className="flex flex-col items-center justify-center"
    >
      <h3
        className={`text-lg font-semibold ${
          isDarkMode ? "text-white" : "text-black"
        } mt-5`}
      >
        {title}
      </h3>
      <BarChart
        layout="vertical"
        data={formattedData}
        margin={{
          right: 30,
          left: 20,
          top: 5,
          bottom: 15,
        }}
      >
        <defs>
          {sortedParties.map((party) => {
            const color = shortNameParties.find((p) => p.name === party).color;
            return (
              <React.Fragment key={party}>
                <pattern
                  id={`${party}-stripes`}
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y="0"
                    x2="0"
                    y2="4"
                    stroke={color}
                    strokeWidth="2"
                  />
                </pattern>
                <pattern
                  id={`${party}-dots`}
                  patternUnits="userSpaceOnUse"
                  width="3"
                  height="3"
                >
                  <circle cx="1.5" cy="1.5" r="0.5" fill={color} />
                </pattern>
              </React.Fragment>
            );
          })}
          <pattern
            id="legend-stripes"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line x1="0" y="0" x2="0" y2="4" stroke="#888" strokeWidth="2" />
          </pattern>
          <pattern
            id="legend-dots"
            patternUnits="userSpaceOnUse"
            width="3"
            height="3"
          >
            <circle cx="1.5" cy="1.5" r="0.5" fill="#888" />
          </pattern>
        </defs>
        <CartesianGrid
          horizontal={false}
          vertical={true}
          strokeDasharray="3 3"
          stroke={isDarkMode ? "#555555" : "#e0e0e0"}
        />
        <XAxis
          type="number"
          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          tick={{ fill: isDarkMode ? "#999" : "#333" }}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: isDarkMode ? "#999" : "#333" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        {sortedParties.map((party) => {
          const color = shortNameParties.find((p) => p.name === party).color;
          return (
            <React.Fragment key={party}>
              <Bar
                dataKey={`${party}_low`}
                stackId={party}
                fill={`url(#${party}-dots)`}
              />
              <Bar
                dataKey={`${party}_high`}
                stackId={party}
                fill={`url(#${party}-stripes)`}
              />
              <Bar dataKey={`${party}_others`} stackId={party} fill={color} />
            </React.Fragment>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DemographicsBarchartComponent;
