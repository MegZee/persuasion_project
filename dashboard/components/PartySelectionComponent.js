import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

const PartySelectionComponent = ({
  parties,
  selectedParties,
  updateSelectedParties,
}) => {
  const [showAlert, setShowAlert] = useState(false);

  const handlePartySelection = (partyName, isChecked) => {
    if (!isChecked && selectedParties.length === 1) {
      setShowAlert(true);
      return;
    }
    setShowAlert(false);
    updateSelectedParties(partyName, isChecked);
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      parties.forEach((party) => {
        if (!selectedParties.includes(party.name)) {
          updateSelectedParties(party.name, true);
        }
      });
    } else {
      // Deselect all except the first party
      selectedParties.slice(1).forEach((partyName) => {
        updateSelectedParties(partyName, false);
      });
    }
    setShowAlert(false);
  };

  useEffect(() => {
    setShowAlert(selectedParties.length === 1);
  }, [selectedParties]);

  return (
    <div className="mb-6 p-4 rounded-lg shadow-lg border-[#f7b11a80] border">
      <h3 className="font-semibold mb-3 flex items-center text-black dark:text-white">
        Select Parties
      </h3>
      <label className="flex items-center space-x-2 mb-2">
        <input
          type="checkbox"
          checked={selectedParties.length === parties.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="checkbox checkbox-sm"
        />
        <span className="text-sm text-black dark:text-white">Select All</span>
      </label>
      {parties.map((party) => (
        <label key={party.name} className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            checked={selectedParties.includes(party.name)}
            onChange={(e) => handlePartySelection(party.name, e.target.checked)}
            className="checkbox checkbox-sm"
          />
          <span className={`w-3 h-3 rounded-full ${party.color}`}></span>
          <span className="text-sm text-black dark:text-white">
            {party.name}
          </span>
        </label>
      ))}
      {showAlert && (
        <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            At least one party must be selected at all times.
          </p>
        </div>
      )}
    </div>
  );
};

export default PartySelectionComponent;
