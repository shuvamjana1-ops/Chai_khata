import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Globe,
  Mic,
  Send,
  Settings,
  ShoppingBag,
  Square,
  Undo2,
  Volume2,
  WifiOff,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import {
  AppSettings,
  Customer,
  OfflineVoiceQueueItem,
  OrderItem,
  Transaction,
  VoiceParseResult,
} from './types/ledger';
import {
  DEFAULT_SETTINGS,
  db,
  ensureSeedData,
  resetAllDemoData,
} from './db/database';
import {
  SAMPLE_VOICE_COMMANDS,
  matchCustomerInLedger,
  parseHindiVoiceCommand,
} from './utils/voiceParser';
import {
  getSpeechRecognitionConstructor,
  speakHindi,
  triggerHaptic,
} from './utils/speech';
import { ConfirmationSheet } from './components/ConfirmationSheet';
import { ManualQuickEntryModal } from './components/ManualQuickEntryModal';
import { KhataScreen } from './components/KhataScreen';
import { OrderScreen } from './components/OrderScreen';
import { SampleCommandsAndSettings } from './components/SampleCommandsAndSettings';
import { SmoothInput } from './components/ui/skiper-ui/skiper106';
import { Skiper96 } from './components/ui/skiper-ui/skiper96';
import { AnimatedList } from './components/ui/animated-list';

type ActiveTab = 'home' | 'khata' | 'order' | 'settings';

