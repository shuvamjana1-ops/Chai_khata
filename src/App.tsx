import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  db,
  DEFAULT_SETTINGS,
  ensureSeedData,
  resetAllDemoData,
} from './db/database';
import {
  AppSettings,
  Customer,
  OfflineVoiceQueueItem,
  OrderItem,
  Transaction,
  VoiceParseResult,
} from './types/ledger';
import {
  matchCustomerInLedger,
  parseHindiVoiceCommand,
  SAMPLE_VOICE_COMMANDS,
} from './utils/voiceParser';
import { displayText, toHinglish } from './utils/hinglish';
import {
  getSpeechRecognitionConstructor,
  speakHindi,
  triggerHaptic,
} from './utils/speech';
import { ConfirmationSheet } from './components/ConfirmationSheet';
import { KhataScreen } from './components/KhataScreen';
import { OrderScreen } from './components/OrderScreen';
import { ManualQuickEntryModal } from './components/ManualQuickEntryModal';
import { SampleCommandsAndSettings } from './components/SampleCommandsAndSettings';
import { MorphingPopoverBasic } from './components/ui/morphing-popover-basic';
import { AnimatedList } from './components/ui/animated-list';
import {
  KhataAbacusIcon,
  KhataArrowDownLeft,
  KhataArrowUpRight,
  KhataBookIcon,
  KhataCheckIcon,
  KhataCrateIcon,
  KhataLedgerIcon,
  KhataMicIcon,
  KhataSendIcon,
  KhataSpeakerIcon,
  KhataStopIcon,
  KhataTranslateIcon,
  KhataUndoIcon,
} from './components/ui/khata-icons';

type ActiveTab = 'home' | 'khata' | 'orders' | 'samples';

