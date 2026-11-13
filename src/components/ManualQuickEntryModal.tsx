import React, { useState } from 'react';
import { Delete, X, Check } from 'lucide-react';
import { Customer, VoiceParseResult } from '../types/ledger';

interface ManualQuickEntryModalProps {
  isOpen: boolean;
  customers: Customer[];
  language: 'hi' | 'en';
  onClose: () => void;
  onSubmitToConfirmation: (result: VoiceParseResult) => void;
}

export const ManualQuickEntryModal: React.FC<ManualQuickEntryModalProps> = ({
  isOpen,
  customers,
  language,
  onClose,
  onSubmitToConfirmation,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    customers[0]?.name || 'Ramesh'
  );
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [entryType, setEntryType] = useState<'ADD_CREDIT' | 'RECEIVE_PAYMENT'>('ADD_CREDIT');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');

  if (!isOpen) return null;

  const isHi = language === 'hi';
  const amountNum = Number(amountStr) || 0;
  const activeCustomerName = isNewCustomer ? customCustomerName.trim() : selectedCustomer;

  const handleDigit = (digit: string) => {
    if (amountStr.length >= 6) return;
    if (amountStr === '0') {
      setAmountStr(digit);
    } else {
      setAmountStr((prev) => prev + digit);
    }
  };

  const handleQuickAdd = (val: number) => {
    setAmountStr(String((Number(amountStr) || 0) + val));
  };

  const handleBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomerName || amountNum <= 0) return;

    const custObj = customers.find((c) => c.name === activeCustomerName);
    const displayHi = custObj?.nameHi || activeCustomerName;

    const result: VoiceParseResult = {
      transcript:
        entryType === 'ADD_CREDIT'
          ? `${displayHi} के ₹${amountNum} उधार (हाथ से लिखा)`
          : `${displayHi} से ₹${amountNum} जमा मिले (हाथ से लिखा)`,
      actions: [
        {
          intent: entryType,
          customer: activeCustomerName,
          amount: amountNum,
          item: note.trim() || null,
          quantity: null,
          unit: null,
          forDate: null,
        },
      ],
      needs_clarification: false,
      clarification_question_hi: '',
    };

    setAmountStr('');
    setNote('');
    onClose();
    onSubmitToConfirmation(result);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-entry-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FAF6F0] border-t-2 sm:border-2 border-amber-900/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-amber-900/10 flex items-center justify-between">
          <h2 id="manual-entry-title" className="text-xl font-bold text-amber-950 font-display">
            {isHi ? 'बिना बोले तेज़ एंट्री (नंबर पैड)' : 'Quick Manual Entry (Keypad)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isHi ? 'बंद करें' : 'Close'}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleContinue} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. Entry Type Toggle */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-stone-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setEntryType('ADD_CREDIT')}
              className={`min-h-[52px] rounded-xl font-bold text-base transition-colors ${
                entryType === 'ADD_CREDIT'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-stone-700 hover:text-stone-950'
              }`}
            >
              {isHi ? 'उधार दिया (बाकी +)' : 'Give Credit (+)'}
            </button>
            <button
              type="button"
              onClick={() => setEntryType('RECEIVE_PAYMENT')}
              className={`min-h-[52px] rounded-xl font-bold text-base transition-colors ${
                entryType === 'RECEIVE_PAYMENT'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-700 hover:text-stone-950'
              }`}
            >
              {isHi ? 'पैसा मिला (जमा -)' : 'Payment Received (-)'}
            </button>
          </div>

          {/* 2. Customer Selector Buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-stone-700">
              {isHi ? '1. ग्राहक चुनें:' : '1. Select Customer:'}
            </label>
            <div className="flex flex-wrap gap-2">
              {customers.map((c) => {
                const active = !isNewCustomer && selectedCustomer === c.name;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(false);
                      setSelectedCustomer(c.name);
                    }}
                    className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base border transition-colors ${
                      active
                        ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                        : 'bg-white text-stone-800 border-stone-300 hover:bg-amber-50'
                    }`}
                  >
                    {isHi ? c.nameHi : c.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base border transition-colors ${
                  isNewCustomer
                    ? 'bg-amber-900 text-white border-amber-900'
                    : 'bg-amber-100/70 text-amber-950 border-amber-300'
                }`}
              >
                + {isHi ? 'नया नाम' : 'New Name'}
              </button>
            </div>

            {isNewCustomer && (
              <input
                type="text"
                value={customCustomerName}
                onChange={(e) => setCustomCustomerName(e.target.value)}
                placeholder={isHi ? 'ग्राहक का नाम लिखें...' : 'Enter customer name...'}
                aria-label={isHi ? 'ग्राहक का नाम' : 'Customer Name'}
                className="w-full min-h-[52px] px-4 rounded-xl bg-white border-2 border-amber-400 text-lg font-bold text-stone-900 focus:outline-none focus:border-amber-800"
              />
            )}
          </div>

          {/* 3. Amount Display + Quick Add Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white border-2 border-amber-900/20 rounded-2xl px-4 py-3">
              <span className="text-base font-bold text-stone-600">
                {isHi ? 'रकम (₹):' : 'Amount (₹):'}
              </span>
              <span
                className={`text-4xl font-extrabold font-mono tabular-nums ${
                  entryType === 'ADD_CREDIT' ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                ₹{amountStr || '0'}
              </span>
            </div>

            {/* Quick Rupee Chips */}
            <div className="grid grid-cols-5 gap-2">
              {[10, 20, 40, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="min-h-[44px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold font-mono text-base transition-transform active:scale-95"
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="min-h-[54px] rounded-2xl bg-white border border-stone-300 hover:bg-stone-100 text-2xl font-extrabold font-mono text-stone-900 shadow-xs active:scale-95 transition-transform"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                aria-label={isHi ? 'मिटाएं' : 'Backspace'}
                className="min-h-[54px] rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-900 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Delete className="w-7 h-7" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!activeCustomerName || amountNum <= 0}
            className={`w-full min-h-[60px] rounded-2xl font-extrabold text-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 ${
              !activeCustomerName || amountNum <= 0
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-amber-800 hover:bg-amber-900 text-white'
            }`}
          >
            <Check className="w-6 h-6" />
            <span>
              {isHi
                ? `आगे बढ़ें (₹${amountNum})`
                : `Continue (₹${amountNum})`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
