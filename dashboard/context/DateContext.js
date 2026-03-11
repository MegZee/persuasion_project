"use client";

import React, { createContext, useState, useContext } from "react";

const DateContext = createContext();

export const DateProvider = ({ children }) => {
  const [startDate, setStartDate] = useState("2022-03-01");
  const [endDate, setEndDate] = useState("2022-06-01");

  const updateStartDate = (newDate) => {
    if (newDate < "2022-03-01") {
      setStartDate("2022-03-01");
    } else if (newDate >= endDate) {
      if (newDate >= "2022-06-01") {
        setStartDate("2022-05-31");
        setEndDate("2022-06-01");
      } else {
        setStartDate(newDate);
        setEndDate(getNextDay(newDate));
      }
    } else {
      setStartDate(newDate);
    }
  };

  const updateEndDate = (newDate) => {
    if (newDate > "2022-06-01") {
      setEndDate("2022-06-01");
    } else if (newDate <= "2022-03-01") {
      setStartDate("2022-03-01");
      setEndDate("2022-03-02");
    } else if (newDate <= startDate) {
      if (startDate === "2022-03-01") {
        setEndDate("2022-03-02");
      } else {
        setEndDate(startDate);
        setStartDate(getPreviousDay(newDate));
      }
    } else {
      setEndDate(newDate);
    }
  };

  const getNextDay = (date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split("T")[0];
  };

  const getPreviousDay = (date) => {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    return previousDay.toISOString().split("T")[0];
  };

  return (
    <DateContext.Provider
      value={{ startDate, endDate, updateStartDate, updateEndDate }}
    >
      {children}
    </DateContext.Provider>
  );
};

export const useDateContext = () => useContext(DateContext);
