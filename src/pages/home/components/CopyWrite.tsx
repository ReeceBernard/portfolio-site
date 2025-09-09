export const CopyrightFooter = ({
  ownerName = "Reece Bernard",
  startYear = null,
  className = "",
}) => {
  const currentYear = new Date().getFullYear();
  const yearDisplay =
    startYear && startYear < currentYear
      ? `${startYear}-${currentYear}`
      : currentYear;

  return (
    <footer
      className={`bg-transparent py-4 px-6 text-center text-gray-600 text-sm ${className}`}
    >
      <p>
        © {yearDisplay} {ownerName}. All rights reserved.
      </p>
    </footer>
  );
};
