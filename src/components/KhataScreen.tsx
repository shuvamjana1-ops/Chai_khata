import React, { useState } from 'react';
import {
  KhataBellIcon as BellRing,
  KhataCheckIcon as Check,
  KhataCopyIcon as Copy,
  KhataEditIcon as Edit3,
  KhataExternalIcon as ExternalLink,
  KhataChatIcon as MessageCircle,
  KhataPlusIcon as Plus,
  KhataSearchIcon as Search,
  KhataTrashIcon as Trash2,
  KhataUserPlusIcon as UserPlus,
  KhataSpeakerIcon as Volume2,
  KhataCrossIcon as X,
} from './ui/khata-icons';
import { AppSettings, Customer, Transaction, VoiceParseResult } from '../types/ledger';
import { buildWhatsAppReminder } from '../utils/voiceParser';
import { displayText } from '../utils/hinglish';
import { speakHindi } from '../utils/speech';
import { AnimatedList } from './ui/animated-list';

interface KhataScreenProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: AppSettings;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onEditTransaction: (txId: string, newAmount: number, newNote: string) => Promise<void>;
  onAddCustomer: (name: string, nameHi: string, phone: string) => Promise<void>;
  onQuickEntryForCustomer: (result: VoiceParseResult) => void;
}

export const KhataScreen: React.FC<KhataScreenProps> = ({
  customers,
  transactions,
  settings,
  onDeleteTransaction,
  onEditTransaction,
  onAddCustomer,
  onQuickEntryForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [reminderCustomer, setReminderCustomer] = useState<Customer | null>(null);
  const [copiedState, setCopiedState] = useState<'none' | 'upi' | 'msg'>('none');

  // Edit transaction state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  // New customer modal state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const isHi = settings.language === 'hi';

  const filteredCustomers = customers
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.nameHi.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.balance - a.balance);

  const topPendingForReminder = customers
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);

  const totalPending = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);

  const activeSelectedCustomer = selectedCustomer
    ? customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer
    : null;

  const customerTransactions = activeSelectedCustomer
    ? transactions
        .filter((t) => t.customerId === activeSelectedCustomer.id)
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const handleCopyText = async (text: string, type: 'upi' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedState(type);
    setTimeout(() => setCopiedState('none'), 2500);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    await onAddCustomer(newCustName.trim(), newCustName.trim(), newCustPhone.trim() || '9800000000');
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomer(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Summary & Evening Auto-Reminder Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-xl khata-banner p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-amber-200">
              {isHi ? 'कुल मार्केट बाकी (उधार)' : 'Kul Market Baaki (Udhaar)'}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-1">
              ₹{totalPending}
            </div>
            <div className="text-xs text-amber-200/90 mt-1">
              {customers.filter((c) => c.balance > 0).length}{' '}
              {isHi ? 'ग्राहकों पर बाकी है' : 'grahakon par baaki hai'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const summaryHi =
                topPendingForReminder.length > 0
                  ? `कुल बाकी ${totalPending} रुपये है। सबसे ज़्यादा बाकी: ` +
                    topPendingForReminder.map((c) => `${c.nameHi} पर ${c.balance} रुपये`).join(', ')
                  : 'आज किसी भी ग्राहक पर उधार बाकी नहीं है।';
              speakHindi(summaryHi);
            }}
            aria-label={isHi ? 'कुल बाकी सुनें' : 'Kul baaki sunein'}
            className="min-h-[52px] px-4 rounded-lg bg-[#E5B869] hover:bg-[#D9A752] text-[#3E160C] font-extrabold text-base flex items-center gap-2 transition-transform active:scale-95"
          >
            <Volume2 className="w-5 h-5" />
            <span className="whitespace-nowrap">{isHi ? 'सुनें' : 'Sunein'}</span>
          </button>
        </div>

        {/* Evening Reminder Suggestion Card */}
        {topPendingForReminder.length > 0 && (
          <div className="lg:col-span-7 rounded-xl khata-sheet p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
                <BellRing className="w-5 h-5 text-amber-700 shrink-0" />
                <span>
                  {isHi
                    ? 'आज इन ग्राहकों को WhatsApp रिमाइंडर भेजें?'
                    : 'Aaj in grahakon ko WhatsApp reminder bhejein?'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPendingForReminder.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setReminderCustomer(c)}
                  className="min-h-[46px] px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <span>{isHi ? c.nameHi : displayText(c.name, isHi)}</span>
                  <span className="font-mono tabular-nums text-red-700">₹{c.balance}</span>
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Add Customer Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-6 h-6 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isHi
                ? 'ग्राहक का नाम खोजें (जैसे: रमेश / Ramesh)...'
                : 'Grahak ka naam khojein (jaise: Ramesh / Suresh)...'
            }
            aria-label={isHi ? 'ग्राहक खोजें' : 'Grahak khojein'}
            className="w-full min-h-[56px] pl-12 pr-4 rounded-2xl bg-white border-2 border-amber-900/15 text-lg font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-800"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="min-h-[56px] px-5 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-base flex items-center justify-center gap-2 shrink-0 shadow-xs transition-transform active:scale-98"
        >
          <UserPlus className="w-5 h-5" />
          <span className="whitespace-nowrap">
            {isHi ? 'नया ग्राहक जोड़ें' : 'Naya Grahak Jodein'}
          </span>
        </button>
      </div>

      {/* Customer Ledger List with AnimatedList */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl bg-white border border-amber-900/15 p-8 text-center text-stone-500">
          <p className="text-lg font-semibold">
            {isHi ? 'कोई ग्राहक नहीं मिला' : 'Koi grahak nahi mila'}
          </p>
        </div>
      ) : (
        <AnimatedList
          items={filteredCustomers}
          maxVisible={20}
          gap={12}
          animation="scale"
          renderItem={(customer) => {
            const owesMoney = customer.balance > 0;
            const customerDisplayName = isHi
              ? customer.nameHi
              : displayText(customer.name, isHi);
            return (
              <div className="rounded-xl khata-sheet p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6F1E6] transition-colors">
                {/* Left clickable customer info to view history */}
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className="flex items-center justify-between sm:justify-start gap-4 text-left flex-1 min-h-[56px]"
                >
                  <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-950 font-extrabold text-xl flex items-center justify-center shrink-0">
                    {customerDisplayName.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-extrabold text-stone-900 truncate font-display">
                      {customerDisplayName}
                    </div>
                    <div className="text-sm text-stone-500 flex items-center gap-2">
                      <span>{customer.phone}</span>
                      <span aria-hidden="true">·</span>
                      <span className="underline text-amber-900 font-semibold">
                        {isHi ? 'पूरा हिसाब देखें' : 'Poora Hisaab Dekhein'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right sm:ml-6">
                    <div
                      className={`text-2xl font-extrabold font-mono tabular-nums ${
                        owesMoney ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      ₹{customer.balance}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        owesMoney ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {owesMoney
                        ? isHi
                          ? 'बाकी है'
                          : 'Baaki Hai'
                        : isHi
                          ? 'हिसाब बराबर'
                          : 'Hisaab Barabar'}
                    </div>
                  </div>
                </button>

                {/* Right Reminder & Quick Entry Actions */}
                <div className="flex items-center gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setReminderCustomer(customer)}
                    disabled={customer.balance <= 0}
                    aria-label={`${customerDisplayName} ${
                      isHi ? 'को रिमाइंडर भेजो' : 'ko reminder bhejo'
                    }`}
                    className={`flex-1 sm:flex-initial min-h-[52px] px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                      customer.balance > 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">
                      {isHi ? 'रिमाइंडर भेजो' : 'Reminder Bhejo'}
                    </span>
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      {/* Modal 1: UPI + WhatsApp Payment Reminder Modal */}
      {reminderCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-modal-title"
        >
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl khata-modal overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-amber-900/10 flex items-center justify-between">
              <h3 id="reminder-modal-title" className="text-xl font-bold text-amber-950 font-display">
                {isHi ? 'WhatsApp व UPI पेमेंट रिमाइंडर' : 'WhatsApp & UPI Payment Reminder'}
              </h3>
              <button
                type="button"
                onClick={() => setReminderCustomer(null)}
                aria-label={isHi ? 'बंद करें' : 'Band karein'}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-200 flex items-center justify-center text-stone-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {(() => {
              const reminderData = buildWhatsAppReminder({
                customerNameHi: reminderCustomer.nameHi,
                customerName: reminderCustomer.name,
                phone: reminderCustomer.phone,
                amount: reminderCustomer.balance,
                shopName: settings.shopName,
                upiId: settings.ownerUpiId,
                isHi,
              });

              return (
                <div className="p-5 overflow-y-auto space-y-4">
                  <div className="rounded-2xl bg-white border border-amber-200 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-stone-500">
                        {isHi ? 'ग्राहक:' : 'Grahak:'}
                      </div>
                      <div className="text-xl font-extrabold text-stone-900">
                        {isHi ? reminderCustomer.nameHi : reminderCustomer.name} ({reminderCustomer.phone})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-stone-500">{isHi ? 'कुल बाकी:' : 'Kul Baaki:'}</div>
                      <div className="text-2xl font-extrabold font-mono tabular-nums text-red-700">
                        ₹{reminderCustomer.balance}
                      </div>
                    </div>
                  </div>

                  {/* Polite Hindi/Hinglish Message Preview */}
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-stone-700">
                      {isHi
                        ? 'विनम्र हिंदी संदेश (WhatsApp Preview):'
                        : 'Polite Hinglish Sandesh (WhatsApp Preview):'}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-base bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-stone-800 leading-relaxed">
                      {reminderData.activeMessage}
                    </pre>
                  </div>

                  {/* Generated UPI Deep Link */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-stone-600">
                      {isHi
                        ? 'UPI Deep Link (सुरक्षित लिंक — ऐप खुद पैसे नहीं काटता):'
                        : 'UPI Deep Link (Surakshit Link — App khud paise nahi kaatta):'}
                    </div>
                    <div className="p-3 rounded-xl bg-stone-100 font-mono text-xs text-stone-700 break-all">
                      {reminderData.upiLink}
                    </div>
                  </div>

                  {/* Primary Action: Open WhatsApp + Copy Link Fallback */}
                  <div className="space-y-2.5 pt-2">
                    <a
                      href={reminderData.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[60px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98"
                    >
                      <MessageCircle className="w-6 h-6" />
                      <span>
                        {isHi ? 'WhatsApp पर रिमाइंडर भेजें' : 'WhatsApp par Reminder Bhejein'}
                      </span>
                      <ExternalLink className="w-4 h-4 opacity-80" />
                    </a>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleCopyText(reminderData.upiLink, 'upi')}
                        className="min-h-[52px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-sm flex items-center justify-center gap-2"
                      >
                        {copiedState === 'upi' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-700" />
                            <span>{isHi ? 'UPI लिंक कॉपी हुआ!' : 'UPI Link Copy Hua!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>{isHi ? 'UPI लिंक कॉपी करें' : 'UPI Link Copy Karein'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(reminderData.activeMessage, 'msg')}
                        className="min-h-[52px] rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold text-sm flex items-center justify-center gap-2"
                      >
                        {copiedState === 'msg' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-700" />
                            <span>{isHi ? 'संदेश कॉपी हुआ!' : 'Sandesh Copy Hua!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>{isHi ? 'पूरा संदेश कॉपी करें' : 'Poora Sandesh Copy Karein'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal 2: Customer Transaction History + Edit/Delete */}
      {activeSelectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-history-title"
        >
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl khata-modal overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-amber-900/10 flex items-center justify-between">
              <div>
                <h3
                  id="customer-history-title"
                  className="text-xl font-extrabold text-amber-950 font-display"
                >
                  {isHi ? activeSelectedCustomer.nameHi : activeSelectedCustomer.name} :{' '}
                  {isHi ? 'खाता इतिहास' : 'Khata Itihaas'}
                </h3>
                <p className="text-sm font-bold text-red-700 font-mono tabular-nums">
                  {isHi ? 'कुल बाकी:' : 'Kul Baaki:'} ₹{activeSelectedCustomer.balance}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setEditingTxId(null);
                }}
                aria-label={isHi ? 'बंद करें' : 'Band karein'}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-200 flex items-center justify-center text-stone-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick +Udhaar / +Jama buttons for this customer */}
            <div className="px-5 py-3 bg-amber-100/60 border-b border-amber-900/10 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const cust = activeSelectedCustomer;
                  setSelectedCustomer(null);
                  onQuickEntryForCustomer({
                    transcript: `${cust.nameHi} के 40 रुपये उधार लिखो`,
                    actions: [
                      {
                        intent: 'ADD_CREDIT',
                        customer: cust.name,
                        amount: 40,
                        item: 'चाय व नाश्ता',
                        quantity: null,
                        unit: null,
                        forDate: null,
                      },
                    ],
                    needs_clarification: false,
                    clarification_question_hi: '',
                  });
                }}
                className="min-h-[48px] rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isHi ? '+ ₹40 उधार जोड़ें' : '+ ₹40 Udhaar Jodein'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const cust = activeSelectedCustomer;
                  setSelectedCustomer(null);
                  onQuickEntryForCustomer({
                    transcript: `${cust.nameHi} ने 100 रुपये दिए`,
                    actions: [
                      {
                        intent: 'RECEIVE_PAYMENT',
                        customer: cust.name,
                        amount: 100,
                        item: 'नकद जमा',
                        quantity: null,
                        unit: null,
                        forDate: null,
                      },
                    ],
                    needs_clarification: false,
                    clarification_question_hi: '',
                  });
                }}
                className="min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isHi ? '+ ₹100 जमा लिखें' : '+ ₹100 Jama Likhein'}</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {customerTransactions.length === 0 ? (
                <p className="text-center text-stone-500 py-6">
                  {isHi ? 'अभी कोई एंट्री नहीं है।' : 'Abhi koi entry nahi hai.'}
                </p>
              ) : (
                customerTransactions.map((tx) => {
                  const isEditing = editingTxId === tx.id;
                  return (
                    <div
                      key={tx.id}
                      className="rounded-2xl bg-white border border-stone-200 p-4 space-y-2 shadow-2xs"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-bold text-stone-600">
                                {isHi ? 'रकम (₹)' : 'Rakam (₹)'}
                              </label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full min-h-[44px] px-3 rounded-xl border border-amber-400 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-stone-600">
                                {isHi ? 'विवरण' : 'Note'}
                              </label>
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                className="w-full min-h-[44px] px-3 rounded-xl border border-amber-400"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const amt = Number(editAmount);
                                if (amt > 0) {
                                  await onEditTransaction(tx.id, amt, editNote);
                                  setEditingTxId(null);
                                }
                              }}
                              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white font-bold text-sm"
                            >
                              {isHi ? 'सेव करें' : 'Save Karein'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTxId(null)}
                              className="min-h-[44px] px-4 rounded-xl bg-stone-200 text-stone-800 font-bold text-sm"
                            >
                              {isHi ? 'रद्द करें' : 'Radd Karein'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-bold text-stone-900">
                              {tx.type === 'CREDIT'
                                ? isHi
                                  ? 'उधार दिया'
                                  : 'Udhaar Diya'
                                : isHi
                                  ? 'पैसा मिला (जमा)'
                                  : 'Paisa Mila (Jama)'}
                            </div>
                            <div className="text-sm text-stone-600">
                              {displayText(tx.note, isHi)}
                            </div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              {new Date(tx.createdAt).toLocaleTimeString(
                                isHi ? 'hi-IN' : 'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xl font-extrabold font-mono tabular-nums mr-2 ${
                                tx.type === 'CREDIT' ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTxId(tx.id);
                                setEditAmount(String(tx.amount));
                                setEditNote(tx.note);
                              }}
                              aria-label={isHi ? 'एंट्री बदलें' : 'Entry badlein'}
                              className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx.id)}
                              aria-label={isHi ? 'एंट्री मिटाएं' : 'Entry mitayein'}
                              className="min-h-[44px] min-w-[44px] rounded-xl bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add New Customer */}
      {showAddCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-title"
        >
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-md rounded-3xl bg-[#FAF6F0] border-2 border-amber-900/20 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="add-customer-title" className="text-xl font-bold text-amber-950 font-display">
                {isHi ? 'नया ग्राहक जोड़ें' : 'Naya Grahak Jodein'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                aria-label={isHi ? 'बंद करें' : 'Band karein'}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  {isHi ? 'ग्राहक का नाम' : 'Grahak ka Naam'}
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder={isHi ? 'जैसे: दिनेश भाई' : 'jaise: Dinesh Bhai'}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-white border-2 border-stone-300 text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  {isHi ? 'WhatsApp नंबर (10 अंक)' : 'WhatsApp Number (10 digits)'}
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full min-h-[52px] px-4 rounded-xl bg-white border-2 border-stone-300 text-lg font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[56px] rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-lg"
            >
              {isHi ? 'ग्राहक सेव करें ✅' : 'Grahak Save Karein ✅'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
