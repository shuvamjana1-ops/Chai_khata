'use client';

import React, { useState } from 'react';
import {
  MorphingPopover,
  MorphingPopoverContent,
  MorphingPopoverTrigger,
} from '@/components/core/morphing-popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';

export interface MorphingPopoverBasicProps {
  isHi?: boolean;
  onApplyQuickRate?: (commandText: string) => void;
}

export function MorphingPopoverBasic({
  isHi = true,
  onApplyQuickRate,
}: MorphingPopoverBasicProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chaiRate, setChaiRate] = useState('₹10');
  const [samosaRate, setSamosaRate] = useState('₹15');
  const [milkPacket, setMilkPacket] = useState('20 Packet');
  const [safetyLimit, setSafetyLimit] = useState('₹5000');

  return (
    <MorphingPopover open={isOpen} onOpenChange={setIsOpen}>
      <MorphingPopoverTrigger asChild>
        <Button variant="outline" className="min-h-[46px] px-3.5 rounded-2xl">
          <motion.span
            layoutId="morphing-popover-basic-label"
            layout="position"
          >
            {isHi ? 'चाय रेट व सेटअप' : 'Chai Rate & Setup'}
          </motion.span>
        </Button>
      </MorphingPopoverTrigger>
      <MorphingPopoverContent className="w-80 right-0 p-4 shadow-xl">
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <motion.h4
              layoutId="morphing-popover-basic-label"
              layout="position"
              className="leading-none font-extrabold text-amber-950 font-display text-base"
            >
              {isHi ? 'चाय रेट व दुकान सेटअप' : 'Chai Rate & Dukaan Setup'}
            </motion.h4>
            <p className="text-stone-500 text-xs">
              {isHi
                ? 'दुकान के भाव और क्विक ऑर्डर लिमिट यहाँ से सेट करें।'
                : 'Dukaan ke bhaav aur quick order limit yahan se set karein.'}
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">{isHi ? 'चाय (Cup)' : 'Chai (Cup)'}</Label>
              <Input
                id="width"
                value={chaiRate}
                onChange={(e) => setChaiRate(e.target.value)}
                className="col-span-2 h-8"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxWidth">{isHi ? 'समोसा' : 'Samosa'}</Label>
              <Input
                id="maxWidth"
                value={samosaRate}
                onChange={(e) => setSamosaRate(e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="height">{isHi ? 'दूध ऑर्डर' : 'Doodh Order'}</Label>
              <Input
                id="height"
                value={milkPacket}
                onChange={(e) => setMilkPacket(e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxHeight">{isHi ? 'सेफ्टी गेट' : 'Safety Gate'}</Label>
              <Input
                id="maxHeight"
                value={safetyLimit}
                onChange={(e) => setSafetyLimit(e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
          </div>
          {onApplyQuickRate && (
            <Button
              type="button"
              onClick={() => {
                const numericChai = parseInt(chaiRate.replace(/\D/g, ''), 10) || 10;
                const numericSamosa = parseInt(samosaRate.replace(/\D/g, ''), 10) || 15;
                const total = numericChai * 2 + numericSamosa * 2;
                setIsOpen(false);
                onApplyQuickRate(
                  `Ramesh ke ${total} rupaye chai samosa ke udhaar likho`
                );
              }}
              className="w-full"
            >
              {isHi
                ? '2 चाय + 2 समोसा उधार जोड़ें'
                : '2 Chai + 2 Samosa Udhaar Jodein'}
            </Button>
          )}
        </div>
      </MorphingPopoverContent>
    </MorphingPopover>
  );
}
