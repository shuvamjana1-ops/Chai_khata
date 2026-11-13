import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { AppSettings, OrderItem } from '../types/ledger';
import { buildSupplierOrderWhatsApp } from '../utils/voiceParser';
import { speakHindi } from '../utils/speech';
import { AnimatedList } from './ui/animated-list';

interface OrderScreenProps {
  orderItems: OrderItem[];
  settings: AppSettings;
  onUpdateQuantity: (id: string, delta: number) => Promise<void>;
  onDeleteOrderItem: (id: string) => Promise<void>;
  onAddQuickOrderItem: (item: string, itemHi: string, quantity: number, unit: string) => Promise<void>;
  onMarkAllSent: () => Promise<void>;
}

const QUICK_SUPPLIER_ITEMS = [
  { item: 'दूध (Doodh)', itemHi: 'दूध (फुल क्रीम)', quantity: 10, unit: 'पैकेट' },
  { item: 'चीनी (Cheeni)', itemHi: 'चीनी (शक्कर)', quantity: 5, unit: 'किलो' },
  { item: 'चाय पत्ती (Chai Patti)', itemHi: 'चाय पत्ती', quantity: 2, unit: 'किलो' },
  { item: 'ब्रेड (Bread)', itemHi: 'ताज़ा ब्रेड', quantity: 10, unit: 'पैकेट' },
  { item: 'अदरक (Adrak)', itemHi: 'अदरक', quantity: 1, unit: 'किलो' },
  { item: 'बिस्कुट (Biscuit)', itemHi: 'पारले-जी बिस्कुट', quantity: 2, unit: 'पेटी' },
];

