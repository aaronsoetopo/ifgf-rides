const paths = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  ride: "M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  drive:
    "M5 16h14M6.5 16l1.6-5.2A2 2 0 0 1 10 9.4h4a2 2 0 0 1 1.9 1.4L17.5 16M4 16v3h2.5v-1.5h11V19H20v-3a2 2 0 0 0-1-1.7M7.5 18.5h.01M16.5 18.5h.01",
  inbox: "M4 13h4l1.5 3h5L16 13h4M4 13l2.5-8h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
  admin: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10v-1a6 6 0 0 1 12 0v1M16 3.1a4 4 0 0 1 0 7.8M21 21v-1a6 6 0 0 0-4-5.6",
  phone:
    "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2",
  message: "M4 5h16v11H8l-4 4z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  pin: "M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  location: "M12 2v3M12 19v3M2 12h3M19 12h3M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  copy: "M8 8h12v12H8zM4 16V4h12",
  check: "m5 12 5 5L20 7",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
