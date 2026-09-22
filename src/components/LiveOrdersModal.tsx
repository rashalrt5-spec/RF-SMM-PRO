import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface OrderData {
  id: string;
  uid?: string;
  service: string;
  qty: number;
  link?: string;
  cost?: number;
  status: string;
  timestamp?: any;
  createdAt?: string;
  time?: string;
  apiOrderId?: string | number;
  apiError?: string;
  apiStatus?: string;
}

export interface LiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordersList: OrderData[];
  onNewOrderClick: () => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
  onSelectService?: (serviceName: string) => void;
}

interface StreamOrder {
  id: string;
  user: string;
  avatarSeed: string;
  location: string;
  service: string;
  serviceShort: string;
  qty: number;
  status: 'Completed' | 'Processing' | 'In Progress';
  progress: number;
  category: 'Facebook' | 'TikTok' | 'YouTube' | 'Telegram' | 'Instagram' | 'Twitter' | 'Other';
  timeAgo: string;
  timestampMs: number;
  isNew?: boolean;
  isMine?: boolean;
  speedTag?: string;
  cost?: number;
  link?: string;
}

// Initial realistic live orders pool with authentic BD usernames & locations
const INITIAL_STREAM_ORDERS: StreamOrder[] = [
  {
    id: '89421',
    user: 'tanvir_99***',
    avatarSeed: 'tanvir',
    location: 'ঢাকা',
    service: 'TikTok FYP Video Views • ১০০% রিয়েল অ্যালগরিদম ভাইরাল বুস্ট',
    serviceShort: 'TikTok FYP Video Views',
    qty: 25000,
    status: 'In Progress',
    progress: 85,
    category: 'TikTok',
    timeAgo: 'এইমাত্র',
    timestampMs: Date.now() - 4000,
    speedTag: '⚡ ইনস্ট্যান্ট স্টার্ট',
  },
  {
    id: '89420',
    user: 'shakib_ctg***',
    avatarSeed: 'shakib',
    location: 'চট্টগ্রাম',
    service: 'Facebook Page Real Followers • নন-ড্রপ লাইফটাইম গ্যারান্টি',
    serviceShort: 'Facebook Page Real Followers',
    qty: 2000,
    status: 'Processing',
    progress: 45,
    category: 'Facebook',
    timeAgo: '১২ সেকেন্ড আগে',
    timestampMs: Date.now() - 12000,
    speedTag: '🛡️ লাইফটাইম রিফিল',
  },
  {
    id: '89419',
    user: 'sumon_smm***',
    avatarSeed: 'sumon',
    location: 'সিলেট',
    service: 'Telegram Channel Members • বাংলাদেশি ও গ্লোবাল রিয়েল ইউজার',
    serviceShort: 'Telegram Channel Active Members',
    qty: 1500,
    status: 'Completed',
    progress: 100,
    category: 'Telegram',
    timeAgo: '৪৫ সেকেন্ড আগে',
    timestampMs: Date.now() - 45000,
    speedTag: '✅ ১০০% সম্পন্ন',
  },
  {
    id: '89418',
    user: 'farhan_pro***',
    avatarSeed: 'farhan',
    location: 'রাজশাহী',
    service: 'YouTube 4000 Hours Monetization WatchTime • মনিটাইজেশন স্পেশাল',
    serviceShort: 'YouTube 4000 Hours WatchTime',
    qty: 1000,
    status: 'In Progress',
    progress: 60,
    category: 'YouTube',
    timeAgo: '১ মিনিট আগে',
    timestampMs: Date.now() - 75000,
    speedTag: '🛡️ নিরাপদ রিটেনশন',
  },
  {
    id: '89417',
    user: 'rakib_bd***',
    avatarSeed: 'rakib',
    location: 'কুমিল্লা',
    service: 'Instagram HQ Active Followers • রিয়েল প্রোফাইল ড্রপ-প্রুফ',
    serviceShort: 'Instagram HQ Real Followers',
    qty: 5000,
    status: 'Completed',
    progress: 100,
    category: 'Instagram',
    timeAgo: '২ মিনিট আগে',
    timestampMs: Date.now() - 120000,
    speedTag: '⚡ হাই স্পিড সার্ভার',
  },
  {
    id: '89416',
    user: 'mehedi_07***',
    avatarSeed: 'mehedi',
    location: 'খুলনা',
    service: 'Facebook 60K WatchTime Views • পেজ মনিটাইজেশন প্যাকেজ',
    serviceShort: 'Facebook 60K WatchTime Views',
    qty: 60000,
    status: 'Processing',
    progress: 30,
    category: 'Facebook',
    timeAgo: '৩ মিনিট আগে',
    timestampMs: Date.now() - 180000,
    speedTag: '💎 বাল্ক অর্ডার',
  },
  {
    id: '89415',
    user: 'arif_khan***',
    avatarSeed: 'arif',
    location: 'বরিশাল',
    service: 'TikTok Post Real Likes • ইনস্ট্যান্ট অর্গানিক রিচ বুস্টার',
    serviceShort: 'TikTok Real Post Likes',
    qty: 3000,
    status: 'Completed',
    progress: 100,
    category: 'TikTok',
    timeAgo: '৪ মিনিট আগে',
    timestampMs: Date.now() - 240000,
    speedTag: '🔥 ভাইরাল বুস্ট',
  },
  {
    id: '89414',
    user: 'nasim_s***',
    avatarSeed: 'nasim',
    location: 'রংপুর',
    service: 'Telegram Post Instant Reactions • 🔥 👍 ❤️ ইমোজি বুস্ট',
    serviceShort: 'Telegram Post Reactions',
    qty: 10000,
    status: 'Completed',
    progress: 100,
    category: 'Telegram',
    timeAgo: '৫ মিনিট আগে',
    timestampMs: Date.now() - 300000,
    speedTag: '⚡ ১ সেকেন্ডে স্টার্ট',
  },
];

