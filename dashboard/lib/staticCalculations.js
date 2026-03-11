import { partyNameToMacro } from "@/lib/config";

const safeDivide = (numerator, denominator, multiplier = 1) => {
  if (!denominator) return 0;
  return (numerator / denominator) * multiplier;
};

const toMacroPartySet = (selectedParties) => {
  if (!selectedParties || selectedParties.length === 0) {
    return null;
  }
  const mapped = selectedParties.map(
    (party) => partyNameToMacro[party] ?? party
  );
  return new Set(mapped);
};

export const filterAds = (ads, startDate, endDate, selectedParties) => {
  const allowedParties = toMacroPartySet(selectedParties);
  return ads.filter((ad) => {
    if (ad.startDate < startDate || ad.endDate > endDate) {
      return false;
    }
    if (allowedParties && !allowedParties.has(ad.macroParty)) {
      return false;
    }
    return true;
  });
};

export const computeGeneralStats = (
  data,
  startDate,
  endDate,
  selectedParties
) => {
  const filteredAds = filterAds(data.ads, startDate, endDate, selectedParties);

  if (filteredAds.length === 0) {
    return {
      title: "General Stats",
      description: "No data available for the selected filters",
      data: {
        total_spend: 0,
        total_spend_high_persuasive: 0,
        total_spend_low_persuasive: 0,
        total_spend_other: 0,
        total_impressions: 0,
        total_impressions_high_persuasive: 0,
        total_impressions_low_persuasive: 0,
        total_impressions_other: 0,
        total_ads: 0,
        total_high_persuasive_ads: 0,
        total_low_persuasive_ads: 0,
        total_other_ads: 0,
        total_number_of_unique_funding_entities: 0,
        average_spend_per_ad: 0,
        average_impressions_per_ad: 0,
        cost_per_thousand_impressions: 0,
        cost_per_thousand_impressions_high_persuasive: 0,
        cost_per_thousand_impressions_low_persuasive: 0,
        cost_per_thousand_impressions_other: 0,
        proportion_high_persuasive: 0,
        proportion_low_persuasive: 0,
        proportion_other: 0,
        percentage_ads_persuasive_ratio_gt_0: 0,
        avg_campaign_duration: 0,
        avg_campaign_duration_high_persuasive: 0,
      },
    };
  }

  const totalSpend = filteredAds.reduce((sum, ad) => sum + ad.meanSpend, 0);
  const totalImpressions = filteredAds.reduce(
    (sum, ad) => sum + ad.meanImpressions,
    0
  );
  const totalAds = filteredAds.length;

  const highAds = filteredAds.filter((ad) => ad.highPersuasive);
  const lowAds = filteredAds.filter((ad) => ad.lowPersuasive);
  const otherAds = filteredAds.filter(
    (ad) => !ad.highPersuasive && !ad.lowPersuasive
  );

  const spendHigh = highAds.reduce((sum, ad) => sum + ad.meanSpend, 0);
  const spendLow = lowAds.reduce((sum, ad) => sum + ad.meanSpend, 0);
  const spendOther = otherAds.reduce((sum, ad) => sum + ad.meanSpend, 0);

  const impressionsHigh = highAds.reduce(
    (sum, ad) => sum + ad.meanImpressions,
    0
  );
  const impressionsLow = lowAds.reduce(
    (sum, ad) => sum + ad.meanImpressions,
    0
  );
  const impressionsOther = otherAds.reduce(
    (sum, ad) => sum + ad.meanImpressions,
    0
  );

  const durationTotal = filteredAds.reduce(
    (sum, ad) => sum + ad.durationDays,
    0
  );
  const durationHigh = highAds.reduce((sum, ad) => sum + ad.durationDays, 0);

  const uniqueFunding = new Set(
    filteredAds.map((ad) => ad.fundingEntity).filter(Boolean)
  ).size;
  const adsWithPositivePersuasion = filteredAds.filter(
    (ad) => ad.persuasiveRatio > 0
  ).length;

  return {
    title: "General Stats",
    description: `General statistics for ${
      selectedParties && selectedParties.length > 0
        ? "selected parties"
        : "all parties"
    }`,
    data: {
      total_spend: totalSpend,
      total_spend_high_persuasive: spendHigh,
      total_spend_low_persuasive: spendLow,
      total_spend_other: spendOther,
      total_impressions: totalImpressions,
      total_impressions_high_persuasive: impressionsHigh,
      total_impressions_low_persuasive: impressionsLow,
      total_impressions_other: impressionsOther,
      total_ads: totalAds,
      total_high_persuasive_ads: highAds.length,
      total_low_persuasive_ads: lowAds.length,
      total_other_ads: otherAds.length,
      total_number_of_unique_funding_entities: uniqueFunding,
      average_spend_per_ad: safeDivide(totalSpend, totalAds),
      average_impressions_per_ad: safeDivide(totalImpressions, totalAds),
      cost_per_thousand_impressions: safeDivide(
        totalSpend,
        totalImpressions,
        1000
      ),
      cost_per_thousand_impressions_high_persuasive: safeDivide(
        spendHigh,
        impressionsHigh,
        1000
      ),
      cost_per_thousand_impressions_low_persuasive: safeDivide(
        spendLow,
        impressionsLow,
        1000
      ),
      cost_per_thousand_impressions_other: safeDivide(
        spendOther,
        impressionsOther,
        1000
      ),
      proportion_high_persuasive: safeDivide(highAds.length, totalAds),
      proportion_low_persuasive: safeDivide(lowAds.length, totalAds),
      proportion_other: safeDivide(otherAds.length, totalAds),
      percentage_ads_persuasive_ratio_gt_0: safeDivide(
        adsWithPositivePersuasion,
        totalAds
      ),
      avg_campaign_duration: safeDivide(durationTotal, totalAds),
      avg_campaign_duration_high_persuasive: safeDivide(
        durationHigh,
        highAds.length || 0
      ),
    },
  };
};

