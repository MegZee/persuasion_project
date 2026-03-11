import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const capitalizeFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Function to debounce a function call
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

export function formatDate(dateStr) {
  // Create a new Date object from the input string
  const date = new Date(dateStr);

  // Define an array of month names
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Get the day, month, and year from the Date object
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatThousands(num) {
  return `${(num / 1000).toFixed(1)}K`;
}

export function formatMillions(num) {
  return `${(num / 1000000).toFixed(1)}M`;
}

export function formatBillions(num) {
  return `${(num / 1000000000).toFixed(1)}B`;
}

// combines thousands and millions formatting
export function formatNumber(num) {
  if (num < 1000) {
    return num.toFixed(1);
  } else if (num < 1000000) {
    return formatThousands(num);
  } else if (num < 1000000000) {
    return formatMillions(num);
  } else {
    return formatBillions(num);
  }
}

export const formatPercentage = (value) => (value * 100).toFixed(1);

export function cleanString(str) {
  // This functions turnds all "_" into " ".
  return str.replace(/_/g, " ");
}
