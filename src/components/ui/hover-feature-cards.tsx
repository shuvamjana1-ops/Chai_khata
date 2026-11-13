"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface HoverFeatureCardItem {
  name: string;
  description: string;
  href?: string;
  img?: string;
  imgLight?: string;
  imgClassName?: string;
  imgWidth?: number;
  containerClassName?: string;
  fadeBottom?: boolean;
  soon?: boolean;
  onClick?: () => void;
  badgeText?: string;
}

export interface HoverFeatureCardsProps {
  items: HoverFeatureCardItem[];
  className?: string;
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

function HoverFeatureCard({
  item,
  renderLink,
}: {
  item: HoverFeatureCardItem;
  renderLink?: HoverFeatureCardsProps["renderLink"];
}) {
  const inner = (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      onClick={!item.soon ? item.onClick : undefined}
      whileTap={{ scale: (item.href || item.onClick) && !item.soon ? 0.97 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      variants={{ rest: { scale: 1, y: 0 } }}
      className={cn(
        "group flex flex-col w-full relative text-left",
        item.soon
          ? "opacity-80 cursor-not-allowed"
          : item.href || item.onClick
            ? "cursor-pointer"
            : "",
      )}
    >
      <div
        className={cn(
          "flex flex-col rounded-3xl border h-56 z-5 bg-white transition-colors w-full overflow-hidden shadow-xs",
          !item.soon && (item.href || item.onClick) ? "hover:border-amber-700/60" : "",
          item.soon ? "border-dashed border-amber-900/20" : "border-amber-900/15",
        )}
      >
        {item.soon && (
          <span className="absolute top-3 right-3 z-10 text-xs text-stone-600 border border-stone-200 rounded-full px-2.5 py-1 bg-[#FAF6F0]">
            Coming soon
          </span>
        )}
        {item.badgeText && !item.soon && (
          <span className="absolute top-3 right-3 z-10 text-xs font-bold text-amber-900 px-2.5 py-1 bg-amber-100 rounded-lg">
            {item.badgeText}
          </span>
        )}

        <div
          className={cn(
            "relative w-full h-full overflow-hidden bg-amber-50/40 px-5 pt-6 pb-4 flex flex-col justify-between gap-3",
            item.containerClassName,
          )}
        >
          <span
            className={cn(
              "font-extrabold text-xl tracking-tight font-display pr-20",
              item.soon ? "text-stone-500" : "text-amber-950",
            )}
          >
            {item.name}
          </span>

          {item.img && (
            <img
              src={item.img}
              alt={item.name}
              width={item.imgWidth ?? 200}
              height={200}
              referrerPolicy="no-referrer"
              className={cn("h-auto hidden dark:block", item.imgClassName)}
            />
          )}
          {(item.imgLight ?? item.img) && (
            <img
              src={item.imgLight ?? item.img}
              alt={item.name}
              width={item.imgWidth ?? 200}
              height={200}
              referrerPolicy="no-referrer"
              className={cn("h-auto dark:hidden", item.imgClassName)}
            />
          )}

          {item.fadeBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
      </div>

      <motion.div
        variants={{
          rest: { opacity: 0.85, y: -12 },
          hover: { opacity: 1, y: 0 },
        }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="overflow-hidden z-1 w-11/12 self-center"
      >
        <div className="pt-5 pb-3.5 px-5 relative border-t-0 rounded-b-3xl border border-amber-900/15 bg-[#FAF6F0]">
          <div className="pointer-events-none w-[103%] bg-gradient-to-b from-white/80 to-transparent h-6 absolute -top-1 -left-1" />
          <p className="text-sm font-semibold text-stone-700 relative z-10">
            {item.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );

  if (item.href && renderLink) {
    return renderLink(item.href, inner);
  }

  return inner;
}

function HoverFeatureCards({
  items,
  className,
  renderLink,
}: HoverFeatureCardsProps) {
  return (
    <div
      className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 w-full", className)}
    >
      {items.map((item) => (
        <HoverFeatureCard key={item.name} item={item} renderLink={renderLink} />
      ))}
    </div>
  );
}

export { HoverFeatureCards, HoverFeatureCard };
