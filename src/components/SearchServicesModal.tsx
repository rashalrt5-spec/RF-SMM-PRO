import React, { useState, useMemo } from 'react';

interface ServiceData {
  id: string;
  category: string;
  name: string;
  price: number;
  min: number;
  max: number;
  desc?: string;
  apiServiceId?: string;
  serviceType?: string;
  avgTime?: string;
}

interface SearchServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceData[];
  categories: string[];
  onSelectService: (service: ServiceData) => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const SearchServicesModal: React.FC<SearchServicesModalProps> = ({
  isOpen,
  onClose,
  services,
  categories,
  onSelectService,
  haptic = (_type?: any) => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const PLATFORM_FILTERS = [
    { id: 'all', label: 'সব সার্ভিস', icon: 'fas fa-th-large', color: 'text-amber-400' },
    { id: 'telegram', label: 'Telegram', icon: 'fab fa-telegram-plane', color: 'text-sky-400' },
    { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f', color: 'text-blue-400' },
    { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: 'text-red-500' },
    { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: 'text-pink-400' },
    { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: 'text-cyan-400' },
    { id: 'twitter', label: 'Twitter / X', icon: 'fab fa-twitter', color: 'text-blue-300' },
    { id: 'website', label: 'Website / SEO', icon: 'fas fa-globe', color: 'text-emerald-400' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: 'text-green-400' },
  ];

  const matchesPlatform = (s: ServiceData, pId: string) => {
    if (pId === 'all') return true;
    const p = pId.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const cat = (s.category || '').toLowerCase();
    const full = `${name} ${cat}`;

    if (p === 'telegram') return full.includes('telegram') || full.includes('tg');
    if (p === 'facebook') return full.includes('facebook') || full.includes('fb');
    if (p === 'youtube') return full.includes('youtube') || full.includes('yt');
    if (p === 'instagram') return full.includes('instagram') || full.includes('ig');
    if (p === 'tiktok') return full.includes('tiktok') || full.includes('tt');
    if (p === 'twitter') return full.includes('twitter') || full.includes(' x ') || full.includes('tweet');
    if (p === 'website') return full.includes('web') || full.includes('seo') || full.includes('traffic');
    if (p === 'whatsapp') return full.includes('whatsapp') || full.includes('wa');
    return full.includes(p);
  };

  const filteredServices = useMemo(() => {
    let list = services;
    
    // Filter by platform first (e.g. Telegram)
    if (selectedPlatform !== 'all') {
      list = list.filter((s) => matchesPlatform(s, selectedPlatform));
    }

    // Filter by specific category if chosen
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((s) => s.category === selectedCategoryFilter);
    }

    // Filter by text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.apiServiceId && s.apiServiceId.toLowerCase().includes(q)) ||
          s.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, selectedPlatform, selectedCategoryFilter, searchQuery]);

  // Categories filtered to current platform
  const visibleCategories = useMemo(() => {
    if (selectedPlatform === 'all') return categories;
    return categories.filter((cat) => {
      const matchingServices = services.filter((s) => s.category === cat && matchesPlatform(s, selectedPlatform));
      return matchingServices.length > 0;
    });
  }, [categories, selectedPlatform, services]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-blue-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-blue-500/10 text-white space-y-3.5 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white text-lg">
              <i className="fas fa-search"></i>
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>সার্ভিস সার্চ ও রেট</span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  {filteredServices.length} টি সার্ভিস
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">টেলিগ্রাম বা যেকোনো প্ল্যাটফর্মে চাপ দিয়ে সার্ভিস বেছে নিন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              haptic('light');
            }}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Live Search Input Field */}
        <div className="relative flex-shrink-0">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সার্ভিস নাম বা কোড লিখুন (যেমন: Telegram, Members, 18384)..."
            className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400/60 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>

        {/* Platform Filter Buttons (টেলিগ্রাম, ফেসবুক, টিকটক ইত্যাদি) */}
        <div className="space-y-1.5 flex-shrink-0">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <i className="fas fa-layer-group text-cyan-400"></i> প্ল্যাটফর্ম নির্বাচন করুন:
            </span>
            {selectedPlatform !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatform('all');
                  setSelectedCategoryFilter('all');
                  haptic('light');
                }}
                className="text-[10px] text-cyan-400 hover:underline font-bold"
              >
                রিসেট করুন ✕
              </button>
            )}
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {PLATFORM_FILTERS.map((p) => {
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(p.id);
                    setSelectedCategoryFilter('all');
                    haptic('light');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? p.id === 'telegram'
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400/50 scale-[1.02]'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-cyan-400/50 scale-[1.02]'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5'
                  }`}
                >
                  <i className={`${p.icon} ${isSelected ? 'text-white' : p.color} text-[11px]`}></i>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Horizontal Scroll (If multiple categories exist for platform) */}
        {visibleCategories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0 no-scrollbar border-t border-white/5 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('all');
                haptic('light');
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-blue-600/80 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              সব সাব-ক্যাটাগরি
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter(cat);
                  haptic('light');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-blue-600/80 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Active Selection Banner */}
        {selectedPlatform !== 'all' && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-sky-500/30 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 text-sky-300 font-bold">
              <i className="fas fa-check-circle text-xs text-sky-400"></i>
              <span>{selectedPlatform === 'telegram' ? '✈️ Telegram' : selectedPlatform.toUpperCase()} সার্ভিসসমূহ ওপেন হয়েছে</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              মোট: {filteredServices.length} টি
            </span>
          </div>
        )}

        {/* Filtered Services List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[260px]">
          {filteredServices.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <i className="fas fa-search text-3xl opacity-30 block mb-1"></i>
              <p className="font-semibold">কোনো সার্ভিস পাওয়া যায়নি!</p>
              <p className="text-[10px] text-slate-500">অন্য কোনো কি-ওয়ার্ড দিয়ে খুঁজে দেখুন</p>
            </div>
          ) : (
            filteredServices.map((svc) => (
              <div
                key={svc.id}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[9px] border border-blue-500/30">
                      #{svc.id.slice(-5)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{svc.category}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs mt-1 leading-snug line-clamp-2">{svc.name}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                    <span className="text-emerald-400 font-bold">৳{(svc.price ?? 0).toFixed(2)} / 1K</span>
                    <span>•</span>
                    <span>Min: {svc.min?.toLocaleString() || 10}</span>
                    <span>•</span>
                    <span>Max: {svc.max?.toLocaleString() || 'Unlimited'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end sm:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectService(svc);
                      haptic('heavy');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
                  >
                    <span>অর্ডার করুন</span>
                    <i className="fas fa-arrow-right text-[9px]"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
