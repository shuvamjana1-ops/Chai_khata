import React, { useState } from 'react';
import { Sparkles, Volume2, ArrowUpRight, ShoppingBag } from 'lucide-react';

export interface LiquidGlassDisplayProps {
  isHi: boolean;
  totalMarketPending: number;
  todayCreditGiven: number;
  todayPaymentReceived: number;
  pendingOrdersCount: number;
  onQuickVoiceCommand: (commandText: string) => void;
  onSpeakSummary: () => void;
}

export const LiquidGlassDisplay: React.FC<LiquidGlassDisplayProps> = ({
  isHi,
  totalMarketPending,
  todayCreditGiven,
  todayPaymentReceived,
  pendingOrdersCount,
  onQuickVoiceCommand,
  onSpeakSummary,
}) => {
  const [glarePos, setGlarePos] = useState({ x: 35, y: 25 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setGlarePos({ x, y });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      role="region"
      aria-label={isHi ? 'लिक्विड ग्लास डिस्प्ले' : 'Liquid Glass Display'}
      style={{
        backgroundImage: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.45) 38%, rgba(254, 243, 199, 0.52) 75%, rgba(253, 230, 138, 0.48) 100%)`,
      }}
      className="relative overflow-hidden rounded-3xl liquid-glass p-4 sm:p-5 transition-all duration-200"
    >
      {/* Refractive Specular Top Edge Bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95"
      />
      {/* Ambient Liquid Prism Glow Blobs inside the glass display */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br from-amber-300/45 via-orange-300/30 to-rose-300/25 blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-gradient-to-tr from-emerald-300/35 via-teal-200/25 to-amber-200/30 blur-xl"
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {isHi
                ? 'लिक्विड ग्लास स्मार्ट डिस्प्ले · लाइव हिसाब लेंस'
                : 'Liquid Glass Smart Display · Live Hisaab Lens'}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
              ₹{totalMarketPending}
              <span className="ml-1.5 text-xs font-sans font-bold text-amber-900">
                {isHi ? 'मार्केट बाकी' : 'Market Baaki'}
              </span>
            </div>
            <div className="text-xs font-bold text-stone-700 flex items-center gap-2">
              <span className="text-red-800 font-mono tabular-nums">
                +₹{todayCreditGiven} {isHi ? 'आज उधार' : 'Udhaar'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-800 font-mono tabular-nums">
                -₹{todayPaymentReceived} {isHi ? 'आज जमा' : 'Jama'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-950 font-mono tabular-nums">
                {pendingOrdersCount} {isHi ? 'ऑर्डर' : 'Orders'}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Liquid Glass Capsule Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onQuickVoiceCommand('Ramesh ke 30 rupaye chai biscuit ke udhaar likho')
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl liquid-glass-subtle hover:bg-white/80 text-stone-900 font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4 text-red-700" />
            <span>{isHi ? 'क्विक ₹30 चाय-बिस्कुट' : 'Quick ₹30 Chai-Biscuit'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onQuickVoiceCommand('Kal subah 10 packet doodh mangwao')
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl liquid-glass-subtle hover:bg-white/80 text-stone-900 font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 text-amber-800" />
            <span>{isHi ? '+10 पैकेट दूध' : '+10 Packet Doodh'}</span>
          </button>

          <button
            type="button"
            onClick={onSpeakSummary}
            aria-label={isHi ? 'ग्लास डिस्प्ले हिसाब सुनें' : 'Glass display hisaab sunein'}
            className="min-h-[44px] px-3 py-2 rounded-2xl liquid-glass-subtle hover:bg-white/80 text-amber-950 font-extrabold text-xs flex items-center gap-1 transition-transform active:scale-95 whitespace-nowrap"
          >
            <Volume2 className="w-4 h-4 text-amber-800" />
            <span>{isHi ? 'सुनें' : 'Sunein'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