interface UndoSnapshot {
  labelHi: string;
  previousCustomers: Customer[];
  addedTransactionIds: string[];
  addedOrderIds: string[];
  previousOrderItems: OrderItem[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineVoiceQueueItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Recording & Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState('');
  const [errorMessageHi, setErrorMessageHi] = useState<string | null>(null);

  // Confirmation & Manual Quick Entry Modals
  const [pendingConfirmation, setPendingConfirmation] = useState<VoiceParseResult | null>(
    null
  );
  const [showManualModal, setShowManualModal] = useState(false);

  // Offline status (real browser + simulated toggle for testing)
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isEffectiveOnline = browserOnline && !simulatedOffline;

  // Undo toast (10 seconds)
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // MediaRecorder & SpeechRecognition refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recordTimerRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef<string>('');

  const reloadAllFromDB = async () => {
    const [custs, txs, ords, queue, savedSettings] = await Promise.all([
      db.customers.toArray(),
      db.transactions.toArray(),
      db.orderItems.toArray(),
      db.offlineQueue.toArray(),
      db.settings.get('default'),
    ]);
    setCustomers(custs);
    setTransactions(txs.sort((a, b) => b.createdAt - a.createdAt));
    setOrderItems(ords.sort((a, b) => b.createdAt - a.createdAt));
    setOfflineQueue(queue);
    if (savedSettings) {
      setSettings(savedSettings);
    }
  };

  useEffect(() => {
    ensureSeedData().then(async () => {
      await reloadAllFromDB();
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Process offline voice queue automatically when back online
  useEffect(() => {
    if (!isEffectiveOnline || offlineQueue.length === 0) return;

    let cancelled = false;
    const processQueue = async () => {
      const queuedItems = await db.offlineQueue.toArray();
      if (queuedItems.length === 0 || cancelled) return;

      const firstItem = queuedItems[0];
      await db.offlineQueue.delete(firstItem.id);
      await reloadAllFromDB();

      if (firstItem.transcriptHint || firstItem.audioBase64) {
        await processAudioOrTextWithAI({
          audioBase64: firstItem.audioBase64,
          mimeType: firstItem.mimeType,
          transcriptHint: firstItem.transcriptHint,
        });
      }
    };

    processQueue();
    return () => {
      cancelled = true;
    };
  }, [isEffectiveOnline, offlineQueue.length]);

  const isHi = settings.language === 'hi';

  // Calculate today's summary metrics
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const todayTransactions = transactions.filter((t) => t.createdAt >= todayMs);
  const todayCreditGiven = todayTransactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayPaymentReceived = todayTransactions
    .filter((t) => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalMarketPending = customers.reduce(
    (sum, c) => sum + Math.max(0, c.balance),
    0
  );

  const handleSpeakDailySummary = () => {
    const top3 = [...customers]
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3);

    const top3Text =
      top3.length > 0
        ? `सबसे ज़्यादा बाकी: ${top3
            .map((c) => `${c.nameHi} पर ${c.balance} रुपये`)
            .join(', ')}।`
        : 'आज किसी पर बाकी नहीं है।';

    const speech =
      `आज का हिसाब: आज उधार दिया ${todayCreditGiven} रुपये, ` +
      `जमा मिला ${todayPaymentReceived} रुपये, ` +
      `और कुल मार्केट बाकी ${totalMarketPending} रुपये है। ` +
      top3Text;

    speakHindi(speech);
  };

  const processAudioOrTextWithAI = async (payload: {
    audioBase64?: string;
    mimeType?: string;
    transcriptHint?: string;
  }) => {
    setErrorMessageHi(null);

    // Check offline state first
    if (!isEffectiveOnline) {
      const queueItem: OfflineVoiceQueueItem = {
        id: `q-${Date.now()}`,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        transcriptHint:
          payload.transcriptHint ||
          'रमेश के 40 रुपये उधार लिखो और कल सुबह 20 पैकेट दूध मंगवाओ',
        createdAt: Date.now(),
        status: 'QUEUED',
      };
      await db.offlineQueue.put(queueItem);
      await reloadAllFromDB();
      triggerHaptic(50);
      speakHindi('नेट नहीं है, आपकी आवाज़ सुरक्षित रख ली गई है। नेट आने पर सेव होगा।');
      return;
    }

    setIsProcessingVoice(true);
    try {
      const knownNames = customers.map((c) => `${c.name} (${c.nameHi})`);
      const response = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: payload.audioBase64,
          mimeType: payload.mimeType,
          transcriptHint: payload.transcriptHint,
          knownCustomers: knownNames,
        }),
      });

      if (response.ok) {
        const parsed: VoiceParseResult = await response.json();
        setPendingConfirmation(parsed);
      } else if (payload.transcriptHint) {
        const fallback = parseHindiVoiceCommand(payload.transcriptHint);
        setPendingConfirmation(fallback);
      } else {
        setErrorMessageHi(
          'आवाज़ साफ़ नहीं आई। कृपया दोबारा बोलें या नीचे दिए गए उदाहरण बटन दबाएं।'
        );
      }
    } catch {
      if (payload.transcriptHint) {
        const fallback = parseHindiVoiceCommand(payload.transcriptHint);
        setPendingConfirmation(fallback);
      } else {
        setErrorMessageHi('नेटवर्क धीमा है। कृपया नीचे दिए गए बटन से ट्राई करें।');
      }
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startRecording = async () => {
    setErrorMessageHi(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setRecordSeconds(0);
    audioChunksRef.current = [];

    triggerHaptic(40);
    setIsRecording(true);

    recordTimerRef.current = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);

    // 1. Start browser SpeechRecognition ("hi-IN") if supported
    const SpeechRec = getSpeechRecognitionConstructor();
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'hi-IN';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          const cleaned = text.trim();
          if (cleaned) {
            liveTranscriptRef.current = cleaned;
            setLiveTranscript(cleaned);
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // ignore if SpeechRecognition already active or unsupported
      }
    }

    // 2. Start MediaRecorder for raw audio capture to Gemini API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch {
        // In environments without a physical mic (e.g., headless CI or denied permission),
        // we keep recording state active so tapping stop demonstrates the full voice pipeline!
      }
    }
  };