export const OrderScreen: React.FC<OrderScreenProps> = ({
  orderItems,
  settings,
  onUpdateQuantity,
  onDeleteOrderItem,
  onAddQuickOrderItem,
  onMarkAllSent,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);

  const isHi = settings.language === 'hi';
  const pendingItems = orderItems.filter((i) => i.status === 'PENDING');
  const sentItems = orderItems.filter((i) => i.status === 'SENT');

  const supplierWhatsApp = buildSupplierOrderWhatsApp({
    supplierName: settings.supplierName,
    supplierPhone: settings.supplierPhone,
    shopName: settings.shopName,
    items: pendingItems,
  });

  const handleSpeakOrderList = () => {
    if (pendingItems.length === 0) {
      speakHindi('कल सुबह के लिए अभी कोई ऑर्डर बाकी नहीं है।');
      return;
    }
    const listText = pendingItems
      .map((i) => `${i.quantity} ${i.unit} ${i.itemHi || i.item}`)
      .join(', ');
    speakHindi(`कल सुबह के ऑर्डर में ${pendingItems.length} सामान हैं: ${listText}।`);
  };

  const handleCopyOrder = async () => {
    try {
      await navigator.clipboard.writeText(supplierWhatsApp.messageHi);
    } catch {
      // fallback
    }
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-3xl bg-amber-900 text-amber-50 p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-amber-200">
            {isHi ? 'सप्लायर: ' : 'Supplier: '} {settings.supplierName} ({settings.supplierPhone})
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display mt-0.5">
            {isHi
              ? `कल सुबह का ऑर्डर (${pendingItems.length} सामान)`
              : `Tomorrow Morning Order (${pendingItems.length} items)`}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSpeakOrderList}
            className="min-h-[52px] px-4 rounded-2xl bg-amber-800 hover:bg-amber-700 text-amber-50 font-bold text-base flex items-center gap-2"
          >
            <Volume2 className="w-5 h-5" />
            <span className="whitespace-nowrap">{isHi ? 'ऑर्डर सुनें' : 'Listen'}</span>
          </button>
          <button
            type="button"
            disabled={pendingItems.length === 0}
            onClick={() => setShowPreviewModal(true)}
            className={`min-h-[52px] px-5 rounded-2xl font-extrabold text-base flex items-center gap-2 shadow-sm transition-transform active:scale-95 ${
              pendingItems.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-950/40 text-amber-200/50 cursor-not-allowed'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="whitespace-nowrap">
              {isHi ? 'सप्लायर को भेजो' : 'Send to Supplier'}
            </span>
          </button>
        </div>
      </div>

      {/* Quick 1-Tap Add Bar */}
      <div className="space-y-2">
        <div className="text-sm font-bold text-stone-700">
          {isHi
            ? 'तेज़ ऑर्डर बटन (दबाते ही लिस्ट में जुड़ेगा):'
            : '1-Tap Quick Add to Tomorrow’s Order:'}
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_SUPPLIER_ITEMS.map((q) => (
            <button
              key={q.item}
              type="button"
              onClick={() => onAddQuickOrderItem(q.item, q.itemHi, q.quantity, q.unit)}
              className="min-h-[48px] px-3.5 py-2 rounded-2xl bg-white hover:bg-amber-50 border border-amber-900/20 text-stone-900 font-bold text-sm flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-800" />
              <span>
                {q.itemHi} ({q.quantity} {q.unit})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Order Items List with AnimatedList */}
      {pendingItems.length === 0 ? (
        <div className="rounded-3xl bg-white border border-amber-900/15 p-8 text-center space-y-2 shadow-xs">
          <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="text-lg font-bold text-stone-700">
            {isHi ? 'कल के लिए अभी कोई सामान नहीं लिखा है' : 'No pending order items for tomorrow'}
          </p>
          <p className="text-sm text-stone-500">
            {isHi
              ? 'होम स्क्रीन पर माइक दबाकर बोलें: "कल सुबह 20 पैकेट दूध मंगवाओ"'
              : 'Speak on the Home screen or tap a quick button above'}
          </p>
        </div>
      ) : (
        <AnimatedList
          items={pendingItems}
          maxVisible={20}
          gap={12}
          animation="bounce"
          renderItem={(item) => (
            <div className="rounded-3xl bg-white border border-amber-900/15 p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-amber-50/40 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="text-xl font-extrabold text-stone-900 font-display">
                  {item.itemHi || item.item}
                </div>
                <div className="text-sm text-stone-500">
                  {item.forDate} · {item.unit}
                </div>
              </div>

              {/* Stepper controls (min 48px touch targets) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  aria-label={`${item.itemHi} कम करें`}
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-bold"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="min-w-[84px] text-center">
                  <span className="text-2xl font-extrabold font-mono tabular-nums text-amber-950">
                    {item.quantity}
                  </span>
                  <span className="block text-xs font-bold text-stone-500">{item.unit}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`${item.itemHi} बढ़ाएं`}
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center justify-center font-bold"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteOrderItem(item.id)}
                  aria-label={`${item.itemHi} हटाएं`}
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center ml-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        />
      )}

      {/* Primary Bottom CTA for Supplier Order */}
      {pendingItems.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          className="w-full min-h-[64px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-98"
        >
          <MessageCircle className="w-7 h-7" />
          <span>
            {isHi
              ? `सप्लायर को भेजो (${pendingItems.length} सामान) 💬`
              : `Send Order to Supplier (${pendingItems.length} items) 💬`}
          </span>
        </button>
      )}

      {/* Sent Orders History */}
      {sentItems.length > 0 && (
        <div className="rounded-2xl bg-stone-100 p-4 space-y-2">
          <div className="text-sm font-bold text-stone-600">
            {isHi ? 'भेजे जा चुके ऑर्डर (Sent):' : 'Previously Sent Orders:'}
          </div>
          <div className="flex flex-wrap gap-2">
            {sentItems.map((s) => (
              <span
                key={s.id}
                className="text-sm text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200"
              >
                ✅ {s.itemHi} — {s.quantity} {s.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supplier WhatsApp Approval & Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
        >
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FAF6F0] border-t-2 sm:border-2 border-amber-900/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-amber-900/10 flex items-center justify-between">
              <h3 id="supplier-modal-title" className="text-xl font-bold text-amber-950 font-display">
                {isHi ? 'सप्लायर WhatsApp ऑर्डर पुष्टि' : 'Confirm Supplier WhatsApp Order'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                aria-label={isHi ? 'बंद करें' : 'Close'}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-200 flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <p className="text-sm text-stone-600">
                {isHi
                  ? 'सुरक्षा नियम: आपकी मंज़ूरी के बिना कोई ऑर्डर अपने-आप नहीं जाता। नीचे संदेश जांचें:'
                  : 'Safety check: Review your Hindi order message before sending on WhatsApp:'}
              </p>

              <pre className="whitespace-pre-wrap font-sans text-base bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-stone-900 leading-relaxed">
                {supplierWhatsApp.messageHi}
              </pre>

              <div className="space-y-2.5">
                <a
                  href={supplierWhatsApp.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    onMarkAllSent();
                    setShowPreviewModal(false);
                  }}
                  className="w-full min-h-[60px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>{isHi ? 'WhatsApp खोलें और भेजें' : 'Open WhatsApp & Send'}</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </a>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyOrder}
                    className="min-h-[52px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {copiedOrder ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>{isHi ? 'कॉपी हो गया!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{isHi ? 'मैसेज कॉपी करें' : 'Copy Order Text'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onMarkAllSent();
                      setShowPreviewModal(false);
                    }}
                    className="min-h-[52px] rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isHi ? 'भेजा गया मार्क करें' : 'Mark as Sent'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