// Pool of dynamic simulated incoming orders
const INCOMING_SIMULATED_POOL = [
  {
    user: 'fahim_99***',
    location: 'ঢাকা',
    service: 'TikTok FYP Viral Views • ১০০% রিয়েল স্পিড',
    serviceShort: 'TikTok FYP Viral Views',
    qty: 50000,
    category: 'TikTok' as const,
    speedTag: '⚡ ইনস্ট্যান্ট স্টার্ট',
  },
  {
    user: 'al_amin***',
    location: 'গাজীপুর',
    service: 'Facebook Profile Real Followers • ১০০% নন-ড্রপ',
    serviceShort: 'Facebook Profile Real Followers',
    qty: 1500,
    category: 'Facebook' as const,
    speedTag: '🛡️ লাইফটাইম রিফিল',
  },
  {
    user: 'kamrul_bd***',
    location: 'চট্টগ্রাম',
    service: 'Telegram Active Channel Members • রিয়েল প্রোফাইল',
    serviceShort: 'Telegram Active Channel Members',
    qty: 2500,
    category: 'Telegram' as const,
    speedTag: '🚀 হাই স্পিড',
  },
  {
    user: 'sohel_rana***',
    location: 'ময়মনসিংহ',
    service: 'YouTube Real Subscribers • লাইফটাইম গ্যারান্টি',
    serviceShort: 'YouTube Real Subscribers',
    qty: 1000,
    category: 'YouTube' as const,
    speedTag: '✅ ১০০% নিরাপদ',
  },
  {
    user: 'tanjil_smm***',
    location: 'নারায়ণগঞ্জ',
    service: 'Instagram Reels Viral Views • এক্সপ্লোর পেজ বুস্ট',
    serviceShort: 'Instagram Reels Viral Views',
    qty: 30000,
    category: 'Instagram' as const,
    speedTag: '🔥 এক্সপ্লোর ভাইরাল',
  },
  {
    user: 'hasan_01***',
    location: 'সিলেট',
    service: 'Facebook Page Likes & Followers Combo Pack',
    serviceShort: 'Facebook Page Likes & Followers',
    qty: 3000,
    category: 'Facebook' as const,
    speedTag: '⚡ ইনস্ট্যান্ট স্টার্ট',
  },
  {
    user: 'rubel_s***',
    location: 'বগুড়া',
    service: 'TikTok Real Followers • প্রিমিয়াম হাই কোয়ালিটি',
    serviceShort: 'TikTok Real Followers',
    qty: 2000,
    category: 'TikTok' as const,
    speedTag: '⭐ প্রিমিয়াম একাউন্ট',
  },
  {
    user: 'jahid_bd***',
    location: 'যশোর',
    service: 'YouTube High Retention Views • মনিটাইজেশন সেফ',
    serviceShort: 'YouTube High Retention Views',
    qty: 10000,
    category: 'YouTube' as const,
    speedTag: '🟢 অর্গানিক রিটেনশন',
  },
];

