import React, { useEffect, useState } from 'react';
import {
  KhataAlertIcon as AlertTriangle,
  KhataCheckIcon as Check,
  KhataMicIcon as Mic,
  KhataCrateIcon as ShoppingBag,
  KhataCheckIcon as UserCheck,
  KhataSpeakerIcon as Volume2,
  KhataCrossIcon as X,
  KhataArrowDownLeft as ArrowDownLeft,
  KhataArrowUpRight as ArrowUpRight,
  KhataAlertIcon as HelpCircle,
} from './ui/khata-icons';
import { Customer, VoiceParseResult } from '../types/ledger';
import {
  buildConfirmationSpeechHi,
  matchCustomerInLedger,
  requiresExtraSafetyConfirmation,
} from '../utils/voiceParser';
import { displayText } from '../utils/hinglish';
import { listenForYesNoReply, speakHindi, stopSpeaking } from '../utils/speech';

interface ConfirmationSheetProps {
  result: VoiceParseResult | null;
  customers: Customer[];
  language: 'hi' | 'en';
  onConfirm: (
    result: VoiceParseResult,
    resolvedCustomerIds: Record<number, string>
  ) => Promise<void>;
  onCancel: () => void;
  onRetryMic: () => void;
}

export const ConfirmationSheet: React.FC<ConfirmationSheetProps> = ({
  result,
  customers,
  language,
  onConfirm,
  onCancel,
  onRetryMic,
}) => {
  const [resolvedCustomers, setResolvedCustomers] = useState<Record<number, string>>({});
  const [highAmountConfirmed, setHighAmountConfirmed] = useState(false);
  const [isListeningReply, setIsListeningReply] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isHi = language === 'hi';

  useEffect(() => {
    if (!result) return;
    setHighAmountConfirmed(false);
    setIsSaving(false);

    // Pre-populate unambiguous customer matches
    const initialMap: Record<number, string> = {};
    result.actions.forEach((act, idx) => {
      if (act.customer) {
        const match = matchCustomerInLedger(act.customer, customers);
        if (match.status === 'EXACT' && match.matchedCustomer) {
          initialMap[idx] = match.matchedCustomer.id;
        } else if (match.status === 'AMBIGUOUS' && match.candidates.length > 0) {
          initialMap[idx] = match.candidates[0].id;
        }
      }
    });
    setResolvedCustomers(initialMap);

    const speechText = buildConfirmationSpeechHi(result, customers);
    let stopListener: (() => void) | null = null;

    speakHindi(speechText, () => {
      if (!result.needs_clarification) {
        stopListener = listenForYesNoReply({
          onYes: () => {
            if (!requiresExtraSafetyConfirmation(result.actions)) {
              handleApprove(initialMap);
            }
          },
          onNo: () => {
            onCancel();
          },
          onStatusChange: setIsListeningReply,
        });
      }
    });

    return () => {
      stopSpeaking();
      stopListener?.();
    };
  }, [result]);

  if (!result) return null;

  const needsHighValueSafety = requiresExtraSafetyConfirmation(result.actions);
  const isQueryOnly =
    !result.needs_clarification &&
    result.actions.length > 0 &&
    result.actions.every((a) => a.intent === 'QUERY_BALANCE' || a.intent === 'LIST_PENDING');

  const handleApprove = async (overrideMap?: Record<number, string>) => {
    if (isSaving) return;
    if (needsHighValueSafety && !highAmountConfirmed) return;
    setIsSaving(true);
    stopSpeaking();
    await onConfirm(result, overrideMap || resolvedCustomers);
    setIsSaving(false);
  };

  const handleReplaySpeech = () => {
    const speechText = buildConfirmationSpeechHi(result, customers);
    speakHindi(speechText);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-sheet-title"
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl khata-modal overflow-hidden max-h-[92vh] flex flex-col">
        {/* Grab handle */}
        <div className="w-12 h-1.5 bg-amber-900/25 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-amber-900/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2
              id="confirmation-sheet-title"
              className="text-xl font-bold text-amber-950 font-display"
            >
              {result.needs_clarification
                ? isHi
                  ? 'थोड़ा साफ़ बताइए'
                  : 'Thoda Saaf Bataiye'
                : isQueryOnly
                  ? isHi
                    ? 'खाता जानकारी (हिसाब)'
                    : 'Khata Jaankari (Hisaab)'
                  : isHi
                    ? 'क्या यह सही है? पुष्टि करें'
                    : 'Kya Yeh Sahi Hai? Confirm Karein'}
            </h2>
            {result.transcript && (
              <p className="text-sm text-stone-600 mt-0.5">
                {isHi ? 'आपने बोला:' : 'Aapne bola:'} &ldquo;
                {displayText(result.transcript, isHi)}&rdquo;
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleReplaySpeech}
            aria-label={isHi ? 'फिर से सुनें' : 'Phir se sunein'}
            className="min-h-[48px] min-w-[48px] px-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-sm flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
          >
            <Volume2 className="w-5 h-5 text-amber-800" />
            <span className="whitespace-nowrap">{isHi ? 'सुनें' : 'Sunein'}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {result.needs_clarification ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-200/70 text-amber-900 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>
              <p className="text-xl font-bold text-amber-950">
                {displayText(result.clarification_question_hi, isHi)}
              </p>
              <p className="text-base text-stone-600">
                {isHi
                  ? 'उदाहरण: "रमेश के 40 रुपये उधार लिखो"'
                  : 'Udaharan: "Ramesh ke 40 rupaye udhaar likho"'}
              </p>
            </div>
          ) : (
            result.actions.map((action, idx) => {
              const match = matchCustomerInLedger(action.customer, customers);
              const selectedCustId = resolvedCustomers[idx];
              const selectedCust =
                customers.find((c) => c.id === selectedCustId) || match.matchedCustomer;

              if (action.intent === 'ADD_CREDIT' || action.intent === 'RECEIVE_PAYMENT') {
                const isCredit = action.intent === 'ADD_CREDIT';
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-5 border-2 ${
                      isCredit
                        ? 'bg-white border-red-200'
                        : 'bg-white border-emerald-200'
                    } shadow-sm space-y-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="w-7 h-7" />
                          ) : (
                            <ArrowDownLeft className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-stone-600">
                            {isCredit
                              ? isHi
                                ? 'उधार लिखना है (देना बाकी)'
                                : 'Udhaar Likhna Hai (Dena Baaki)'
                              : isHi
                                ? 'पैसा मिला (जमा)'
                                : 'Paisa Mila (Jama)'}
                          </div>
                          <div className="text-2xl font-extrabold text-stone-900 font-display">
                            {selectedCust
                              ? isHi
                                ? selectedCust.nameHi
                                : selectedCust.name
                              : displayText(
                                  action.customer || (isHi ? 'नया ग्राहक' : 'Naya Grahak'),
                                  isHi
                                )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-3xl font-extrabold font-mono tabular-nums ${
                            isCredit ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{action.amount ?? 0}
                        </div>
                        <div className="text-xs font-medium text-stone-500">
                          {isCredit
                            ? isHi
                              ? 'उधार जोड़ें'
                              : 'Udhaar Jodein'
                            : isHi
                              ? 'बाकी घटेगा'
                              : 'Baaki Ghatega'}
                        </div>
                      </div>
                    </div>

                    {action.item && (
                      <div className="text-sm text-stone-600 pt-1 border-t border-stone-100">
                        {isHi ? 'सामान / नोट:' : 'Samaan / Note:'}{' '}
                        <strong>{displayText(action.item, isHi)}</strong>
                      </div>
                    )}

                    {/* Ambiguous customer selector or customer status */}
                    {match.status === 'AMBIGUOUS' && match.candidates.length > 1 && (
                      <div className="pt-2 border-t border-amber-200 space-y-2">
                        <p className="text-sm font-bold text-amber-900">
                          {isHi ? 'कौन सा ग्राहक चुनें?' : 'Kaun sa grahak chunein?'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {match.candidates.map((cand) => (
                            <button
                              key={cand.id}
                              type="button"
                              onClick={() =>
                                setResolvedCustomers((prev) => ({ ...prev, [idx]: cand.id }))
                              }
                              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
                                selectedCustId === cand.id
                                  ? 'bg-amber-900 text-white border-amber-900'
                                  : 'bg-amber-50 text-amber-950 border-amber-300'
                              }`}
                            >
                              {isHi ? cand.nameHi : cand.name} ({isHi ? 'बाकी' : 'Baaki'} ₹
                              {cand.balance})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCust && (
                      <div className="flex items-center justify-between text-sm text-stone-600 bg-stone-50 rounded-xl px-3.5 py-2">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-700" />
                          {isHi ? 'पहले का बाकी:' : 'Pehle ka Baaki:'}{' '}
                          <strong className="font-mono tabular-nums">₹{selectedCust.balance}</strong>
                        </span>
                        <span>
                          {isHi ? 'नया बाकी:' : 'Naya Baaki:'}{' '}
                          <strong className="font-mono tabular-nums text-stone-900">
                            ₹
                            {isCredit
                              ? selectedCust.balance + (action.amount || 0)
                              : Math.max(0, selectedCust.balance - (action.amount || 0))}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              }

              if (action.intent === 'ADD_ORDER_ITEM') {
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-5 bg-white border-2 border-amber-300 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-amber-800">
                          {displayText(
                            action.forDate || (isHi ? 'कल सुबह' : 'Kal Subah'),
                            isHi
                          )}
                        </div>
                        <div className="text-2xl font-extrabold text-stone-900 font-display">
                          {displayText(
                            action.item || (isHi ? 'सामान' : 'Samaan'),
                            isHi
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-950">
                        {action.quantity ?? 1}{' '}
                        {displayText(action.unit || 'पैकेट', isHi)}
                      </div>
                      <div className="text-xs text-stone-500">
                        {isHi ? 'सप्लायर लिस्ट में जुड़ेगा' : 'Supplier list mein judega'}
                      </div>
                    </div>
                  </div>
                );
              }

              if (action.intent === 'QUERY_BALANCE') {
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-5 bg-white border-2 border-amber-300 shadow-sm space-y-2"
                  >
                    <div className="text-sm font-semibold text-stone-600">
                      {isHi ? 'ग्राहक का कुल बाकी हिसाब:' : 'Grahak ka Kul Baaki Hisaab:'}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-extrabold text-stone-900">
                        {selectedCust
                          ? isHi
                            ? selectedCust.nameHi
                            : selectedCust.name
                          : displayText(action.customer, isHi)}
                      </span>
                      <span className="text-3xl font-extrabold font-mono tabular-nums text-red-700">
                        ₹{selectedCust ? selectedCust.balance : 0}
                      </span>
                    </div>
                  </div>
                );
              }

              if (action.intent === 'LIST_PENDING') {
                const topPending = [...customers]
                  .filter((c) => c.balance > 0)
                  .sort((a, b) => b.balance - a.balance);
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-5 bg-white border-2 border-amber-300 shadow-sm space-y-3"
                  >
                    <div className="text-base font-bold text-amber-950">
                      {isHi ? 'आज के बाकीदार ग्राहक:' : 'Aaj ke Baakidaar Grahak:'}
                    </div>
                    <div className="divide-y divide-stone-100">
                      {topPending.map((c) => (
                        <div key={c.id} className="py-2 flex items-center justify-between">
                          <span className="font-bold text-stone-800">
                            {isHi ? c.nameHi : c.name}
                          </span>
                          <span className="font-mono font-bold tabular-nums text-red-700">
                            ₹{c.balance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}

          {/* Extra safety confirmation for amounts above ₹5,000 */}
          {needsHighValueSafety && !result.needs_clarification && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-400 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-7 h-7 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-extrabold text-red-900">
                    {isHi
                      ? 'सुरक्षा जांच: ₹5,000 से बड़ी रकम!'
                      : 'Suraksha Jaanch: ₹5,000 se Badi Rakam!'}
                  </h3>
                  <p className="text-sm text-red-800">
                    {isHi
                      ? 'गलती से बचने के लिए कृपया नीचे टिक करके पुष्टि करें।'
                      : 'Galti se bachne ke liye kripya neeche tick karke confirm karein.'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-3 min-h-[48px] px-3 py-2 rounded-xl bg-white border border-red-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highAmountConfirmed}
                  onChange={(e) => setHighAmountConfirmed(e.target.checked)}
                  className="w-6 h-6 accent-red-700 rounded"
                />
                <span className="text-base font-bold text-red-950">
                  {isHi
                    ? 'हाँ, मैंने रकम (₹5,000+) दोबारा जांच ली है'
                    : 'Haan, maine rakam (₹5,000+) dobara jaanch li hai'}
                </span>
              </label>
            </div>
          )}

          {isListeningReply && !result.needs_clarification && (
            <div className="text-center text-sm font-semibold text-amber-900 bg-amber-100/80 py-2 px-3 rounded-xl">
              {isHi
                ? 'बोलिए "हाँ" या "नहीं" : या नीचे बटन दबाएं'
                : 'Boliye "Haan" ya "Nahi" : ya neeche button dabayein'}
            </div>
          )}
        </div>

        {/* Footer Action Buttons (Minimum 56px height) */}
        <div className="p-4 bg-white border-t border-amber-900/10 shrink-0">
          {result.needs_clarification ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[60px] rounded-2xl border-2 border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <X className="w-6 h-6" />
                <span className="whitespace-nowrap">{isHi ? 'बंद करें' : 'Band Karein'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  onRetryMic();
                }}
                className="min-h-[60px] rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98"
              >
                <Mic className="w-6 h-6" />
                <span className="whitespace-nowrap">{isHi ? 'दोबारा बोलें' : 'Dobara Bolein'}</span>
              </button>
            </div>
          ) : isQueryOnly ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full min-h-[60px] rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98"
            >
              <Check className="w-6 h-6" />
              <span className="whitespace-nowrap">{isHi ? 'ठीक है ✅' : 'Theek Hai ✅'}</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[64px] rounded-2xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-900 font-extrabold text-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <span className="whitespace-nowrap">{isHi ? 'नहीं ❌' : 'Nahi ❌'}</span>
              </button>
              <button
                type="button"
                disabled={isSaving || (needsHighValueSafety && !highAmountConfirmed)}
                onClick={() => handleApprove()}
                className={`min-h-[64px] rounded-2xl font-extrabold text-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 ${
                  needsHighValueSafety && !highAmountConfirmed
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                <span className="whitespace-nowrap">
                  {isSaving
                    ? isHi
                      ? 'सेव हो रहा...'
                      : 'Save ho raha...'
                    : isHi
                      ? 'हाँ ✅'
                      : 'Haan ✅'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
