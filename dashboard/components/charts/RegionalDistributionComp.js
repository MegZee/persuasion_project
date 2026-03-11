"use client";

import React, { useState, useEffect, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsMap from "highcharts/modules/map";
import { useDateContext } from "@/context/DateContext";
import { usePartyContext } from "@/context/PartyContext";
import { australianRegions } from "@/lib/config";
import { formatNumber } from "@/lib/util";
import { useTheme } from "@/context/ThemeContext";
import { useStaticData } from "@/context/DataContext";
import { computeRegionalDistribution } from "@/lib/staticCalculations";

// Initialize highchartsMap
if (typeof Highcharts === "object") {
  highchartsMap(Highcharts);
}

const RegionalDistributionComponent = ({
  width = "100%",
  height = "350px",
}) => {
  const { startDate, endDate } = useDateContext();
  const [mapOptions, setMapOptions] = useState({});
  const [title, setTitle] = useState("");
  const { selectedParties } = usePartyContext();
  const { isDarkMode } = useTheme();
  const { data, error, isLoading } = useStaticData();

  const regionalData = useMemo(() => {
    if (!data) return null;
    return computeRegionalDistribution(
      data,
      startDate,
      endDate,
      selectedParties
    );
  }, [data, startDate, endDate, selectedParties]);

  useEffect(() => {
    const fetchMapData = async () => {
      const mapData = await fetch(
        "https://code.highcharts.com/mapdata/countries/au/au-all.topo.json"
      ).then((response) => response.json());

      if (regionalData) {
        const seriesData = mapData.objects.default.geometries
          .filter((feature) =>
            australianRegions.includes(feature.properties.name)
          )
          .map((feature) => ({
            "hc-key": feature.properties["hc-key"],
            value:
              regionalData.data[feature.properties.name]?.mean_impressions || 0,
            high_persuasive_impressions:
              regionalData.data[feature.properties.name]
                ?.high_persuasive_impressions || 0,
            low_persuasive_impressions:
              regionalData.data[feature.properties.name]
                ?.low_persuasive_impressions || 0,
            mean_spend:
              regionalData.data[feature.properties.name]?.mean_spend || 0,
            high_persuasive_spend:
              regionalData.data[feature.properties.name]?.high_persuasive_spend ||
              0,
            low_persuasive_spend:
              regionalData.data[feature.properties.name]?.low_persuasive_spend ||
              0,
          }));

        setTitle(regionalData.title);

        setMapOptions({
          chart: {
            map: mapData,
            backgroundColor: "transparent",
            margin: [10, 10, 10, 10],
          },
          title: {
            text: undefined,
          },
          credits: {
            enabled: false,
          },
          colorAxis: {
            min: 0,
            stops: [
              [0, "#fff7e6"],
              [0.5, "#f7b21a"],
              [1, "#664700"],
            ],
            labels: {
              style: {
                color: isDarkMode ? "#ffffff" : "#000000",
              },
            },
          },
          legend: {
            align: "right",
            verticalAlign: "middle",
            layout: "vertical",
            x: -30,
            title: {
              text: "Impressions",
              style: {
                color: isDarkMode ? "#ffffff" : "#000000",
              },
            },
            itemStyle: {
              color: isDarkMode ? "#ffffff" : "#000000",
            },
          },
          series: [
            {
              data: seriesData,
              name: "Impressions",
              states: {
                hover: {
                  color: "#ffd480",
                },
              },
              dataLabels: {
                enabled: false, // Disable state name labels
              },
            },
            {
              type: "mappoint",
              name: "ACT",
              data: [
                {
                  name: "ACT",
                  lat: -35.4735,
                  lon: 149.0124,
                  z:
                    regionalData.data["Australian Capital Territory"]
                      ?.mean_impressions || 0,
                  high_persuasive_impressions:
                    regionalData.data["Australian Capital Territory"]
                      ?.high_persuasive_impressions || 0,
                  low_persuasive_impressions:
                    regionalData.data["Australian Capital Territory"]
                      ?.low_persuasive_impressions || 0,
                  mean_spend:
                    regionalData.data["Australian Capital Territory"]
                      ?.mean_spend || 0,
                  high_persuasive_spend:
                    regionalData.data["Australian Capital Territory"]
                      ?.high_persuasive_spend || 0,
                  low_persuasive_spend:
                    regionalData.data["Australian Capital Territory"]
                      ?.low_persuasive_spend || 0,
                },
              ],
              color: Highcharts.getOptions().colors[0],
              marker: {
                fillColor: Highcharts.getOptions().colors[0],
                lineWidth: 2,
                lineColor: "#ffffff",
              },
            },
          ],
          tooltip: {
            backgroundColor: isDarkMode ? "#0f1729" : "#ffffff",
            borderWidth: 0,
            style: {
              color: isDarkMode ? "#ffffff" : "#000000",
            },
            useHTML: true,
            pointFormatter: function () {
              const titleFontSize = "18px";
              const contentFontSize = "14px";
              const impressions =
                this.value !== undefined ? this.value : this.z;
              const textColor = isDarkMode ? "white" : "black";

              return `
                <div style="color: ${textColor};">
                  <div style="font-size: ${titleFontSize}; font-weight: bold; margin-bottom: 12px;">
                    ${this.name}
                  </div>
                  <div style="font-size: ${contentFontSize}; line-height: 1.5;">
                    Total Impressions: ${formatNumber(impressions)}<br/>
                    <span style="color: #8f4ecb;">High Persuasive Impressions: ${formatNumber(
                      this.high_persuasive_impressions
                    )}</span><br/>
                    <div style="color: #3b82f6; margin-bottom: 10px;">Low Persuasive Impressions: ${formatNumber(
                      this.low_persuasive_impressions
                    )}</div>
                    Total Spend: $${formatNumber(this.mean_spend, 2)}<br/>
                    <span style="color: #8f4ecb;">High Persuasive Spend: $${formatNumber(
                      this.high_persuasive_spend,
                      2
                    )}</span><br/>
                    <span style="color: #3b82f6;">Low Persuasive Spend: $${formatNumber(
                      this.low_persuasive_spend,
                      2
                    )}</span>
                  </div>
                </div>
              `;
            },
          },
        });
      }
    };
    fetchMapData();
  }, [regionalData, isDarkMode]);

  if (error) return <div>failed to load dataset</div>;
  if (isLoading || !regionalData)
    return (
      <div className="h-[300px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-black dark:text-white"></span>
      </div>
    );

  return (
    <div
      style={{ width, height }}
      className="flex flex-col items-center justify-center"
    >
      <h3
        className={`text-lg font-semibold ${
          isDarkMode ? "text-white" : "text-black"
        } mt-5`}
      >
        {title}
      </h3>
      <HighchartsReact
        highcharts={Highcharts}
        options={mapOptions}
        constructorType={"mapChart"}
      />
    </div>
  );
};

export default RegionalDistributionComponent;
