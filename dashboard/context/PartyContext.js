"use client";

import React, { createContext, useContext, useState } from "react";
import { parties } from "../lib/config";

const PartyContext = createContext();

export const usePartyContext = () => useContext(PartyContext);

export const PartyProvider = ({ children }) => {
  const [selectedParties, setSelectedParties] = useState(
    parties.map((party) => party.name)
  );

  const updateSelectedParties = (partyName, isSelected) => {
    setSelectedParties((prev) =>
      isSelected
        ? [...prev, partyName]
        : prev.filter((name) => name !== partyName)
    );
  };

  return (
    <PartyContext.Provider value={{ selectedParties, updateSelectedParties }}>
      {children}
    </PartyContext.Provider>
  );
};
