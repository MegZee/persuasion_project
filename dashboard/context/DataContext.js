"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const DataContext = createContext({
  data: null,
  isLoading: true,
  error: null,
});

export const DataProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(
          `${basePath}/data/preprocessed-data.json`
        );
        if (!response.ok) {
          throw new Error(`Failed to load static dataset: ${response.status}`);
        }
        const payload = await response.json();
        if (isMounted) {
          setData(payload);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DataContext.Provider value={{ data, isLoading, error }}>
      {children}
    </DataContext.Provider>
  );
};

export const useStaticData = () => useContext(DataContext);