export const computePartyBreakdown = (data, startDate, endDate, dataType) => {
  const filteredAds = filterAds(data.ads, startDate, endDate);

  const result = {};

  filteredAds.forEach((ad) => {
    if (!ad.macroParty) {
      return;
    }
    if (!result[ad.macroParty]) {
      result[ad.macroParty] = {
        total_spend: 0,
        high_persuasive_spend: 0,
        low_persuasive_spend: 0,
        total_impressions: 0,
        high_persuasive_impressions: 0,
        low_persuasive_impressions: 0,
      };
    }

    const partyEntry = result[ad.macroParty];

    partyEntry.total_spend += ad.meanSpend;
    partyEntry.total_impressions += ad.meanImpressions;

    if (ad.highPersuasive) {
      partyEntry.high_persuasive_spend += ad.meanSpend;
      partyEntry.high_persuasive_impressions += ad.meanImpressions;
    } else if (ad.lowPersuasive) {
      partyEntry.low_persuasive_spend += ad.meanSpend;
      partyEntry.low_persuasive_impressions += ad.meanImpressions;
    }
  });

  // Strip unused metrics to align with legacy structure.
  Object.values(result).forEach((entry) => {
    if (dataType === "spend") {
      delete entry.total_impressions;
      delete entry.high_persuasive_impressions;
      delete entry.low_persuasive_impressions;
    } else {
      delete entry.total_spend;
      delete entry.high_persuasive_spend;
      delete entry.low_persuasive_spend;
    }
  });

  return result;
};

export const computeRegionalDistribution = (
  data,
  startDate,
  endDate,
  selectedParties
) => {
  const filteredAds = filterAds(data.ads, startDate, endDate, selectedParties);

  const totals = data.regions.map(() => ({
    all: { impressions: 0, spend: 0 },
    high: { impressions: 0, spend: 0 },
    low: { impressions: 0, spend: 0 },
  }));

  filteredAds.forEach((ad) => {
    ad.regionData.forEach(([regionIndex, impressions, spend]) => {
      const regionTotals = totals[regionIndex];
      regionTotals.all.impressions += impressions;
      regionTotals.all.spend += spend;
      if (ad.highPersuasive) {
        regionTotals.high.impressions += impressions;
        regionTotals.high.spend += spend;
      } else if (ad.lowPersuasive) {
        regionTotals.low.impressions += impressions;
        regionTotals.low.spend += spend;
      }
    });
  });

  const dataObject = {};
  totals.forEach((value, idx) => {
    dataObject[data.regions[idx]] = {
      high_persuasive_spend: value.high.spend,
      low_persuasive_spend: value.low.spend,
      mean_spend: value.all.spend,
      high_persuasive_impressions: value.high.impressions,
      low_persuasive_impressions: value.low.impressions,
      mean_impressions: value.all.impressions,
    };
  });

  return {
    title: "Regional Spend and Impressions",
    description:
      "Spend and impressions by region for high persuasive, low persuasive, and all ads",
    data: dataObject,
  };
};

const ensureDemographicEntry = (store, party) => {
  if (!store[party]) {
    store[party] = {
      total: {},
      high_persuasive: {},
      low_persuasive: {},
    };
  }
  return store[party];
};

export const computeDemographics = (
  data,
  startDate,
  endDate,
  selectedParties,
  demographicType
) => {
  const filteredAds = filterAds(data.ads, startDate, endDate, selectedParties);
  const isGender = demographicType === "gender";
  const categories = isGender ? data.genders : data.ages;

  const totals = {};

  filteredAds.forEach((ad) => {
    const entries = isGender ? ad.genderData : ad.ageData;
    entries.forEach(([index, impressions]) => {
      const category = categories[index];
      if (!category) {
        return;
      }
      const partyEntry = ensureDemographicEntry(totals, ad.macroParty);
      partyEntry.total[category] =
        (partyEntry.total[category] || 0) + impressions;
      if (ad.highPersuasive) {
        partyEntry.high_persuasive[category] =
          (partyEntry.high_persuasive[category] || 0) + impressions;
      } else if (ad.lowPersuasive) {
        partyEntry.low_persuasive[category] =
          (partyEntry.low_persuasive[category] || 0) + impressions;
      }
    });
  });

  return {
    title: isGender ? "Ad Impressions by Gender" : "Ad Impressions by Age",
    data: totals,
  };
};

export const getTimeSeriesForParty = (data, party) => {
  if (!data.timeSeries) return [];
  return data.timeSeries[party] || [];
};
