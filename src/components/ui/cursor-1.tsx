'use client';
import React, { useRef, useState } from 'react';
import { Cursor } from '@/components/core/cursor';
import { AnimatePresence, motion } from 'motion/react';
import { PlusIcon, Mic } from 'lucide-react';

export interface Cursor1Props {
  onTriggerDemo?: () => void;
  isHi?: boolean;
}

export function Cursor1({ onTriggerDemo, isHi = true }: Cursor1Props) {
  const [isHovering, setIsHovering] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const handlePositionChange = (x: number, y: number) => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const isInside =
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      setIsHovering(isInside);
    }
  };

  return (
    <div className="relative flex w-full items-center justify-center rounded-3xl bg-white border border-amber-900/15 p-6 shadow-xs overflow-hidden">
      <Cursor
        attachToParent
        variants={{
          initial: { scale: 0.3, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.3, opacity: 0 },
        }}
        springConfig={{
          bounce: 0.001,
        }}
        transition={{
          ease: 'easeInOut',
          duration: 0.15,
        }}
        onPositionChange={handlePositionChange}
      >
        <motion.div
          animate={{
            width: isHovering ? 96 : 16,
            height: isHovering ? 34 : 16,
          }}
          className="flex items-center justify-center rounded-[24px] bg-amber-900/80 backdrop-blur-md shadow-md"
        >
          <AnimatePresence>
            {isHovering ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="inline-flex w-full items-center justify-center"
              >
                <div className="inline-flex items-center text-xs font-bold text-white whitespace-nowrap">
                  {isHi ? 'बोलो' : 'More'} <PlusIcon className="ml-1 h-4 w-4" />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </Cursor>
      <div
        ref={targetRef}
        onClick={onTriggerDemo}
        className="w-full flex flex-col sm:flex-row items-center justify-between gap-5 cursor-pointer"
      >
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <Mic className="w-4 h-4" />
            <span>
              {isHi
                ? 'इंटरैक्टिव वॉइस कार्ड (हवर करें या क्लिक करें)'
                : 'Interactive Voice Card (Hover or Click)'}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-amber-950 font-display">
            {isHi
              ? '“प्रिया मैडम के ढाई सौ रुपये उधार लिखो”'
              : '“Priya madam ke dhai sau rupaye udhaar likho”'}
          </h3>
          <p className="text-sm text-stone-600">
            {isHi
              ? 'कार्ड पर माउस ले जाएं और क्लिक करके हिंदी वॉइस कन्फ़र्मेशन सुनें।'
              : 'Hover over the visual card and click to trigger Hindi voice confirmation.'}
          </p>
        </div>
        <img
          src="/banner-chai-stall.svg"
          alt="ChaiKhata Interactive Voice Card"
          referrerPolicy="no-referrer"
          className="h-36 w-full sm:w-64 rounded-2xl border border-amber-900/15 object-cover shrink-0"
        />
      </div>
    </div>
  );
}
