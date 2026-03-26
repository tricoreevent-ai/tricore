const icons = {
  overview: (
    <>
      <path d="M4 12.5 12 5l8 7.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  events: (
    <>
      <rect height="14" rx="2.5" width="15" x="4.5" y="5" />
      <path d="M8 3.5v3M16 3.5v3M4.5 9.5h15" />
      <path d="M8.5 13h3m2 0h2m-7 3h2m3 0h2" />
    </>
  ),
  registrations: (
    <>
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 19a7 7 0 0 1 14 0" />
      <path d="M18.5 8.5h3M20 7v3" />
    </>
  ),
  matches: (
    <>
      <path d="M7 6.5h5.5l4 4V17.5H11l-4-4z" />
      <path d="m12.5 6.5 4 4M7 17.5l4-4" />
    </>
  ),
  accounting: (
    <>
      <path d="M7 5h9a3 3 0 0 1 0 6H8.5a2.5 2.5 0 0 0 0 5H17" />
      <path d="M12 3.5v17" />
    </>
  ),
  reports: (
    <>
      <path d="M6 19.5V9M12 19.5V4.5M18 19.5v-7" />
      <path d="M4 19.5h16" />
    </>
  ),
  users: (
    <>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M15.5 12.5a2.5 2.5 0 1 0 0-5" />
      <path d="M4.5 18a5.5 5.5 0 0 1 9 0" />
      <path d="M15 15.5a4.5 4.5 0 0 1 4.5 2.5" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19 12 .9 1.6-1.6 2.8-1.8-.2a7.8 7.8 0 0 1-1.4.8l-.6 1.7H9.5L9 16.9a7.8 7.8 0 0 1-1.4-.8l-1.8.2-1.6-2.8L5 12l-.9-1.6 1.6-2.8 1.8.2c.4-.3.9-.6 1.4-.8l.5-1.7h3.2l.6 1.7c.5.2 1 .5 1.4.8l1.8-.2 1.6 2.8z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H9" />
      <path d="M14.5 16.5 20 12l-5.5-4.5M20 12H9" />
    </>
  ),
  refresh: (
    <>
      <path d="M19 8.5V4h-4.5" />
      <path d="M5 15.5V20h4.5" />
      <path d="M18.2 10A7 7 0 0 0 6.6 6.2L4.5 8.5M5.8 14A7 7 0 0 0 17.4 17.8l2.1-2.3" />
    </>
  ),
  export: (
    <>
      <path d="M12 4.5v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  copy: (
    <>
      <rect height="11" rx="2" width="9" x="9" y="7" />
      <path d="M15 7V6a2 2 0 0 0-2-2H7A2 2 0 0 0 5 6v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  security: (
    <>
      <path d="M12 4.5 18.5 7v4.8c0 4-2.5 6.8-6.5 7.7-4-1-6.5-3.7-6.5-7.7V7z" />
      <path d="M9.5 12.5 11 14l3.5-4" />
    </>
  ),
  bell: (
    <>
      <path d="M8 17.5h8l-1.2-1.8v-3.2a2.8 2.8 0 1 0-5.6 0v3.2z" />
      <path d="M10.5 18.5a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  chart: (
    <>
      <path d="M4.5 19.5h15" />
      <path d="M7 17v-4M12 17V7M17 17v-7" />
    </>
  ),
  revenue: (
    <>
      <path d="M12 3.5v17" />
      <path d="M15.8 7.5A4.5 4.5 0 0 0 12 6c-2.1 0-3.8 1-3.8 2.7 0 1.6 1.2 2.3 3.8 2.8 2.6.5 3.8 1.2 3.8 2.8 0 1.8-1.7 2.9-4 2.9a5.8 5.8 0 0 1-4.3-1.8" />
    </>
  ),
  calendar: (
    <>
      <rect height="14" rx="2.5" width="15" x="4.5" y="5" />
      <path d="M8 3.5v3M16 3.5v3M4.5 9.5h15M9 13h6M9 16h4" />
    </>
  ),
  bank: (
    <>
      <path d="M4.5 9 12 4.5 19.5 9" />
      <path d="M6.5 10.5V18M10 10.5V18M14 10.5V18M17.5 10.5V18" />
      <path d="M4 19.5h16M3.5 9.5h17" />
    </>
  ),
  wallet: (
    <>
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5H18" />
      <path d="M5 8h12.5A1.5 1.5 0 0 1 19 9.5v7A1.5 1.5 0 0 1 17.5 18H6.5A2.5 2.5 0 0 1 4 15.5v-5A2.5 2.5 0 0 1 6.5 8H19" />
      <path d="M15 13h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 5.5h8v2.3A4 4 0 0 1 12 11.8 4 4 0 0 1 8 7.8z" />
      <path d="M8 6.5H5.8A1.8 1.8 0 0 0 4 8.3c0 2 1.6 3.7 3.6 3.7H9M16 6.5h2.2A1.8 1.8 0 0 1 20 8.3c0 2-1.6 3.7-3.6 3.7H15" />
      <path d="M12 11.8v3.2M9 19.5h6M10 15h4" />
    </>
  ),
  role: (
    <>
      <path d="M12 4.5 18.5 8v5c0 3.8-2.3 6.4-6.5 7.5C7.8 19.4 5.5 16.8 5.5 13V8z" />
      <path d="M9 12.5h6M12 9.5v6" />
    </>
  ),
  userPlus: (
    <>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M4.5 18a5.5 5.5 0 0 1 9 0" />
      <path d="M18.5 9h4M20.5 7v4" />
    </>
  ),
  key: (
    <>
      <path d="M8.5 14.5a3.5 3.5 0 1 1 2.7-1.3l2.3 2.3h2v2h2v2h2v-2.2l-5-5" />
    </>
  ),
  warning: (
    <>
      <path d="m12 4.5 8 14H4z" />
      <path d="M12 9v4.5M12 17h.01" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  trendUp: (
    <>
      <path d="M4.5 16.5 10 11l3.2 3.2L19.5 8" />
      <path d="M15.5 8h4v4" />
    </>
  ),
  chevronLeft: (
    <>
      <path d="m14.5 6.5-5 5.5 5 5.5" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9.5 6.5 5 5.5-5 5.5" />
    </>
  ),
  chevronDown: (
    <>
      <path d="m6.5 9.5 5.5 5 5.5-5" />
    </>
  ),
  chevronUp: (
    <>
      <path d="m6.5 14.5 5.5-5 5.5 5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 4 1.3 3.7L17 9l-3.7 1.3L12 14l-1.3-3.7L7 9l3.7-1.3z" />
      <path d="m18.5 14 0.6 1.8 1.9 0.6-1.9 0.6-0.6 1.8-0.6-1.8-1.9-0.6 1.9-0.6zM5.5 13l0.5 1.4 1.5 0.5-1.5 0.5-0.5 1.4-.5-1.4-1.5-.5 1.5-.5z" />
    </>
  )
};

export default function AppIcon({
  className = 'h-5 w-5',
  name = 'overview',
  strokeWidth = 1.8
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
    >
      {icons[name] || icons.overview}
    </svg>
  );
}