interface UndoToastState {
  txIds: string[];
  orderIds: string[];
  summaryHi: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineVoiceQueueItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Voice & Input states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualTextCommand, setManualTextCommand] = useState('');
  const [pendingParseResult, setPendingParseResult] =
    useState<VoiceParseResult | null>(null);
  const [showManualKeypad, setShowManualKeypad] = useState(false);

  // Offline simulation & Undo toast
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isHi = settings.language === 'hi';

  const reloadAllFromDB = useCallback(async () => {
    const [custs, txs, ords, queue, savedSettings] = await Promise.all([
      db.customers.orderBy('updatedAt').reverse().toArray(),
      db.transactions.orderBy('createdAt').reverse().toArray(),
      db.orderItems.orderBy('createdAt').reverse().toArray(),
      db.offlineQueue.orderBy('createdAt').reverse().toArray(),
      db.settings.get('default'),
    ]);
    setCustomers(custs);
    setTransactions(txs);
    setOrderItems(ords);
    setOfflineQueue(queue);
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureSeedData();
      if (mounted) {
        await reloadAllFromDB();
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reloadAllFromDB]);

  const handleToggleLanguage = async () => {
    const nextLang = settings.language === 'hi' ? 'en' : 'hi';
    const updated: AppSettings = { ...settings, language: nextLang };
    setSettings(updated);
    await db.settings.put(updated);
  };

  const processVoiceOrTextCommand = useCallback(
    async (transcriptText: string, audioBase64?: string, mimeType?: string) => {
      setIsProcessingVoice(true);
      try {
        const isOfflineNow =
          simulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine);

        if (isOfflineNow) {
          const localParsed = parseHindiVoiceCommand(transcriptText);
          await db.offlineQueue.put({
            id: `off-${Date.now()}`,
            transcriptHint: transcriptText,
            createdAt: Date.now(),
            status: 'QUEUED',
          });
          await reloadAllFromDB();
          setPendingParseResult(localParsed);
          return;
        }

        const response = await fetch('/api/gemini/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptHint: transcriptText,
            audioBase64,
            mimeType,
            knownCustomers: customers.map((c) => c.name),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as VoiceParseResult;
          setPendingParseResult(data);
        } else {
          const fallbackParsed = parseHindiVoiceCommand(transcriptText);
          setPendingParseResult(fallbackParsed);
        }
      } catch {
        const fallbackParsed = parseHindiVoiceCommand(transcriptText);
        setPendingParseResult(fallbackParsed);
      } finally {
        setIsProcessingVoice(false);
      }
    },
    [customers, reloadAllFromDB, simulatedOffline]
  );

  const startVoiceRecording = async () => {
    triggerHaptic(60);
    setLiveTranscript('');

    const SpeechCtor = getSpeechRecognitionConstructor();
    let capturedTranscript = '';

    if (SpeechCtor) {
      try {
        const recognition = new SpeechCtor();
        recognition.lang = 'hi-IN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          capturedTranscript = text.trim();
          setLiveTranscript(capturedTranscript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (capturedTranscript) {
            processVoiceOrTextCommand(capturedTranscript);
          }
        };

        recognitionRef.current = recognition;
        setIsRecording(true);
        recognition.start();
        return;
      } catch {
        // Fallback to MediaRecorder or prompt below
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = String(reader.result || '').split(',')[1] || '';
            processVoiceOrTextCommand(liveTranscript, base64, blob.type);
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        recorder.start();
        return;
      } catch {
        // Microphone permission not available in headless environment; run sample voice simulation
      }
    }

    // Immediate demo fallback when no hardware mic is attached
    const sampleCmd = SAMPLE_VOICE_COMMANDS[0].textHi;
    setLiveTranscript(sampleCmd);
    processVoiceOrTextCommand(sampleCmd);
  };

  const stopVoiceRecording = () => {
    triggerHaptic([40, 60]);
    setIsRecording(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // ignore
    }
  };

  const handleConfirmVoiceResult = async (
    result: VoiceParseResult,
    resolvedCustomerIds: Record<number, string>
  ) => {
    const now = Date.now();
    const createdTxIds: string[] = [];
    const createdOrderIds: string[] = [];
    const summaries: string[] = [];

    await db.transaction(
      'rw',
      [db.customers, db.transactions, db.orderItems],
      async () => {
        for (let idx = 0; idx < result.actions.length; idx++) {
          const act = result.actions[idx];

          if (
            (act.intent === 'ADD_CREDIT' || act.intent === 'RECEIVE_PAYMENT') &&
            act.amount &&
            act.amount > 0
          ) {
            const resolvedId = resolvedCustomerIds[idx];
            let cust = resolvedId
              ? await db.customers.get(resolvedId)
              : undefined;

            if (!cust && act.customer) {
              const match = matchCustomerInLedger(act.customer, customers);
              if (match.matchedCustomer) {
                cust = await db.customers.get(match.matchedCustomer.id);
              }
            }

            if (!cust) {
              const rawName = act.customer?.trim() || 'नया ग्राहक';
              const newId = `cust-${now}-${idx}`;
              cust = {
                id: newId,
                name: toHinglish(rawName),
                nameHi: rawName,
                aliases: [rawName, toHinglish(rawName)],
                phone: '',
                balance: 0,
                createdAt: now,
                updatedAt: now,
              };
            }

            const isCredit = act.intent === 'ADD_CREDIT';
            const updatedBalance = isCredit
              ? cust.balance + act.amount
              : Math.max(0, cust.balance - act.amount);

            await db.customers.put({
              ...cust,
              balance: updatedBalance,
              updatedAt: now,
            });

            const txId = `tx-${now}-${idx}`;
            await db.transactions.put({
              id: txId,
              customerId: cust.id,
              customerName: cust.nameHi,
              type: isCredit ? 'CREDIT' : 'PAYMENT',
              amount: act.amount,
              note:
                act.item ||
                (isCredit ? 'आवाज़ से उधार लिखा' : 'आवाज़ से जमा किया'),
              createdAt: now,
              status: 'SAVED',
            });

            createdTxIds.push(txId);
            summaries.push(
              isCredit
                ? `${cust.nameHi} के ₹${act.amount} उधार लिखे गए`
                : `${cust.nameHi} से ₹${act.amount} जमा किए गए`
            );
          } else if (act.intent === 'ADD_ORDER_ITEM' && act.item) {
            const ordId = `ord-${now}-${idx}`;
            await db.orderItems.put({
              id: ordId,
              item: `${act.item} (${toHinglish(act.item)})`,
              itemHi: act.item,
              quantity: act.quantity ?? 1,
              unit: act.unit || 'पैकेट',
              forDate: act.forDate || 'कल सुबह',
              status: 'PENDING',
              createdAt: now,
            });
            createdOrderIds.push(ordId);
            summaries.push(
              `${act.quantity ?? 1} ${act.unit || 'पैकेट'} ${act.item} ऑर्डर में जोड़ा गया`
            );
          }
        }
      }
    );

    setPendingParseResult(null);
    setLiveTranscript('');
    setManualTextCommand('');
    await reloadAllFromDB();

    if (createdTxIds.length > 0 || createdOrderIds.length > 0) {
      const joinedSummary = summaries.join(' और ');
      triggerHaptic([50, 80, 50]);
      speakHindi(`लिख लिया गया: ${joinedSummary}`);
      setUndoToast({
        txIds: createdTxIds,
        orderIds: createdOrderIds,
        summaryHi: joinedSummary,
      });
    }
  };

  const handleUndoLastAction = async () => {
    if (!undoToast) return;
    await db.transaction(
      'rw',
      [db.customers, db.transactions, db.orderItems],
      async () => {
        for (const txId of undoToast.txIds) {
          const tx = await db.transactions.get(txId);
          if (tx) {
            const cust = await db.customers.get(tx.customerId);
            if (cust) {
              const revertedBalance =
                tx.type === 'CREDIT'
                  ? Math.max(0, cust.balance - tx.amount)
                  : cust.balance + tx.amount;
              await db.customers.put({
                ...cust,
                balance: revertedBalance,
                updatedAt: Date.now(),
              });
            }
            await db.transactions.delete(txId);
          }
        }
        for (const ordId of undoToast.orderIds) {
          await db.orderItems.delete(ordId);
        }
      }
    );
    setUndoToast(null);
    await reloadAllFromDB();
    speakHindi('पिछली एंट्री हटा दी गई।');
  };

  const handleDeleteTransaction = async (txId: string) => {
    const tx = await db.transactions.get(txId);
    if (!tx) return;
    const cust = await db.customers.get(tx.customerId);
    if (cust) {
      const newBal =
        tx.type === 'CREDIT'
          ? Math.max(0, cust.balance - tx.amount)
          : cust.balance + tx.amount;
      await db.customers.put({
        ...cust,
        balance: newBal,
        updatedAt: Date.now(),
      });
    }
    await db.transactions.delete(txId);
    await reloadAllFromDB();
  };

  const handleEditTransaction = async (
    txId: string,
    newAmount: number,
    newNote: string
  ) => {
    const tx = await db.transactions.get(txId);
    if (!tx) return;
    const diff = newAmount - tx.amount;
    const cust = await db.customers.get(tx.customerId);
    if (cust) {
      const updatedBal =
        tx.type === 'CREDIT'
          ? Math.max(0, cust.balance + diff)
          : Math.max(0, cust.balance - diff);
      await db.customers.put({
        ...cust,
        balance: updatedBal,
        updatedAt: Date.now(),
      });
    }
    await db.transactions.put({
      ...tx,
      amount: newAmount,
      note: newNote,
    });
    await reloadAllFromDB();
  };

  const handleAddCustomer = async (
    name: string,
    nameHi: string,
    phone: string
  ) => {
    const now = Date.now();
    await db.customers.put({
      id: `cust-${now}`,
      name,
      nameHi,
      aliases: [name, nameHi],
      phone,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
    await reloadAllFromDB();
  };

  const handleUpdateOrderQuantity = async (id: string, delta: number) => {
    const item = await db.orderItems.get(id);
    if (!item) return;
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      await db.orderItems.delete(id);
    } else {
      await db.orderItems.put({ ...item, quantity: nextQty });
    }
    await reloadAllFromDB();
  };

  const handleDeleteOrderItem = async (id: string) => {
    await db.orderItems.delete(id);
    await reloadAllFromDB();
  };

  const handleAddQuickOrderItem = async (
    item: string,
    itemHi: string,
    quantity: number,
    unit: string
  ) => {
    const existing = orderItems.find(
      (o) => o.status === 'PENDING' && o.itemHi === itemHi
    );
    if (existing) {
      await db.orderItems.put({
        ...existing,
        quantity: existing.quantity + quantity,
      });
    } else {
      await db.orderItems.put({
        id: `ord-${Date.now()}`,
        item,
        itemHi,
        quantity,
        unit,
        forDate: 'कल सुबह',
        status: 'PENDING',
        createdAt: Date.now(),
      });
    }
    await reloadAllFromDB();
  };

  const handleMarkAllOrdersSent = async () => {
    const pending = orderItems.filter((i) => i.status === 'PENDING');
    await Promise.all(
      pending.map((i) => db.orderItems.put({ ...i, status: 'SENT' }))
    );
    await reloadAllFromDB();
  };

  const handleUpdateSettings = async (updated: Partial<AppSettings>) => {
    const merged: AppSettings = { ...settings, ...updated };
    setSettings(merged);
    await db.settings.put(merged);
  };

  const handleResetDemoData = async () => {
    await resetAllDemoData();
    await reloadAllFromDB();
  };

  const totalPendingBalance = customers.reduce((sum, c) => sum + c.balance, 0);
  const pendingCustomersCount = customers.filter((c) => c.balance > 0).length;
  const pendingOrdersCount = orderItems.filter(
    (i) => i.status === 'PENDING'
  ).length;

  const handleSpeakDailySummary = () => {
    const speech = `नमस्ते! आज कुल ${pendingCustomersCount} ग्राहकों पर ${totalPendingBalance} रुपये उधार बाकी हैं। कल सुबह के सप्लायर ऑर्डर में ${pendingOrdersCount} सामान लिखे हैं।`;
    speakHindi(speech);
  };

  return (
    <div className="min-h-screen khata-canvas text-stone-900 flex flex-col pb-24">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Language Toggle */}
      <header className="khata-header text-[#FCF9F2] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className="text-xl sm:text-2xl font-extrabold tracking-tight font-display whitespace-nowrap shrink-0 text-[#FCF9F2]"
          >
            {isHi ? 'चाय खाता (ChaiKhata)' : 'ChaiKhata (Bahi-Khata)'}
          </a>

          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-bold text-[#F3ECE0]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#E5B869] underline underline-offset-4'
                  : 'hover:text-white'
              }`}
            >
              {isHi ? 'बोलो (Home)' : 'Bolo (Home)'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('khata')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'khata'
                  ? 'text-[#E5B869] underline underline-offset-4'
                  : 'hover:text-white'
              }`}
            >
              {isHi ? 'बाकी खाता (Khata)' : 'Baaki Khata'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'text-[#E5B869] underline underline-offset-4'
                  : 'hover:text-white'
              }`}
            >
              {isHi
                ? `कल का ऑर्डर (${pendingOrdersCount})`
                : `Kal Ka Order (${pendingOrdersCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'samples'
                  ? 'text-[#E5B869] underline underline-offset-4'
                  : 'hover:text-white'
              }`}
            >
              {isHi ? '10 उदाहरण व सेटिंग' : '10 Udaharan & Setting'}
            </button>
          </nav>

          <button
            type="button"
            onClick={handleToggleLanguage}
            aria-label={
              isHi
                ? 'Switch to Hinglish (Roman Hindi)'
                : 'हिंदी (देवनागरी) में बदलें'
            }
            className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-[#3E160C] hover:bg-[#2B0E07] border border-[#E5B869]/50 text-[#FCF9F2] font-bold text-sm flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KhataTranslateIcon className="w-4 h-4 text-[#E5B869]" />
            <span>{isHi ? 'हिंदी ⇄ Hinglish' : 'Hinglish ⇄ हिंदी'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="max-w-5xl w-full mx-auto px-4 pt-5 flex-1">
        {isLoading ? (
          <div className="khata-sheet rounded-2xl p-8 text-center font-bold text-lg text-stone-700">
            {isHi ? 'चाय खाता खुल रहा है...' : 'ChaiKhata khul raha hai...'}
          </div>
        ) : (
          <>
            {/* Undo Banner */}
            {undoToast && (
              <div className="mb-5 rounded-xl bg-emerald-900 text-white px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 border-2 border-emerald-950">
                <div className="flex items-center gap-2.5 font-bold text-base">
                  <KhataCheckIcon className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>{displayText(undoToast.summaryHi, isHi)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUndoLastAction}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-white text-emerald-950 font-extrabold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <KhataUndoIcon className="w-4 h-4" />
                    <span>
                      {isHi ? 'गलती से लिखा? वापस लें' : 'Undo Karein'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUndoToast(null)}
                    className="min-h-[40px] px-2.5 text-xs text-emerald-200 hover:text-white cursor-pointer"
                  >
                    {isHi ? 'ठीक है' : 'OK'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* Ruled Horizontal Bahi-Khata Ledger Summary Ribbon */}
                <section className="khata-sheet rounded-2xl overflow-hidden">
                  <div className="bg-[#5C2314] text-[#FCF9F2] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold tracking-wide text-[#E5B869]">
                        {displayText(settings.shopName, isHi)}
                      </div>
                      <h1 className="text-xl sm:text-2xl font-extrabold font-display">
                        {isHi
                          ? 'आज का बही-खाता रजिस्टर'
                          : 'Aaj Ka Bahi-Khata Register'}
                      </h1>
                    </div>
                    <button
                      type="button"
                      onClick={handleSpeakDailySummary}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#3E160C] hover:bg-[#2B0E07] border border-[#E5B869]/40 text-[#FCF9F2] font-bold text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <KhataSpeakerIcon className="w-4 h-4 text-[#E5B869]" />
                      <span className="whitespace-nowrap">
                        {isHi ? 'पूरा हिसाब सुनें' : 'Poora Hisaab Sunein'}
                      </span>
                    </button>
                  </div>

                  <div className="divide-y sm:divide-y-0 sm:divide-x divide-[#D4C3AA] flex flex-col sm:flex-row">
                    <div className="flex-1 px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-stone-600">
                          {isHi ? 'कुल उधार बाकी' : 'Kul Udhaar Baaki'}
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-red-800 mt-0.5">
                          ₹{totalPendingBalance}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('khata')}
                        className="text-xs font-extrabold text-amber-950 underline underline-offset-4 cursor-pointer"
                      >
                        {pendingCustomersCount}{' '}
                        {isHi ? 'ग्राहक देखें' : 'Grahak Dekhein'}
                      </button>
                    </div>

                    <div className="flex-1 px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-stone-600">
                          {isHi
                            ? 'कल सुबह का सप्लायर ऑर्डर'
                            : 'Kal Subah Ka Supplier Order'}
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-950 mt-0.5">
                          {pendingOrdersCount}{' '}
                          <span className="text-base font-sans">
                            {isHi ? 'सामान' : 'Samaan'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-extrabold text-amber-950 underline underline-offset-4 cursor-pointer"
                      >
                        {isHi ? 'लिस्ट खोलें' : 'List Kholein'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Primary Voice Action Stamp & Command Box */}
                <section className="khata-sheet rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4C3AA] pb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-amber-950 font-display">
                        {isHi
                          ? 'बोलकर या लिखकर खाता दर्ज करें'
                          : 'Bolkar Ya Likhkar Khata Darj Karein'}
                      </h2>
                      <p className="text-sm text-stone-600">
                        {isHi
                          ? 'माइक दबाएं और बोलें: "रमेश के 40 रुपये उधार लिखो और कल 20 पैकेट दूध"'
                          : 'Mic dabayein aur bolein: "Ramesh ke 40 rupaye udhaar likho aur kal 20 packet doodh"'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <MorphingPopoverBasic
                        isHi={isHi}
                        onApplyQuickRate={(cmd) =>
                          processVoiceOrTextCommand(cmd)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowManualKeypad(true)}
                        className="min-h-[46px] px-3.5 py-2 rounded-2xl border-2 border-[#5C2314] bg-[#F3ECE0] hover:bg-[#E7D8C3] text-amber-950 font-extrabold text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <KhataAbacusIcon className="w-4 h-4" />
                        <span>{isHi ? 'बटन से लिखें' : 'Button Se Likhein'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tactile Stamp Mic Button */}
                  <div className="flex flex-col items-center py-3">
                    <button
                      type="button"
                      onClick={
                        isRecording ? stopVoiceRecording : startVoiceRecording
                      }
                      disabled={isProcessingVoice}
                      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex flex-col items-center justify-center gap-2 text-white font-extrabold transition-transform active:translate-y-0.5 cursor-pointer ${
                        isRecording ? 'khata-mic-recording' : 'khata-mic-stamp'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <KhataStopIcon className="w-10 h-10" />
                          <span className="text-sm">
                            {isHi ? 'रोकें (Stop)' : 'Rokein (Stop)'}
                          </span>
                        </>
                      ) : (
                        <>
                          <KhataMicIcon className="w-11 h-11" />
                          <span className="text-base">
                            {isProcessingVoice
                              ? isHi
                                ? 'समझ रहे...'
                                : 'Samajh rahe...'
                              : isHi
                              ? 'यहाँ बोलें'
                              : 'Yahan Bolein'}
                          </span>
                        </>
                      )}
                    </button>

                    {liveTranscript && (
                      <div className="mt-3 px-4 py-2 rounded-xl khata-sheet-muted text-sm font-bold text-amber-950">
                        {isHi ? 'सुना गया:' : 'Suna gaya:'} &ldquo;
                        {displayText(liveTranscript, isHi)}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Direct Hindi / Hinglish Text Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!manualTextCommand.trim()) return;
                      processVoiceOrTextCommand(manualTextCommand.trim());
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      value={manualTextCommand}
                      onChange={(e) => setManualTextCommand(e.target.value)}
                      placeholder={
                        isHi
                          ? 'यहाँ हिंदी या Hinglish में लिखें (जैसे: सुरेश से 200 मिले)...'
                          : 'Yahan Hindi ya Hinglish mein likhein (e.g. Suresh se 200 mile)...'
                      }
                      className="flex-1 min-h-[52px] px-4 rounded-xl bg-white border-2 border-[#C8B499] text-stone-900 font-bold text-base focus:outline-none focus:border-[#5C2314]"
                    />
                    <button
                      type="submit"
                      disabled={isProcessingVoice || !manualTextCommand.trim()}
                      className="min-h-[52px] px-5 rounded-xl bg-[#5C2314] hover:bg-[#3E160C] disabled:opacity-50 text-[#FCF9F2] font-extrabold text-base flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <KhataSendIcon className="w-4 h-4" />
                      <span>{isHi ? 'हिसाब जोड़ें' : 'Hisaab Jodein'}</span>
                    </button>
                  </form>

                  {/* 1-Tap Quick Demo Voice Phrases */}
                  <div className="pt-2">
                    <div className="text-xs font-extrabold text-stone-600 mb-2">
                      {isHi
                        ? 'एक-टैप आवाज़ उदाहरण (दबाकर आज़माएं):'
                        : '1-Tap Voice Examples (Dabakar Aazmayein):'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_VOICE_COMMANDS.slice(0, 4).map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() =>
                            processVoiceOrTextCommand(
                              isHi ? sample.textHi : sample.textHinglish
                            )
                          }
                          className="min-h-[40px] px-3 py-1.5 rounded-xl khata-sheet-muted hover:bg-[#E7D8C3] text-amber-950 text-xs font-bold text-left transition-colors cursor-pointer"
                        >
                          &ldquo;{isHi ? sample.textHi : sample.textHinglish}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Recent Ledger Entries */}
                <section className="khata-sheet rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D4C3AA] pb-3">
                    <h2 className="text-lg font-extrabold text-amber-950 font-display">
                      {isHi
                        ? 'ताज़ा खाता एंट्री (Recent Hisaab)'
                        : 'Taaza Khata Entry (Recent Hisaab)'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('khata')}
                      className="text-xs font-extrabold text-amber-900 underline underline-offset-4 cursor-pointer"
                    >
                      {isHi ? 'पूरा खाता देखें' : 'Poora Khata Dekhein'}
                    </button>
                  </div>

                  <AnimatedList
                    items={transactions.slice(0, 5)}
                    maxVisible={5}
                    gap={8}
                    className="divide-y divide-[#E5D8C5]"
                    renderItem={(tx) => {
                      const isCredit = tx.type === 'CREDIT';
                      return (
                        <div className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isCredit
                                  ? 'bg-red-50 border-red-200 text-red-800'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}
                            >
                              {isCredit ? (
                                <KhataArrowUpRight className="w-5 h-5" />
                              ) : (
                                <KhataArrowDownLeft className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-stone-900 text-base">
                                {displayText(tx.customerName, isHi)}
                              </div>
                              <div className="text-xs text-stone-600">
                                {displayText(tx.note, isHi)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-lg font-extrabold font-mono tabular-nums ${
                                isCredit ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {isCredit ? '+' : '-'}₹{tx.amount}
                            </div>
                            <div className="text-[11px] font-bold text-stone-500">
                              {isCredit
                                ? isHi
                                  ? 'उधार'
                                  : 'Udhaar'
                                : isHi
                                ? 'जमा'
                                : 'Jama'}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </section>
              </div>
            )}

            {activeTab === 'khata' && (
              <KhataScreen
                customers={customers}
                transactions={transactions}
                settings={settings}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                onAddCustomer={handleAddCustomer}
                onQuickEntryForCustomer={(res) => setPendingParseResult(res)}
              />
            )}

            {activeTab === 'orders' && (
              <OrderScreen
                orderItems={orderItems}
                settings={settings}
                onUpdateQuantity={handleUpdateOrderQuantity}
                onDeleteOrderItem={handleDeleteOrderItem}
                onAddQuickOrderItem={handleAddQuickOrderItem}
                onMarkAllSent={handleMarkAllOrdersSent}
              />
            )}

            {activeTab === 'samples' && (
              <SampleCommandsAndSettings
                settings={settings}
                simulatedOffline={simulatedOffline}
                offlineQueueCount={offlineQueue.length}
                onUpdateSettings={handleUpdateSettings}
                onResetDemoData={handleResetDemoData}
                onRunSampleCommand={(cmd) => processVoiceOrTextCommand(cmd)}
                onToggleSimulatedOffline={() =>
                  setSimulatedOffline((prev) => !prev)
                }
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav
        aria-label="Bottom Tab Navigation"
        className="fixed bottom-0 inset-x-0 z-30 khata-dock"
      >
        <div className="max-w-5xl mx-auto px-2 py-1.5 grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-0.5 font-extrabold text-xs transition-colors cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#5C2314] text-[#FCF9F2]'
                : 'text-stone-700 hover:bg-[#F3ECE0]'
            }`}
          >
            <KhataMicIcon className="w-5 h-5" />
            <span className="whitespace-nowrap">
              {isHi ? 'बोलो' : 'Bolo'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-0.5 font-extrabold text-xs transition-colors cursor-pointer ${
              activeTab === 'khata'
                ? 'bg-[#5C2314] text-[#FCF9F2]'
                : 'text-stone-700 hover:bg-[#F3ECE0]'
            }`}
          >
            <KhataLedgerIcon className="w-5 h-5" />
            <span className="whitespace-nowrap">
              {isHi ? 'बाकी (Khata)' : 'Baaki (Khata)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-0.5 font-extrabold text-xs transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#5C2314] text-[#FCF9F2]'
                : 'text-stone-700 hover:bg-[#F3ECE0]'
            }`}
          >
            <KhataCrateIcon className="w-5 h-5" />
            <span className="whitespace-nowrap">
              {isHi
                ? `ऑर्डर (${pendingOrdersCount})`
                : `Order (${pendingOrdersCount})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-0.5 font-extrabold text-xs transition-colors cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-[#5C2314] text-[#FCF9F2]'
                : 'text-stone-700 hover:bg-[#F3ECE0]'
            }`}
          >
            <KhataBookIcon className="w-5 h-5" />
            <span className="whitespace-nowrap">
              {isHi ? 'उदाहरण / सेटिंग' : 'Udaharan / Setting'}
            </span>
          </button>
        </div>
      </nav>

      {/* Voice Confirmation Bottom Sheet */}
      <ConfirmationSheet
        result={pendingParseResult}
        customers={customers}
        language={settings.language}
        onConfirm={handleConfirmVoiceResult}
        onCancel={() => setPendingParseResult(null)}
        onRetryMic={startVoiceRecording}
      />

      {/* Manual Keypad Quick Entry Modal */}
      <ManualQuickEntryModal
        isOpen={showManualKeypad}
        customers={customers}
        language={settings.language}
        onClose={() => setShowManualKeypad(false)}
        onSubmitToConfirmation={(res) => setPendingParseResult(res)}
      />
    </div>
  );
}

export default App;