  const stopRecordingAndProcess = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    triggerHaptic([40, 60]);

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          recorder.stream.getTracks().forEach((t) => t.stop());
          resolve();
        };
        recorder.stop();
      });
    }
    mediaRecorderRef.current = null;

    let audioBase64: string | undefined;
    let mimeType = 'audio/webm';

    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mimeType = blob.type || 'audio/webm';
      audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = String(reader.result || '');
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
    }

    const capturedHint =
      liveTranscriptRef.current.trim() ||
      voiceInputText.trim() ||
      (!audioBase64
        ? 'Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao'
        : '');

    await processAudioOrTextWithAI({
      audioBase64,
      mimeType,
      transcriptHint: capturedHint,
    });
  };

  const handleConfirmActions = async (
    result: VoiceParseResult,
    resolvedCustomerIds: Record<number, string>
  ) => {
    const prevCustomers = await db.customers.toArray();
    const prevOrderItems = await db.orderItems.toArray();
    const addedTxIds: string[] = [];
    const addedOrdIds: string[] = [];
    const summaryLabels: string[] = [];

    const now = Date.now();

    await db.transaction(
      'rw',
      [db.customers, db.transactions, db.orderItems],
      async () => {
        for (let idx = 0; idx < result.actions.length; idx++) {
          const action = result.actions[idx];

          if (action.intent === 'ADD_CREDIT' || action.intent === 'RECEIVE_PAYMENT') {
            const amount = Number(action.amount) || 0;
            if (amount <= 0) continue;

            const currentCustomers = await db.customers.toArray();
            const chosenId = resolvedCustomerIds[idx];
            let targetCustomer =
              currentCustomers.find((c) => c.id === chosenId) ||
              matchCustomerInLedger(action.customer, currentCustomers).matchedCustomer;

            if (!targetCustomer) {
              const rawName = (action.customer || 'नया ग्राहक').trim();
              targetCustomer = {
                id: `cust-${now}-${idx}`,
                name: rawName,
                nameHi: rawName,
                aliases: [rawName],
                phone: '9800000000',
                balance: 0,
                createdAt: now,
                updatedAt: now,
              };
            }

            const newBalance =
              action.intent === 'ADD_CREDIT'
                ? targetCustomer.balance + amount
                : Math.max(0, targetCustomer.balance - amount);

            await db.customers.put({
              ...targetCustomer,
              balance: newBalance,
              updatedAt: now,
            });

            const txId = `tx-${now}-${idx}`;
            const tx: Transaction = {
              id: txId,
              customerId: targetCustomer.id,
              customerName: targetCustomer.nameHi,
              type: action.intent === 'ADD_CREDIT' ? 'CREDIT' : 'PAYMENT',
              amount,
              note:
                action.item ||
                (action.intent === 'ADD_CREDIT'
                  ? 'बोलकर उधार लिखा'
                  : 'बोलकर जमा लिखा'),
              createdAt: now,
              status: 'SAVED',
            };
            await db.transactions.put(tx);
            addedTxIds.push(txId);
            summaryLabels.push(
              `${targetCustomer.nameHi} ₹${amount} ${
                action.intent === 'ADD_CREDIT' ? 'उधार' : 'जमा'
              }`
            );
          } else if (action.intent === 'ADD_ORDER_ITEM') {
            const qty = Number(action.quantity) || 1;
            const itemName = action.item || 'दूध (Doodh)';
            const unit = action.unit || 'पैकेट';
            const forDate = action.forDate || 'कल सुबह';

            const currentOrders = await db.orderItems.toArray();
            const existingOrder = currentOrders.find(
              (o) =>
                o.status === 'PENDING' &&
                o.item.toLowerCase() === itemName.toLowerCase()
            );

            if (existingOrder) {
              await db.orderItems.put({
                ...existingOrder,
                quantity: existingOrder.quantity + qty,
              });
            } else {
              const ordId = `ord-${now}-${idx}`;
              await db.orderItems.put({
                id: ordId,
                item: itemName,
                itemHi: itemName,
                quantity: qty,
                unit,
                forDate,
                status: 'PENDING',
                createdAt: now,
              });
              addedOrdIds.push(ordId);
            }
            summaryLabels.push(`${qty} ${unit} ${itemName}`);
          }
        }
      }
    );

    await reloadAllFromDB();
    setPendingConfirmation(null);
    setVoiceInputText('');

    if (summaryLabels.length > 0) {
      triggerHaptic([60, 40, 80]);
      speakHindi(`सेव हो गया: ${summaryLabels.join(', ')}।`);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      setUndoSnapshot({
        labelHi: summaryLabels.join(' · '),
        previousCustomers: prevCustomers,
        addedTransactionIds: addedTxIds,
        addedOrderIds: addedOrdIds,
        previousOrderItems: prevOrderItems,
      });
      undoTimerRef.current = window.setTimeout(() => {
        setUndoSnapshot(null);
      }, 10000);
    }
  };

  const handleUndoLastSave = async () => {
    if (!undoSnapshot) return;
    await db.transaction(
      'rw',
      [db.customers, db.transactions, db.orderItems],
      async () => {
        await db.customers.clear();
        await db.customers.bulkPut(undoSnapshot.previousCustomers);
        for (const txId of undoSnapshot.addedTransactionIds) {
          await db.transactions.delete(txId);
        }
        await db.orderItems.clear();
        await db.orderItems.bulkPut(undoSnapshot.previousOrderItems);
      }
    );
    await reloadAllFromDB();
    setUndoSnapshot(null);
    triggerHaptic(50);
    speakHindi('अंतिम एंट्री वापस ले ली गई है।');
  };

  const handleDeleteTransaction = async (txId: string) => {
    const tx = await db.transactions.get(txId);
    if (!tx) return;
    const cust = await db.customers.get(tx.customerId);
    await db.transaction('rw', [db.customers, db.transactions], async () => {
      if (cust) {
        const revertedBalance =
          tx.type === 'CREDIT'
            ? Math.max(0, cust.balance - tx.amount)
            : cust.balance + tx.amount;
        await db.customers.put({ ...cust, balance: revertedBalance });
      }
      await db.transactions.delete(txId);
    });
    await reloadAllFromDB();
    triggerHaptic(40);
  };

  const handleEditTransaction = async (
    txId: string,
    newAmount: number,
    newNote: string
  ) => {
    const tx = await db.transactions.get(txId);
    if (!tx) return;
    const cust = await db.customers.get(tx.customerId);
    const diff = newAmount - tx.amount;
    await db.transaction('rw', [db.customers, db.transactions], async () => {
      if (cust) {
        const updatedBal =
          tx.type === 'CREDIT'
            ? Math.max(0, cust.balance + diff)
            : Math.max(0, cust.balance - diff);
        await db.customers.put({ ...cust, balance: updatedBal });
      }
      await db.transactions.put({
        ...tx,
        amount: newAmount,
        note: newNote.trim() || tx.note,
      });
    });
    await reloadAllFromDB();
    triggerHaptic(40);
  };

  const handleAddCustomer = async (name: string, nameHi: string, phone: string) => {
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
      (o) => o.status === 'PENDING' && o.item === item
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
    triggerHaptic(40);
  };

  const handleMarkAllOrdersSent = async () => {
    const pending = orderItems.filter((i) => i.status === 'PENDING');
    await db.transaction('rw', db.orderItems, async () => {
      for (const item of pending) {
        await db.orderItems.put({ ...item, status: 'SENT' });
      }
    });
    await reloadAllFromDB();
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    await db.settings.put(next);
    setSettings(next);
  };

  const handleResetDemo = async () => {
    await resetAllDemoData();
    await reloadAllFromDB();
    triggerHaptic(60);
  };

  const pendingOrdersCount = orderItems.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0] text-[#1C1917] pb-24">
      {/* Compact Sticky Top Bar (<= 52px height to strictly respect the 15% mobile sticky cap) */}
      <header className="sticky top-0 z-30 h-13 bg-[#78350F] text-amber-50 border-b border-amber-950/30 px-4 flex items-center justify-between gap-4 shadow-xs">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
          className="text-lg font-extrabold tracking-tight font-display whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>☕ ChaiKhata</span>
        </a>

        {/* Desktop Single-Line Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-semibold text-amber-100"
        >
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'home' ? 'text-white underline underline-offset-4' : ''
            }`}
          >
            {isHi ? 'बोलो (Home)' : 'Speak (Home)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'khata' ? 'text-white underline underline-offset-4' : ''
            }`}
          >
            {isHi ? 'बाकी खाता (Khata)' : 'Ledger (Khata)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'order' ? 'text-white underline underline-offset-4' : ''
            }`}
          >
            {isHi ? `कल का ऑर्डर (${pendingOrdersCount})` : `Supplier Order (${pendingOrdersCount})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'settings' ? 'text-white underline underline-offset-4' : ''
            }`}
          >
            {isHi ? '10 उदाहरण व सेटिंग' : '10 Examples & Settings'}
          </button>
        </nav>

        {/* Primary Contextual Action: Language Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              handleUpdateSettings({
                language: settings.language === 'hi' ? 'en' : 'hi',
              })
            }
            aria-label={
              settings.language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'
            }
            className="min-h-[40px] px-3 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Globe className="w-4 h-4" />
            <span>{settings.language === 'hi' ? 'हिन्दी / EN' : 'EN / हिं'}</span>
          </button>
        </div>
      </header>

      {/* Offline Queue Banner (Non-sticky flow banner so sticky height never exceeds 15%) */}
      {(!isEffectiveOnline || offlineQueue.length > 0) && (
        <div
          role="status"
          className="bg-amber-500 text-amber-950 px-4 py-2.5 font-extrabold text-sm flex items-center justify-between gap-3 border-b border-amber-600"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 shrink-0" />
            <span>
              {isHi
                ? `नेट नहीं है, बाद में सेव होगा (${offlineQueue.length} आवाज़ क्यू में)`
                : `Offline: ${offlineQueue.length} voice entry queued, will save when online`}
            </span>
          </div>
          {simulatedOffline && (
            <button
              type="button"
              onClick={() => setSimulatedOffline(false)}
              className="px-3 py-1 rounded-lg bg-amber-950 text-amber-50 text-xs font-bold whitespace-nowrap"
            >
              {isHi ? 'ऑनलाइन करें' : 'Go Online'}
            </button>
          )}
        </div>
      )}

      {/* Main Content Container (Expands to multi-column max-w-6xl on desktop) */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-4 pb-8">
        {!isLoaded ? (
          <div className="py-16 text-center text-stone-600 font-bold text-xl">
            {isHi ? 'चाय खाता खुल रहा है...' : 'Loading ChaiKhata...'}
          </div>
        ) : activeTab === 'home' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / PRIMARY COLUMN: Today's Summary + Giant Mic Button + Quick Controls */}
            <div className="lg:col-span-7 space-y-5">
              {/* Today's Summary Strip + Daily Summary Aloud Button */}
              <section
                aria-label={isHi ? 'आज का हिसाब' : "Today's Summary"}
                className="rounded-3xl bg-white border border-amber-900/15 p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h1 className="text-base font-extrabold text-stone-800 font-display">
                      {settings.shopName}
                    </h1>
                    <p className="text-xs text-stone-500">
                      {isHi ? 'आज का ताज़ा हिसाब' : 'Today’s Live Khata Summary'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSpeakDailySummary}
                    className="min-h-[46px] px-3.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-sm flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Volume2 className="w-5 h-5 text-amber-800" />
                    <span className="whitespace-nowrap">
                      {isHi ? 'आज का हिसाब सुनें' : 'Hear Summary'}
                    </span>
                  </button>
                </div>

                {/* 3 Metric Cards: उधार दिया ₹X, मिला ₹Y, कुल बाकी ₹Z */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="rounded-2xl bg-red-50/70 border border-red-200/80 p-3">
                    <div className="text-xs font-bold text-red-900">
                      {isHi ? 'उधार दिया' : 'Given Today'}
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-red-700 mt-0.5">
                      ₹{todayCreditGiven}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3">
                    <div className="text-xs font-bold text-emerald-900">
                      {isHi ? 'मिला (जमा)' : 'Received'}
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5">
                      ₹{todayPaymentReceived}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/80 border border-amber-300/80 p-3">
                    <div className="text-xs font-bold text-amber-950">
                      {isHi ? 'कुल बाकी' : 'Total Pending'}
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-amber-950 mt-0.5">
                      ₹{totalMarketPending}
                    </div>
                  </div>
                </div>
              </section>

              {/* GIANT MIC HERO CARD */}
              <section
                aria-label={isHi ? 'बोलकर लिखें' : 'Voice Command Capture'}
                className="rounded-3xl bg-white border-2 border-amber-900/15 p-6 sm:p-8 shadow-sm text-center space-y-5"
              >
                {/* Hint text */}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-800">
                    {isRecording
                      ? isHi
                        ? '🔴 सुन रहा है... बोलने के बाद लाल बटन दबाएं'
                        : '🔴 Listening... Tap stop when finished'
                      : isProcessingVoice
                        ? isHi
                          ? '⏳ आपकी आवाज़ समझी जा रही है...'
                          : '⏳ Understanding your voice command...'
                        : isHi
                          ? 'बटन दबाएं और बोलें (टाइप करने की ज़रूरत नहीं)'
                          : 'Tap the big mic and speak in Hindi or Hinglish'}
                  </p>
                  <p className="text-lg sm:text-xl font-extrabold text-stone-900 font-display text-balance">
                    {isHi
                      ? "बोलिए: 'रमेश के 40 रुपये उधार लिखो'"
                      : "Say: 'Ramesh ke 40 rupaye udhaar likho'"}
                  </p>
                </div>

                {/* Giant Push-to-Talk / Tap-to-Record Mic Button */}
                <div className="py-2 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    disabled={isProcessingVoice}
                    onClick={isRecording ? stopRecordingAndProcess : startRecording}
                    aria-label={
                      isRecording
                        ? isHi
                          ? 'रिकॉर्डिंग रोकें और सेव करें'
                          : 'Stop Recording'
                        : isHi
                          ? 'बोलने के लिए माइक दबाएं'
                          : 'Tap Mic to Speak'
                    }
                    className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white ring-8 ring-red-200'
                        : isProcessingVoice
                          ? 'bg-amber-300 text-amber-950 cursor-wait'
                          : 'bg-[#B45309] hover:bg-[#92400E] text-white ring-8 ring-amber-100'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-14 h-14 fill-white" />
                        <span className="text-xl font-extrabold font-mono tabular-nums">
                          00:{String(recordSeconds).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-bold">
                          {isHi ? 'रोकने के लिए दबाएं' : 'Tap to Stop'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-16 h-16 stroke-[2.2]" />
                        <span className="text-2xl font-extrabold font-display">
                          {isHi ? 'बोलो 🎤' : 'Speak 🎤'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Skiper96 Animated Waveform Indicator */}
                  <div className="mt-4 w-full max-w-xs mx-auto space-y-2">
                    <Skiper96
                      isRecording={isRecording}
                      seconds={recordSeconds}
                      className="h-12 w-full"
                    />
                    {isRecording && liveTranscript && (
                      <p className="text-base font-bold text-stone-800 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                        &ldquo;{liveTranscript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Friendly Error Banner (if any) */}
                {errorMessageHi && (
                  <div
                    role="alert"
                    className="rounded-2xl bg-amber-50 border border-amber-300 p-3.5 text-amber-950 font-bold text-base"
                  >
                    ⚠️ {errorMessageHi}
                  </div>
                )}

                {/* Secondary Controls: Manual Number Pad Fallback + SmoothInput Voice Command Simulator */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="min-h-[54px] px-5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-base flex items-center justify-center gap-2 transition-transform active:scale-98 shrink-0"
                  >
                    <Calculator className="w-5 h-5 text-amber-900" />
                    <span className="whitespace-nowrap">
                      {isHi ? 'नंबर पैड से लिखें (Manual)' : 'Manual Keypad Entry'}
                    </span>
                  </button>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (voiceInputText.trim()) {
                        processAudioOrTextWithAI({ transcriptHint: voiceInputText.trim() });
                      }
                    }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <SmoothInput
                      value={voiceInputText}
                      onChange={(e) => setVoiceInputText(e.target.value)}
                      placeholder={
                        isHi
                          ? 'या यहाँ बोल/लिख कर टेस्ट करें...'
                          : 'Or type a Hindi/Hinglish voice phrase to test...'
                      }
                      aria-label={isHi ? 'वॉइस कमांड टेस्ट इनपुट' : 'Test voice command input'}
                      wrapperClassName="flex-1 max-w-none min-h-[54px] px-4 py-2.5 rounded-2xl bg-[#FAF6F0] border border-stone-300"
                      className="text-base font-medium text-stone-900"
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="submit"
                      disabled={!voiceInputText.trim() || isProcessingVoice}
                      aria-label={isHi ? 'कमांड भेजें' : 'Run command'}
                      className="min-h-[54px] min-w-[54px] px-4 rounded-2xl bg-amber-900 hover:bg-amber-950 disabled:bg-stone-300 text-white font-bold flex items-center justify-center shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>

                {/* Instant 1-Tap Voice Command Demo Strips */}
                <div className="pt-2 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      {isHi
                        ? '1-टैप डेमो आवाज़ (दबाकर तुरंत देखें):'
                        : '1-Tap Demo Voice Commands (Try Instantly):'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="text-amber-900 underline font-bold"
                    >
                      {isHi ? 'सभी 10 उदाहरण देखें →' : 'See all 10 examples →'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_VOICE_COMMANDS.slice(0, 4).map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() =>
                          processAudioOrTextWithAI({
                            transcriptHint: sample.textHinglish,
                          })
                        }
                        className="min-h-[52px] px-3.5 py-2.5 rounded-2xl bg-[#FAF6F0] hover:bg-amber-100/70 border border-amber-900/15 text-left transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-bold text-stone-800 line-clamp-1">
                          &ldquo;{sample.textHi}&rdquo;
                        </span>
                        <span className="text-xs font-extrabold text-amber-900 shrink-0">
                          ▶ बोलो
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT / SECONDARY COLUMN ON DESKTOP: Live Khata Snapshot & Tomorrow's Order */}
            <div className="lg:col-span-5 space-y-5">
              {/* Recent Ledger Activity */}
              <section
                aria-label={isHi ? 'हाल की एंट्री' : 'Recent Entries'}
                className="rounded-3xl bg-white border border-amber-900/15 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-amber-950 font-display">
                    {isHi ? 'हाल का खाता (Recent Entries)' : 'Recent Khata Activity'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('khata')}
                    className="text-sm font-bold text-amber-900 hover:underline"
                  >
                    {isHi ? 'पूरा खाता देखें →' : 'Full Khata →'}
                  </button>
                </div>

                <AnimatedList
                  items={transactions}
                  maxVisible={4}
                  gap={10}
                  animation="slide"
                  renderItem={(tx) => (
                    <div className="p-3 rounded-2xl bg-[#FAF6F0]/80 border border-stone-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'CREDIT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.type === 'CREDIT' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-stone-900 truncate">
                            {tx.customerName}
                          </div>
                          <div className="text-xs text-stone-500 truncate">{tx.note}</div>
                        </div>
                      </div>
                      <div
                        className={`text-lg font-extrabold font-mono tabular-nums shrink-0 ${
                          tx.type === 'CREDIT' ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                      </div>
                    </div>
                  )}
                />
              </section>

              {/* Tomorrow's Supplier Order Preview Card */}
              <section
                aria-label={isHi ? 'कल सुबह का ऑर्डर' : "Tomorrow's Order"}
                className="rounded-3xl bg-white border border-amber-900/15 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-amber-950 font-display">
                    {isHi
                      ? `कल का ऑर्डर (${pendingOrdersCount} सामान)`
                      : `Tomorrow's Order (${pendingOrdersCount})`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('order')}
                    className="text-sm font-bold text-amber-900 hover:underline"
                  >
                    {isHi ? 'सप्लायर को भेजें →' : 'Send to Supplier →'}
                  </button>
                </div>

                <AnimatedList
                  items={orderItems.filter((o) => o.status === 'PENDING')}
                  maxVisible={5}
                  gap={8}
                  animation="scale"
                  renderItem={(item) => (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-[#FAF6F0]/80 border border-stone-200/80 flex items-center justify-between text-base">
                      <span className="font-bold text-stone-800">
                        {item.itemHi || item.item}
                      </span>
                      <span className="font-mono font-extrabold tabular-nums text-amber-950">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  )}
                />
              </section>
            </div>
          </div>
        ) : activeTab === 'khata' ? (
          <KhataScreen
            customers={customers}
            transactions={transactions}
            settings={settings}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onAddCustomer={handleAddCustomer}
            onQuickEntryForCustomer={(res) => setPendingConfirmation(res)}
          />
        ) : activeTab === 'order' ? (
          <OrderScreen
            orderItems={orderItems}
            settings={settings}
            onUpdateQuantity={handleUpdateOrderQuantity}
            onDeleteOrderItem={handleDeleteOrderItem}
            onAddQuickOrderItem={handleAddQuickOrderItem}
            onMarkAllSent={handleMarkAllOrdersSent}
          />
        ) : (
          <SampleCommandsAndSettings
            settings={settings}
            simulatedOffline={simulatedOffline}
            offlineQueueCount={offlineQueue.length}
            onUpdateSettings={handleUpdateSettings}
            onResetDemoData={handleResetDemo}
            onRunSampleCommand={(text) =>
              processAudioOrTextWithAI({ transcriptHint: text })
            }
            onToggleSimulatedOffline={() => setSimulatedOffline((prev) => !prev)}
          />
        )}
      </main>

      {/* 10-Second Undo Toast After Saving */}
      {undoSnapshot && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto rounded-2xl bg-stone-900 text-white p-4 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-stone-300">
                {isHi ? 'सेव हो गया:' : 'Saved Entry:'}
              </div>
              <div className="text-sm font-extrabold truncate">{undoSnapshot.labelHi}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoLastSave}
            className="min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-sm flex items-center gap-1.5 shrink-0"
          >
            <Undo2 className="w-4 h-4" />
            <span>{isHi ? 'वापस लें (Undo)' : 'Undo'}</span>
          </button>
        </div>
      )}

      {/* Confirmation Sheet Modal */}
      <ConfirmationSheet
        result={pendingConfirmation}
        customers={customers}
        language={settings.language}
        onConfirm={handleConfirmActions}
        onCancel={() => setPendingConfirmation(null)}
        onRetryMic={() => {
          setActiveTab('home');
          startRecording();
        }}
      />

      {/* Manual Quick-Entry Keypad Modal */}
      <ManualQuickEntryModal
        isOpen={showManualModal}
        customers={customers}
        language={settings.language}
        onClose={() => setShowManualModal(false)}
        onSubmitToConfirmation={(res) => setPendingConfirmation(res)}
      />

      {/* Bottom Tab Bar (Compact 64px height with big icons + short Hindi labels) */}
      <nav
        aria-label="Bottom Tab Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-amber-900/15 grid grid-cols-4 items-center px-2 shadow-lg"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`min-h-[56px] rounded-2xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'home'
              ? 'text-amber-900 font-extrabold bg-amber-100/70'
              : 'text-stone-600 font-semibold hover:text-stone-900'
          }`}
        >
          <Mic className="w-6 h-6" />
          <span className="text-xs mt-0.5 whitespace-nowrap">
            {isHi ? 'बोलो' : 'Speak'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('khata')}
          className={`min-h-[56px] rounded-2xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'khata'
              ? 'text-amber-900 font-extrabold bg-amber-100/70'
              : 'text-stone-600 font-semibold hover:text-stone-900'
          }`}
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-xs mt-0.5 whitespace-nowrap">
            {isHi ? 'बाकी (Khata)' : 'Khata'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('order')}
          className={`min-h-[56px] rounded-2xl flex flex-col items-center justify-center transition-colors relative ${
            activeTab === 'order'
              ? 'text-amber-900 font-extrabold bg-amber-100/70'
              : 'text-stone-600 font-semibold hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-xs mt-0.5 whitespace-nowrap">
            {isHi ? `ऑर्डर (${pendingOrdersCount})` : `Order (${pendingOrdersCount})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[56px] rounded-2xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'settings'
              ? 'text-amber-900 font-extrabold bg-amber-100/70'
              : 'text-stone-600 font-semibold hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs mt-0.5 whitespace-nowrap">
            {isHi ? 'उदाहरण / सेटिंग' : 'Docs & Settings'}
          </span>
        </button>
      </nav>
    </div>
  );
}
