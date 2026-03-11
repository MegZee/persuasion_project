import { cn } from "@/lib/util";

export const PartySelector = ({ value, onChange, className }) => {
  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <select
      className={cn(
        "select select-xs z-10",
        "bg-gray-100 text-black border-gray-300",
        "dark:bg-gray-800 dark:text-white dark:border-gray-700",
        className
      )}
      value={value}
      onChange={onChange}
      onClick={handleClick}
    >
      <option value="Labor">Labor Party</option>
      <option value="Liberal">Liberal Coalition</option>
      <option value="Greens">Greens Party</option>
      <option value="Independents">Independents</option>
      <option value="Other">Other Parties</option>
      <option value="No_Affiliation">No Party Affiliation</option>
      <option value="All">All</option>
    </select>
  );
};