// Helper: Synthesizer for subtle chime on new order
const playSubtleChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio policy restrictions
  }
};

// Platform visual styling metadata
const getPlatformConfig = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('tiktok')) {
    return {
      icon: 'fab fa-tiktok',
      color: '#00F2FE',
      badgeBg: 'bg-black text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,242,254,0.2)]',
      pillBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      gradient: 'from-cyan-500 via-teal-500 to-rose-500',
      name: 'TikTok',
    };
  }
  if (cat.includes('facebook')) {
    return {
      icon: 'fab fa-facebook-f',
      color: '#1877F2',
      badgeBg: 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-[0_0_10px_rgba(24,119,242,0.2)]',
      pillBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      gradient: 'from-blue-600 to-indigo-600',
      name: 'Facebook',
    };
  }
  if (cat.includes('youtube')) {
    return {
      icon: 'fab fa-youtube',
      color: '#FF0000',
      badgeBg: 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(255,0,0,0.2)]',
      pillBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      gradient: 'from-red-600 to-rose-600',
      name: 'YouTube',
    };
  }
  if (cat.includes('telegram')) {
    return {
      icon: 'fab fa-telegram-plane',
      color: '#229ED9',
      badgeBg: 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_10px_rgba(34,158,217,0.2)]',
      pillBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      gradient: 'from-sky-500 to-cyan-500',
      name: 'Telegram',
    };
  }
  if (cat.includes('instagram')) {
    return {
      icon: 'fab fa-instagram',
      color: '#E1306C',
      badgeBg: 'bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_10px_rgba(225,48,108,0.2)]',
      pillBg: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      gradient: 'from-pink-500 via-rose-500 to-amber-500',
      name: 'Instagram',
    };
  }
  return {
    icon: 'fas fa-bolt',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    pillBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    gradient: 'from-emerald-500 to-teal-500',
    name: 'Social',
  };
};

