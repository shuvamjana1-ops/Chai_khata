import React, { useState } from 'react';
import {
  KhataBookIcon as BookOpen,
  KhataCheckIcon as Check,
  KhataDownloadIcon as Download,
  KhataTranslateIcon as Globe,
  KhataPlayIcon as Play,
  KhataRefreshIcon as RotateCcw,
  KhataCheckIcon as Save,
  KhataAlertIcon as ShieldAlert,
  KhataSignalOffIcon as WifiOff,
  KhataSignalOnIcon as Wifi,
} from './ui/khata-icons';
import { AppSettings } from '../types/ledger';
import { SAMPLE_VOICE_COMMANDS } from '../utils/voiceParser';
import { displayText } from '../utils/hinglish';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { HoverFeatureCards, HoverFeatureCardItem } from './ui/hover-feature-cards';
import { HoverExpand, HoverExpandItem } from './ui/hover-expand';
import { Cursor1 } from './ui/cursor-1';

interface SampleCommandsAndSettingsProps {
  settings: AppSettings;
  simulatedOffline: boolean;
  offlineQueueCount: number;
  onUpdateSettings: (updated: Partial<AppSettings>) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onRunSampleCommand: (commandText: string) => void;
  onToggleSimulatedOffline: () => void;
}

export const SampleCommandsAndSettings: React.FC<SampleCommandsAndSettingsProps> = ({
  settings,
  simulatedOffline,
  offlineQueueCount,
  onUpdateSettings,
  onResetDemoData,
  onRunSampleCommand,
  onToggleSimulatedOffline,
}) => {
  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerUpiId, setOwnerUpiId] = useState(settings.ownerUpiId);
  const [supplierName, setSupplierName] = useState(settings.supplierName);
  const [supplierPhone, setSupplierPhone] = useState(settings.supplierPhone);
  const [savedBanner, setSavedBanner] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isHi = settings.language === 'hi';

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      shopName: shopName.trim() || 'शर्मा चाय स्टॉल',
      ownerUpiId: ownerUpiId.trim() || 'sharmachai@okaxis',
      supplierName: supplierName.trim() || 'अमूल डेयरी',
      supplierPhone: supplierPhone.trim() || '9811122233',
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleReset = async () => {
    await onResetDemoData();
    setResetBanner(true);
    setTimeout(() => setResetBanner(false), 3000);
  };

  const featureItems: HoverFeatureCardItem[] = [
    {
      name: isHi ? '1. बोलकर उधार + ऑर्डर (Multi-Intent)' : '1. Bolkar Udhaar + Order (Multi-Intent)',
      badgeText: 'Mic → Gemini JSON',
      description: isHi
        ? 'एक ही वाक्य में ग्राहक का उधार लिखें और कल सुबह के दूध/चीनी का ऑर्डर जोड़ें — बिना टाइप किए।'
        : 'Ek hi vaakya mein grahak ka udhaar likhein aur kal subah ke doodh/cheeni ka order jodein — bina type kiye.',
      img: '/banner-chai-stall.svg',
      imgWidth: 420,
      imgClassName: 'w-full h-32 object-cover rounded-2xl border border-amber-900/10',
      fadeBottom: false,
      onClick: () =>
        onRunSampleCommand(
          'Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao'
        ),
    },
    {
      name: isHi ? '2. बोलकर पुष्टि व ₹5,000+ सुरक्षा' : '2. Bolkar Confirm & ₹5,000+ Suraksha',
      badgeText: 'SpeechSynthesis hi-IN',
      description: isHi
        ? 'सेव करने से पहले ऐप हिंदी में बोलकर सुनाता है और "हाँ/नहीं" पूछता है। ₹5,000 से ऊपर अतिरिक्त सुरक्षा।'
        : 'Save karne se pehle app bolkar sunata hai aur "Haan/Nahi" poochta hai. ₹5,000 se upar extra safety check.',
      img: '/banner-offline-voice.svg',
      imgWidth: 420,
      imgClassName: 'w-full h-32 object-cover rounded-2xl border border-amber-900/10',
      fadeBottom: false,
      onClick: () =>
        onRunSampleCommand('Suresh ke 6000 rupaye rashan ke udhaar likho'),
    },
  ];

  const expandWorkflowItems: HoverExpandItem[] = [
    {
      label: isHi ? 'बोलकर उधार व जमा (Voice Khata)' : 'Bolkar Udhaar & Jama (Voice Khata)',
      sublabel: 'ADD_CREDIT · RECEIVE_PAYMENT',
      image: '/banner-chai-stall.svg',
      imageAlt: 'ChaiKhata Voice Command Banner',
      description: isHi
        ? 'रमेश के 40 रुपये उधार लिखो — 10 सेकंड में बिना टाइप किए'
        : 'Ramesh ke 40 rupaye udhaar likho — 10 second mein bina type kiye',
    },
    {
      label: isHi ? 'WhatsApp + UPI पेमेंट रिमाइंडर' : 'WhatsApp + UPI Payment Reminder',
      sublabel: 'upi://pay · wa.me',
      image: '/banner-khata-upi.svg',
      imageAlt: 'WhatsApp UPI Payment Reminder Banner',
      description: isHi
        ? 'विनम्र हिंदी संदेश के साथ ग्राहक को सीधा UPI पेमेंट लिंक भेजें'
        : 'Polite Hinglish sandesh ke saath grahak ko seedha UPI payment link bhejein',
    },
    {
      label: isHi ? 'कल सुबह का सप्लायर ऑर्डर' : 'Kal Subah ka Supplier Order',
      sublabel: 'ADD_ORDER_ITEM',
      image: '/banner-dairy-order.svg',
      imageAlt: 'Supplier Dairy Order Banner',
      description: isHi
        ? '20 पैकेट दूध, 5 किलो चीनी — एक क्लिक में सप्लायर को WhatsApp करें'
        : '20 packet doodh, 5 kilo cheeni — ek click mein supplier ko WhatsApp karein',
    },
    {
      label: isHi ? 'ऑफ़लाइन क्यू व ₹5,000+ सुरक्षा' : 'Offline Queue & ₹5,000+ Suraksha',
      sublabel: 'IndexedDB · SpeechSynthesis',
      image: '/banner-offline-voice.svg',
      imageAlt: 'Offline Queue and Safety Gate Banner',
      description: isHi
        ? 'नेट न होने पर आवाज़ क्यू में सेव होती है और हर एंट्री बोलकर कन्फ़र्म होती है'
        : 'Net na hone par aawaz queue mein save hoti hai aur har entry bolkar confirm hoti hai',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Interactive HoverFeatureCards, HoverExpand & Cursor1 Showcase */}
      <section aria-label={isHi ? 'मुख्य विशेषताएं' : 'Mukhya Visheshtayein'} className="space-y-4">
        <HoverFeatureCards items={featureItems} />
        <HoverExpand items={expandWorkflowItems} />
        <Cursor1
          isHi={isHi}
          onTriggerDemo={() =>
            onRunSampleCommand('Priya madam ke dhai sau rupaye udhaar likho')
          }
        />
      </section>

      {/* SECTION 1: 10 Sample Hindi Voice Commands (/docs) */}
      <section aria-labelledby="sample-commands-heading" className="space-y-4">
        <div className="rounded-xl khata-banner p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>/docs · 10 Sample Hindi / Hinglish Voice Commands</span>
            </div>
            <h2
              id="sample-commands-heading"
              className="text-2xl font-extrabold font-display mt-1"
            >
              {isHi
                ? '10 हिंदी वॉइस कमांड उदाहरण (दबाकर अभी ट्राई करें)'
                : '10 Hinglish Voice Command Udaharan (Dabakar Abhi Try Karein)'}
            </h2>
            <p className="text-sm text-amber-100/90 mt-0.5">
              {isHi
                ? 'किसी भी कार्ड पर "ट्राई करें" दबाएं: ऐप आवाज़ समझकर पुष्टि कार्ड दिखाएगा और बोलकर सुनाएगा।'
                : 'Kisi bhi card par "Abhi Try Karein" dabayein: app aawaz samajhkar confirm card dikhayega.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SAMPLE_VOICE_COMMANDS.map((cmd, index) => (
            <div
              key={cmd.id}
              className="rounded-xl khata-sheet p-4 flex flex-col justify-between gap-3 hover:border-[#5C2314] transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>
                    {String(index + 1).padStart(2, '0')}. {cmd.category.toUpperCase()}
                  </span>
                  <span className="text-stone-500">
                    {displayText(cmd.expectedSummaryHi, isHi)}
                  </span>
                </div>
                <p className="text-lg font-extrabold text-stone-900 leading-snug">
                  &ldquo;{isHi ? cmd.textHi : cmd.textHinglish}&rdquo;
                </p>
                <p className="text-sm text-stone-600 italic">
                  &ldquo;{isHi ? cmd.textHinglish : cmd.meaningEn}&rdquo;
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRunSampleCommand(cmd.textHinglish)}
                className="w-full min-h-[48px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Play className="w-4 h-4 fill-amber-950" />
                <span>
                  {isHi ? 'अभी ट्राई करें (Run Command)' : 'Abhi Try Karein (Run Command)'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: Shop Settings, Offline Mode Simulator & Demo Reset */}
      <section aria-labelledby="settings-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 rounded-xl khata-sheet p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 id="settings-heading" className="text-xl font-extrabold text-amber-950 font-display">
              {isHi ? 'दुकान और UPI सेटिंग्स' : 'Dukaan aur UPI Settings'}
            </h2>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ language: settings.language === 'hi' ? 'en' : 'hi' })
              }
              className="min-h-[44px] px-3.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-sm flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4" />
              <span>
                {settings.language === 'hi'
                  ? 'Hinglish में बदलें'
                  : 'हिंदी (Devanagari) में बदलें'}
              </span>
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label
                htmlFor="shop-name-input"
                className="block text-sm font-bold text-stone-700 mb-1"
              >
                {isHi ? 'दुकान का नाम (Shop Name)' : 'Dukaan ka Naam (Shop Name)'}
              </label>
              <input
                id="shop-name-input"
                type="text"
                value={displayText(shopName, isHi)}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full min-h-[52px] px-4 rounded-xl bg-[#FAF6F0] border border-stone-300 text-base font-bold text-stone-900"
              />
            </div>

            <div>
              <label
                htmlFor="owner-upi-input"
                className="block text-sm font-bold text-stone-700 mb-1"
              >
                {isHi
                  ? 'दुकानदार की UPI ID (पेमेंट रिमाइंडर लिंक के लिए)'
                  : 'Dukaandaar ki UPI ID (Payment reminder link ke liye)'}
              </label>
              <input
                id="owner-upi-input"
                type="text"
                value={ownerUpiId}
                onChange={(e) => setOwnerUpiId(e.target.value)}
                className="w-full min-h-[52px] px-4 rounded-xl bg-[#FAF6F0] border border-stone-300 text-base font-mono font-bold text-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="supplier-name-input"
                  className="block text-sm font-bold text-stone-700 mb-1"
                >
                  {isHi ? 'सप्लायर का नाम' : 'Supplier ka Naam'}
                </label>
                <input
                  id="supplier-name-input"
                  type="text"
                  value={displayText(supplierName, isHi)}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-[#FAF6F0] border border-stone-300 text-base font-bold text-stone-900"
                />
              </div>

              <div>
                <label
                  htmlFor="supplier-phone-input"
                  className="block text-sm font-bold text-stone-700 mb-1"
                >
                  {isHi ? 'सप्लायर WhatsApp नंबर' : 'Supplier WhatsApp Number'}
                </label>
                <input
                  id="supplier-phone-input"
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-[#FAF6F0] border border-stone-300 text-base font-mono font-bold text-stone-900"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[56px] rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
          >
            {savedBanner ? (
              <>
                <Check className="w-6 h-6" />
                <span>{isHi ? 'सेटिंग्स सेव हो गईं!' : 'Settings Save Ho Gayin!'}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isHi ? 'सेटिंग्स सेव करें' : 'Settings Save Karein'}</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: Offline Mode Test, PWA Install & Demo Reset */}
        <div className="lg:col-span-5 space-y-4">
          {/* Offline Queue Test Card */}
          <div className="rounded-xl khata-sheet p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-amber-950 font-display">
                {isHi ? 'ऑफ़लाइन क्यू टेस्ट (Offline Mode)' : 'Offline Queue Test (Offline Mode)'}
              </h3>
              {simulatedOffline ? (
                <WifiOff className="w-6 h-6 text-amber-700" />
              ) : (
                <Wifi className="w-6 h-6 text-emerald-700" />
              )}
            </div>
            <p className="text-sm text-stone-600">
              {isHi
                ? 'कमज़ोर इंटरनेट होने पर आवाज़ लोकल क्यू में सेव हो जाती है और नेट आने पर अपने-आप प्रोसेस होती है।'
                : 'Kamzor internet hone par aawaz local queue mein save ho jaati hai aur net aane par apne-aap process hoti hai.'}
            </p>
            <div className="text-xs font-bold text-stone-500">
              {isHi ? 'क्यू में पेंडिंग आवाज़:' : 'Queue mein pending aawaz:'}{' '}
              <strong className="font-mono">{offlineQueueCount}</strong>
            </div>
            <button
              type="button"
              onClick={onToggleSimulatedOffline}
              className={`w-full min-h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
                simulatedOffline
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
              }`}
            >
              {simulatedOffline ? (
                <>
                  <Wifi className="w-5 h-5" />
                  <span>
                    {isHi ? 'वापस ऑनलाइन आएं (क्यू प्रोसेस करें)' : 'Wapas Online Aayein (Queue Process Karein)'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5" />
                  <span>
                    {isHi ? 'ऑफ़लाइन मोड टेस्ट करें (Simulate Offline)' : 'Offline Mode Test Karein (Simulate Offline)'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Install PWA & Demo Data Reset Card */}
          <div className="rounded-xl khata-sheet p-5 space-y-3">
            <h3 className="text-lg font-extrabold text-amber-950 font-display">
              {isHi ? 'ऐप इंस्टॉल व डेमो डेटा' : 'App Install & Demo Data'}
            </h3>

            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isIOS ? setShowIOSGuide(true) : install())}
                className="w-full min-h-[52px] rounded-2xl bg-amber-900 hover:bg-amber-950 text-white font-bold text-base flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>
                  {isHi ? 'फ़ोन में ChaiKhata ऐप इंस्टॉल करें' : 'Phone mein ChaiKhata App Install Karein'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full min-h-[52px] rounded-2xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-900 font-bold text-base flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>
                {resetBanner
                  ? isHi
                    ? 'डेमो डेटा रीसेट हो गया ✅'
                    : 'Demo Data Reset Ho Gaya ✅'
                  : isHi
                    ? 'डेमो डेटा रीसेट करें (Reset Demo Data)'
                    : 'Demo Data Reset Karein'}
              </span>
            </button>
          </div>

          {/* Architecture & Honest Limitations Card */}
          <div className="rounded-3xl bg-stone-100 border border-stone-200 p-5 space-y-2.5 text-sm text-stone-700">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-base">
              <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0" />
              <span>
                {isHi
                  ? 'आर्किटेक्चर व ईमानदार सीमाएं (Limitations)'
                  : 'Architecture & Emaandaar Seemayein (Limitations)'}
              </span>
            </div>
            <ul className="space-y-1.5 list-disc pl-5 text-xs sm:text-sm leading-relaxed">
              <li>
                <strong>{isHi ? 'सुरक्षित पेमेंट:' : 'Surakshit Payment:'}</strong>{' '}
                {isHi
                  ? 'यह ऐप कभी भी बैंक खाते से पैसे नहीं काटता — यह केवल मानक UPI लिंक (upi://pay) और WhatsApp संदेश बनाता है।'
                  : 'Yeh app kabhi bhi bank khate se paise nahi kaatta — yeh keval standard UPI link (upi://pay) aur WhatsApp sandesh banata hai.'}
              </li>
              <li>
                <strong>{isHi ? 'प्रोडक्शन प्रॉक्सी:' : 'Server Proxy:'}</strong>{' '}
                {isHi
                  ? 'Gemini API कॉल सर्वर प्रॉक्सी (/api/gemini/parse-voice) से सुरक्षित रूप से होती हैं और ऑफ़लाइन होने पर लोकल हिंदी पार्सर काम करता है।'
                  : 'Gemini API call server proxy (/api/gemini/parse-voice) se surakshit roop se hoti hain aur offline hone par local Hindi/Hinglish parser kaam karta hai.'}
              </li>
              <li>
                <strong>{isHi ? 'सीमाएं (Limitations):' : 'Seemayein (Limitations):'}</strong>{' '}
                {isHi
                  ? 'बहुत तेज़ ट्रैफिक शोर में आवाज़ अस्पष्ट हो सकती है (इसके लिए हर एंट्री की बोलकर पुष्टि और नंबर-पैड विकल्प दिया गया है)। डेटा डिफ़ॉल्ट रूप से इसी फ़ोन (IndexedDB) में रहता है।'
                  : 'Bahut tez traffic shor mein aawaz aspasht ho sakti hai (iske liye har entry ki bolkar confirm aur number-pad vikalp diya gaya hai). Data is phone (IndexedDB) mein rehta hai.'}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">Install on iPhone / iPad</h3>
            <p className="text-sm text-stone-600">
              1. Tap the <strong>Share</strong> button in Safari toolbar.
              <br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[48px] rounded-xl bg-amber-800 text-white font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
