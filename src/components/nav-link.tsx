"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

export function NavLink({
  href,
  icon,
  label,
  badge = 0,
}: {
  href: string;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
        active ? "text-ink" : "text-black/45"
      }`}
    >
      <Icon name={icon} className="size-6" />
      {label}
      {badge > 0 && (
        <span className="absolute left-1/2 top-1 ml-2 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