export const LiveOrdersModal: React.FC<LiveOrdersModalProps> = ({
  isOpen,
  onClose,
  ordersList,
  onNewOrderClick,
  haptic = () => {},
  onSelectService,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'stream' | 'my' | 'trending'>('stream');
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic live stream state
  const [streamOrders, setStreamOrders] = useState<StreamOrder[]>(INITIAL_STREAM_ORDERS);
  const [ordersCompletedToday, setOrdersCompletedToday] = useState(3419);
  const [activeLiveUsers, setActiveLiveUsers] = useState(148);

  const poolIndexRef = useRef(0);

  // Live order incoming stream simulator
  useEffect(() => {
    if (!isOpen || !isLiveActive) return;

    const interval = setInterval(() => {
      const poolItem = INCOMING_SIMULATED_POOL[poolIndexRef.current % INCOMING_SIMULATED_POOL.length];
      poolIndexRef.current += 1;

      const randomId = String(89422 + Math.floor(Math.random() * 50) + poolIndexRef.current);
      const isInstant = Math.random() > 0.45;

      const newOrder: StreamOrder = {
        id: randomId,
        user: poolItem.user,
        avatarSeed: poolItem.user.split('_')[0],
        location: poolItem.location,
        service: poolItem.service,
        serviceShort: poolItem.serviceShort,
        qty: poolItem.qty,
        category: poolItem.category,
        status: isInstant ? 'Processing' : 'In Progress',
        progress: Math.floor(Math.random() * 40) + 20,
        timeAgo: 'এইমাত্র',
        timestampMs: Date.now(),
        speedTag: poolItem.speedTag,
        isNew: true,
      };

      if (soundEnabled) {
        playSubtleChime();
      }

      setStreamOrders((prev) => [newOrder, ...prev.slice(0, 29)]);
      setOrdersCompletedToday((c) => c + 1);
      setActiveLiveUsers((u) => Math.max(120, Math.min(195, u + (Math.random() > 0.5 ? 1 : -1))));
    }, 4500);

    return () => clearInterval(interval);
  }, [isOpen, isLiveActive, soundEnabled]);

  // Format real user orders from props
  const formattedUserOrders = useMemo(() => {
    return ordersList.map((o) => {
      const catLower = (o.service || '').toLowerCase();
      let category: StreamOrder['category'] = 'Other';
      if (catLower.includes('tiktok')) category = 'TikTok';
      else if (catLower.includes('facebook') || catLower.includes('fb')) category = 'Facebook';
      else if (catLower.includes('youtube')) category = 'YouTube';
      else if (catLower.includes('telegram') || catLower.includes('tg')) category = 'Telegram';
      else if (catLower.includes('instagram') || catLower.includes('ig')) category = 'Instagram';

      const isCompleted = o.status === 'Completed' || o.status === 'Success';
      const isInProgress = o.status === 'In Progress' || o.status === 'Processing';

      return {
        id: o.id.slice(-6) || String(o.id),
        user: 'আমার অর্ডার',
        avatarSeed: 'me',
        location: 'আমার একাউন্ট',
        service: o.service,
        serviceShort: o.service,
        qty: o.qty || 1000,
        status: (isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Processing') as StreamOrder['status'],
        progress: isCompleted ? 100 : isInProgress ? 65 : 20,
        category,
        timeAgo: o.createdAt || (o.timestamp?.toDate ? o.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'),
        timestampMs: Date.now(),
        isMine: true,
        cost: o.cost,
        link: o.link,
      };
    });
  }, [ordersList]);

  // Filtered orders for stream
  const filteredStreamOrders = useMemo(() => {
    let list = streamOrders;

    if (filterPlatform !== 'all') {
      list = list.filter((item) => item.category.toLowerCase() === filterPlatform.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.service.toLowerCase().includes(q) ||
          item.id.includes(q) ||
          item.user.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
      );
    }

    return list;
  }, [streamOrders, filterPlatform, searchQuery]);

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    haptic('light');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleQuickOrder = (serviceName: string) => {
    haptic('heavy');
    onClose();
    if (onSelectService) {
      onSelectService(serviceName);
    } else {
      onNewOrderClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-[#0B0F17] to-black border border-emerald-500/30 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-white my-auto max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Glowing Edge */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-cyan-400 to-amber-400 flex-shrink-0 animate-pulse" />

        {/* Header Bar */}
        <div className="p-3.5 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Live Indicator Icon */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/30 to-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg font-black shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <i className="fas fa-satellite-dish animate-pulse"></i>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
                  <span>লাইভ অর্ডার ফিড</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE REAL-TIME
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                সারাদেশ থেকে গ্রাহকদের রিয়েল-টাইম অর্ডার ও অটো ডেলিভারি স্ট্রিম
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                haptic('light');
              }}
              title={soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'অর্ডার সাউন্ড চালু করুন'}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <i className={`fas ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>

            {/* Pause/Resume Stream */}
            <button
              type="button"
              onClick={() => {
                setIsLiveActive(!isLiveActive);
                haptic('light');
              }}
              title={isLiveActive ? 'স্ট্রিম সাময়িক থামান' : 'স্ট্রিম চালু করুন'}
              className={`px-2.5 h-8 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition ${
                isLiveActive
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
              }`}
            >
              <i className={`fas ${isLiveActive ? 'fa-pause' : 'fa-play'} text-[9px]`}></i>
              <span className="hidden sm:inline">{isLiveActive ? 'চলছে' : 'পজ'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                haptic('light');
              }}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-sm transition"
              title="বন্ধ করুন"
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Clean Live Stats Counter Strip */}
        <div className="grid grid-cols-3 gap-2 px-3 sm:px-5 py-2.5 bg-slate-950/80 border-b border-white/5 flex-shrink-0 text-center">
          <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <i className="fas fa-boxes-packing text-emerald-400 text-[10px]"></i>
              <span>আজকের সম্পন্ন অর্ডার</span>
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
              {ordersCompletedToday.toLocaleString()}+ টি
            </span>
          </div>

          <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <i className="fas fa-users text-cyan-400 text-[10px]"></i>
              <span>লাইভ সক্রিয় ইউজার</span>
            </span>
            <span className="text-xs sm:text-sm font-black text-cyan-300 font-mono mt-0.5 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              {activeLiveUsers} জন
            </span>
          </div>

          <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <i className="fas fa-bolt text-amber-400 text-[10px]"></i>
              <span>গড় স্টার্ট স্পিড</span>
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
              ০-৩০ সেকেন্ড
            </span>
          </div>
        </div>

        {/* Tab Switcher & View Mode Toggle */}
        <div className="px-3 sm:px-5 pt-3 pb-2.5 bg-[#080C14] border-b border-white/5 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* 3 Main Tabs */}
            <div className="flex flex-1 rounded-2xl bg-black/50 p-1 border border-white/10 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stream');
                  haptic('light');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'stream'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-bolt-lightning text-xs"></i>
                <span>লাইভ স্ট্রিম</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'stream' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-emerald-400'
                }`}>
                  {filteredStreamOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('my');
                  haptic('light');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'my'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-receipt text-xs"></i>
                <span>আমার অর্ডার</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'my' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}>
                  {ordersList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('trending');
                  haptic('light');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'trending'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-fire text-xs"></i>
                <span>টপ ট্রেন্ডিং</span>
              </button>
            </div>

            {/* Layout Switcher (Card vs Compact Feed) */}
            {activeTab === 'stream' && (
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('card');
                    haptic('light');
                  }}
                  title="কার্ড ভিউ"
                  className={`px-2 py-1 rounded-lg text-xs transition ${
                    viewMode === 'card' ? 'bg-white/15 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <i className="fas fa-table-cells-large"></i>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('compact');
                    haptic('light');
                  }}
                  title="কমপ্যাক্ট স্লিম ভিউ"
                  className={`px-2 py-1 rounded-lg text-xs transition ${
                    viewMode === 'compact' ? 'bg-white/15 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
            )}
          </div>

          {/* Platform Filters & Search Bar for Live Stream */}
          {activeTab === 'stream' && (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-1">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: 'সকল অর্ডার', icon: 'fas fa-globe' },
                  { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f' },
                  { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok' },
                  { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube' },
                  { id: 'telegram', label: 'Telegram', icon: 'fab fa-telegram-plane' },
                  { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFilterPlatform(f.id);
                      haptic('light');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 flex-shrink-0 ${
                      filterPlatform === f.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    <i className={`${f.icon} text-[10px]`}></i>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Fast Search Filter */}
              <div className="relative min-w-[170px]">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="অর্ডার বা ইউজার খুঁজুন..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    <i className="fas fa-xmark"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Scrollable List Area */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2.5 flex-1 min-h-[320px] max-h-[58vh]">

          {/* VIEW 1: LIVE STREAM ORDERS */}
          {activeTab === 'stream' && (
            <div>
              {filteredStreamOrders.length === 0 ? (
                <div className="text-center py-14 px-4 rounded-3xl bg-slate-950/40 border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto text-xl">
                    <i className="fas fa-search"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">কোনো অর্ডার মেলেনি</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      অন্য ফিল্টার সিলেক্ট করুন অথবা সার্চ কি-ওয়ার্ড পরিবর্তন করুন।
                    </p>
                  </div>
                </div>
              ) : viewMode === 'card' ? (
                /* CARD VIEW: Clean, modern, rich */
                <div className="space-y-2.5">
                  {filteredStreamOrders.map((order) => {
                    const plat = getPlatformConfig(order.category);
                    const isDone = order.status === 'Completed';

                    return (
                      <div
                        key={order.id}
                        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-3.5 group ${
                          order.isNew
                            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/40'
                            : 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-emerald-500/40 hover:shadow-lg'
                        }`}
                      >
                        {/* Left Platform Accent Bar */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b ${plat.gradient}`} />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                          {/* Left: Avatar + User Info + Service Title */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Platform Icon Badge */}
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-105 ${plat.badgeBg}`}
                            >
                              <i className={plat.icon}></i>
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Top Meta Line: User Tag, Location, Platform, Time */}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px]">
                                {/* Customer Handle */}
                                <span className="font-mono font-bold text-slate-200 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <i className="fas fa-user-circle text-slate-400 text-[9px]"></i>
                                  <span>{order.user}</span>
                                </span>

                                {/* City Tag */}
                                <span className="text-slate-400 bg-white/[0.03] border border-white/5 px-1.5 py-0.5 rounded-md">
                                  📍 {order.location}
                                </span>

                                {/* Platform Pill */}
                                <span className={`font-bold px-2 py-0.5 rounded-md ${plat.pillBg} border`}>
                                  {plat.name}
                                </span>

                                {order.speedTag && (
                                  <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                    {order.speedTag}
                                  </span>
                                )}

                                <span className="text-slate-400 font-mono text-[10px] ml-auto sm:ml-0">
                                  ⏱️ {order.timeAgo}
                                </span>
                              </div>

                              {/* Service Title */}
                              <h4 className="font-bold text-xs sm:text-sm text-white mt-1.5 leading-snug tracking-tight">
                                {order.service}
                              </h4>

                              {/* Live Progress Bar */}
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      isDone
                                        ? 'bg-emerald-400'
                                        : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-pulse'
                                    }`}
                                    style={{ width: `${order.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono whitespace-nowrap flex-shrink-0">
                                  {isDone ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <i className="fas fa-check-circle"></i> ১০০% সম্পন্ন
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">
                                      {order.progress}% ডেলিভারি চলছে...
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Quantity + Action Button */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-shrink-0">
                            {/* Quantity Pill */}
                            <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-black text-xs flex items-center gap-1.5">
                              <i className="fas fa-layer-group text-amber-400 text-[10px]"></i>
                              <span>{order.qty.toLocaleString()} Qty</span>
                            </div>

                            {/* Action Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickOrder(order.serviceShort || order.service)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5"
                            >
                              <span>এই সার্ভিসটি নিন</span>
                              <i className="fas fa-arrow-right text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* COMPACT LIST VIEW: Sleek, high-density stream */
                <div className="space-y-1.5">
                  {filteredStreamOrders.map((order) => {
                    const plat = getPlatformConfig(order.category);
                    const isDone = order.status === 'Completed';

                    return (
                      <div
                        key={order.id}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                          order.isNew
                            ? 'bg-emerald-950/30 border-emerald-400/50 shadow-sm'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Platform Mini Icon */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${plat.badgeBg}`}
                          >
                            <i className={plat.icon}></i>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400 font-bold">{order.user}</span>
                              <span className="text-[9px] text-slate-500">({order.location})</span>
                              <span className="text-[9px] text-slate-400 font-mono ml-auto sm:ml-0">
                                {order.timeAgo}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-white truncate">
                              {order.serviceShort || order.service}
                            </p>
                          </div>
                        </div>

                        {/* Right: Quantity & Quick Order */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/20">
                            {order.qty.toLocaleString()}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickOrder(order.serviceShort || order.service)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <span>নিন</span>
                            <i className="fas fa-chevron-right text-[8px]"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MY ORDERS LIST */}
          {activeTab === 'my' && (
            <div className="space-y-3">
              {formattedUserOrders.length === 0 ? (
                <div className="text-center py-14 px-4 rounded-3xl bg-slate-950/40 border border-white/5 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
                    <i className="fas fa-box-open"></i>
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">আপনার কোনো সক্রিয় অর্ডার নেই</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      আপনি যখন কোনো সার্ভিস অর্ডার করবেন, তা স্বয়ংক্রিয়ভাবে এখানে লাইভ ট্র্যাকিং সহ প্রদর্শিত হবে।
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNewOrderClick();
                        haptic('heavy');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition"
                    >
                      এখনই প্রথম অর্ডার দিন 🚀
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span>আপনার মোট অর্ডার: <b className="text-white">{formattedUserOrders.length}টি</b></span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      সার্ভার লাইভ ট্র্যাকিং সক্রিয়
                    </span>
                  </div>

                  {formattedUserOrders.map((order) => {
                    const plat = getPlatformConfig(order.category);
                    const isDone = order.status === 'Completed';
                    const isPending = order.status === 'Processing';

                    return (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 hover:border-emerald-500/30 transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg flex-shrink-0 ${plat.badgeBg}`}>
                              <i className={plat.icon}></i>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(order.id)}
                                  className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 hover:bg-white/15 transition flex items-center gap-1"
                                >
                                  <span>#{order.id}</span>
                                  <i className="fas fa-copy text-[9px] text-slate-500"></i>
                                </button>
                                <span className="text-slate-400">{order.timeAgo}</span>
                              </div>

                              <h4 className="font-extrabold text-white text-xs sm:text-sm mt-1">
                                {order.service}
                              </h4>

                              {order.link && (
                                <p className="text-[11px] text-sky-400 font-mono truncate max-w-sm mt-0.5">
                                  🔗 {order.link}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end flex-shrink-0">
                            <span
                              className={`px-2.5 py-0.5 rounded-xl text-[10px] font-mono font-bold border ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isPending
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                              }`}
                            >
                              {isDone ? 'Completed ✅' : isPending ? 'Processing ⏳' : 'In Progress ⚡'}
                            </span>

                            <div className="mt-1 font-mono text-xs text-amber-300 font-bold">
                              {order.qty.toLocaleString()} Qty {order.cost ? `• ৳${order.cost}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Footer / Re-order */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">
                            {isDone ? '✅ ডেলিভারি সম্পন্ন হয়েছে' : '⚡ সার্ভারে অটো প্রসেসিং চলছে...'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickOrder(order.service)}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <i className="fas fa-redo text-[10px]"></i>
                            <span>পুনরায় অর্ডার করুন</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: TRENDING SERVICES */}
          {activeTab === 'trending' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-2">
                    <i className="fas fa-fire text-amber-400"></i>
                    <span>বর্তমানে সর্বাধিক বিক্রিত সার্ভিসসমূহ</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">Live Rankings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    {
                      platform: 'TikTok',
                      title: 'TikTok FYP Video Views [Algorithm Boost]',
                      orders: '৮৫০+ অর্ডার আজ',
                      icon: 'fab fa-tiktok',
                      color: 'text-cyan-400',
                      badge: '🔥 Hot Viral',
                    },
                    {
                      platform: 'Facebook',
                      title: 'Facebook Page Real Followers [Non-Drop]',
                      orders: '৭২০+ অর্ডার আজ',
                      icon: 'fab fa-facebook-f',
                      color: 'text-blue-400',
                      badge: '⭐ সেরা প্যাকেজ',
                    },
                    {
                      platform: 'YouTube',
                      title: 'YouTube 4000 Hours WatchTime Monetization',
                      orders: '৫১০+ অর্ডার আজ',
                      icon: 'fab fa-youtube',
                      color: 'text-rose-400',
                      badge: '🛡️ ১০০% নিরাপদ',
                    },
                    {
                      platform: 'Telegram',
                      title: 'Telegram Active Channel Members [Fast]',
                      orders: '৬৪০+ অর্ডার আজ',
                      icon: 'fab fa-telegram-plane',
                      color: 'text-sky-400',
                      badge: '⚡ ইনস্ট্যান্ট স্টার্ট',
                    },
                    {
                      platform: 'Instagram',
                      title: 'Instagram HQ Real Followers [Lifetime]',
                      orders: '৪৩০+ অর্ডার আজ',
                      icon: 'fab fa-instagram',
                      color: 'text-pink-400',
                      badge: '💎 প্রিমিয়াম',
                    },
                    {
                      platform: 'Facebook',
                      title: 'Facebook 60K Minutes Video Views Pack',
                      orders: '৩৮০+ অর্ডার আজ',
                      icon: 'fab fa-facebook-f',
                      color: 'text-blue-400',
                      badge: '🎥 মনিটাইজেশন',
                    },
                  ].map((trend, i) => (
                    <div
                      key={i}
                      onClick={() => handleQuickOrder(trend.title)}
                      className="p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/40 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between gap-2.5 group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-base ${trend.color} group-hover:scale-110 transition shrink-0`}>
                          <i className={trend.icon}></i>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{trend.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">{trend.orders}</span>
                            <span className="text-[9px] bg-white/5 text-slate-300 px-1.5 py-0.2 rounded font-medium">{trend.badge}</span>
                          </div>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-slate-500 text-xs group-hover:text-emerald-400 group-hover:translate-x-0.5 transition shrink-0"></i>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/95 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>অটোমেটিক সার্ভার ডেলিভারি সক্রিয় রয়েছে</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNewOrderClick();
              haptic('heavy');
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 ml-auto"
          >
            <i className="fas fa-plus-circle"></i>
            <span>নতুন অর্ডার দিন (New Order) 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};
