import React, { useState, useMemo } from 'react';

export interface PremiumPackage {
  id: string;
  title: string;
  category: 'facebook' | 'youtube' | 'instagram' | 'tiktok' | 'telegram' | 'combo' | 'other';
  price: number;
  originalPrice?: number;
  badge?: string;
  description: string;
  features: string[];
  speed?: string;
  guarantee?: string;
  linkPlaceholder?: string;
  popular?: boolean;
  isActive?: boolean;
  apiServiceId?: string;
  minQty?: number;
  maxQty?: number;
  baseQty?: number;
}

export const DEFAULT_PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: 'pkg_fb_vip',
    title: 'Facebook VIP 5,000 Page Followers & Likes',
    category: 'facebook',
    price: 299,
    badge: '🔥 Most Popular',
    description: 'Best high-quality combo package to boost your Facebook page reach, followers, and engagement.',
    features: [
      '5,000 Premium Profile Followers & Page Likes',
      '100% Non-Drop & Lifetime Guarantee',
      'Instant Start (5-15 Mins Auto-Processing)',
      '30 Days Automatic Refill Backup',
      'Safe for Page Monetization & Organic Reach'
    ],
    speed: '10K - 25K/Day',
    guarantee: 'Lifetime 100% Non-Drop',
    linkPlaceholder: 'Enter Facebook Page or Profile link (https://facebook.com/...)',
    popular: true,
    isActive: true,
    apiServiceId: '15806',
    minQty: 1000,
    maxQty: 100000,
    baseQty: 1000,
  },
  {
    id: 'pkg_yt_monetize',
    title: 'YouTube 1,000 Subscribers + WatchTime Combo',
    category: 'youtube',
    price: 850,
    badge: '👑 Monetization Special',
    description: 'Complete package to quickly fulfill YouTube channel monetization requirements safely.',
    features: [
      '1,000 Organic Non-Drop YouTube Subscribers',
      '100% Compliant with YouTube Partner Policies',
      'Real High-Retention Watch Time Support',
      'No Password Required, 100% Safe & Secure',
      'Lifetime Non-Drop Refill Guarantee'
    ],
    speed: '500 - 1K Subs/Day',
    guarantee: '100% Safe Monetization Guarantee',
    linkPlaceholder: 'Enter YouTube channel link (https://youtube.com/@...)',
    popular: true,
    isActive: true,
    apiServiceId: '14321',
    minQty: 1000,
    maxQty: 50000,
    baseQty: 1000,
  },
  {
    id: 'pkg_ig_influencer',
    title: 'Instagram 10,000 Followers + 2,000 Likes VIP',
    category: 'instagram',
    price: 450,
    badge: '💎 Influencer Choice',
    description: 'Premium growth package to give your Instagram profile an established influencer look.',
    features: [
      '10,000 High-Quality Profile Followers',
      '2,000 Free Likes on Recent Reels / Posts',
      'Boosts Organic Engagement & Explore Page Reach',
      'Instant Start & Smooth Natural Delivery',
      'Password Not Required (Public Profile Link Only)'
    ],
    speed: '5K - 15K/Day',
    guarantee: '30 Days Refill Guarantee',
    linkPlaceholder: 'Enter Instagram profile link (https://instagram.com/...)',
    popular: false,
    isActive: true,
    apiServiceId: '14850',
    minQty: 1000,
    maxQty: 100000,
    baseQty: 1000,
  },
  {
    id: 'pkg_tt_viral',
    title: 'TikTok 50,000 Views + 1,500 Likes Viral Pack',
    category: 'tiktok',
    price: 199,
    badge: '⚡ Viral Booster',
    description: 'Best viral boost pack to push your TikTok videos onto the For You page rapidly.',
    features: [
      '50,000 High-Speed Video Views',
      '1,500 Real Likes & Shares Boost',
      'Algorithm Push for Maximum FYP Exposure',
      'Instant Automated Delivery Upon Ordering',
      '100% Safe, Stable & Drop-Free'
    ],
    speed: 'Instant Delivery',
    guarantee: 'Permanent Views & Likes',
    linkPlaceholder: 'Enter TikTok video link (https://tiktok.com/@.../video/...)',
    popular: true,
    isActive: true,
    apiServiceId: '15210',
    minQty: 1000,
    maxQty: 200000,
    baseQty: 1000,
  },
  {
    id: 'pkg_tg_channel',
    title: 'Telegram 3,000 Channel Members + Post Views',
    category: 'telegram',
    price: 260,
    badge: '✈️ Super Saver',
    description: 'Quickly boost your Telegram channel or group members with high stability.',
    features: [
      '3,000 Real-Looking Telegram Members',
      '5,000 Instant Views on 5 Recent Posts',
      'Zero Drop & Lifetime Stability',
      'Supports Public & Private Invite Links',
      '24/7 Fast Automated Activation'
    ],
    speed: '1K - 5K/Day',
    guarantee: 'Non-Drop Guarantee',
    linkPlaceholder: 'Enter Telegram channel or group link (https://t.me/...)',
    popular: false,
    isActive: true,
    apiServiceId: '15330',
    minQty: 1000,
    maxQty: 50000,
    baseQty: 1000,
  },
  {
    id: 'pkg_all_combo',
    title: 'All-in-One Ultimate Business Branding Pack',
    category: 'combo',
    price: 1250,
    badge: '🌟 Mega Combo',
    description: 'Grow all your major social media accounts together in one ultimate all-in-one bundle.',
    features: [
      'Facebook: 5,000 Page Likes & Followers',
      'YouTube: 1,000 Real Subscribers',
      'Instagram: 5,000 Premium Followers',
      'TikTok: 25,000 High-Speed Video Views',
      'VIP Priority Delivery & Dedicated Support'
    ],
    speed: 'VIP Priority Execution',
    guarantee: 'Full Combo Guarantee',
    linkPlaceholder: 'Enter primary page or profile link (extra links via support)',
    popular: true,
    isActive: true,
    apiServiceId: '15806',
    minQty: 1000,
    maxQty: 50000,
    baseQty: 1000,
  }
];

const PLATFORM_CONFIG: Record<
  string,
  {
    name: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    iconBg: string;
    accentGlow: string;
  }
> = {
  facebook: {
    name: 'Facebook',
    icon: 'fab fa-facebook-f',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    borderColor: 'border-blue-500/30 hover:border-blue-400/70',
    iconBg: 'bg-blue-600 text-white shadow-blue-500/30',
    accentGlow: 'from-blue-600/15 via-transparent to-transparent',
  },
  youtube: {
    name: 'YouTube',
    icon: 'fab fa-youtube',
    badgeBg: 'bg-red-500/15',
    badgeText: 'text-red-400',
    borderColor: 'border-red-500/30 hover:border-red-400/70',
    iconBg: 'bg-red-600 text-white shadow-red-500/30',
    accentGlow: 'from-red-600/15 via-transparent to-transparent',
  },
  instagram: {
    name: 'Instagram',
    icon: 'fab fa-instagram',
    badgeBg: 'bg-pink-500/15',
    badgeText: 'text-pink-400',
    borderColor: 'border-pink-500/30 hover:border-pink-400/70',
    iconBg: 'bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 text-white shadow-pink-500/30',
    accentGlow: 'from-pink-600/15 via-transparent to-transparent',
  },
  tiktok: {
    name: 'TikTok',
    icon: 'fab fa-tiktok',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400/70',
    iconBg: 'bg-slate-900 text-cyan-300 border border-cyan-400/40 shadow-cyan-500/25',
    accentGlow: 'from-cyan-600/15 via-transparent to-transparent',
  },
  telegram: {
    name: 'Telegram',
    icon: 'fab fa-telegram-plane',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-400',
    borderColor: 'border-sky-500/30 hover:border-sky-400/70',
    iconBg: 'bg-sky-500 text-white shadow-sky-500/30',
    accentGlow: 'from-sky-600/15 via-transparent to-transparent',
  },
  combo: {
    name: 'Mega Combo',
    icon: 'fas fa-crown',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-400/80',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-amber-500/40',
    accentGlow: 'from-amber-500/20 via-transparent to-transparent',
  },
  other: {
    name: 'Social',
    icon: 'fas fa-star',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
    borderColor: 'border-purple-500/30 hover:border-purple-400/70',
    iconBg: 'bg-purple-600 text-white shadow-purple-500/30',
    accentGlow: 'from-purple-600/15 via-transparent to-transparent',
  },
};

interface PremiumPackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  packagesList?: PremiumPackage[];
  userBalance: number;
  onOrderPackage: (pkg: PremiumPackage, targetLink: string, quantity: number) => Promise<void>;
  onNavigateToDeposit: () => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  globalDiscountPercent?: number;
}

export const PremiumPackagesModal: React.FC<PremiumPackagesModalProps> = ({
  isOpen,
  onClose,
  packagesList,
  userBalance,
  onOrderPackage,
  onNavigateToDeposit,
  haptic = (_type?: any) => {},
  showToast,
  globalDiscountPercent = 0,
}) => {
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [quantityError, setQuantityError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPackageForOrder, setSelectedPackageForOrder] = useState<PremiumPackage | null>(null);
  const [orderLink, setOrderLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPackageEffectivePrice = (pkg: PremiumPackage) => {
    if (!globalDiscountPercent || globalDiscountPercent <= 0) return pkg.price;
    return Math.max(1, Math.round(pkg.price * (1 - globalDiscountPercent / 100)));
  };

  const allActivePackages = useMemo(() => {
    const list = packagesList && packagesList.length > 0 ? packagesList : DEFAULT_PREMIUM_PACKAGES;
    return list.filter((p) => p.isActive !== false);
  }, [packagesList]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allActivePackages.length };
    allActivePackages.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [allActivePackages]);

  const displayPackages = useMemo(() => {
    if (selectedCategory === 'all') return allActivePackages;
    return allActivePackages.filter((p) => p.category === selectedCategory);
  }, [allActivePackages, selectedCategory]);

  if (!isOpen) return null;

  const minAllowedQty = selectedPackageForOrder ? Math.max(1000, selectedPackageForOrder.minQty || 1000) : 1000;
  const maxAllowedQty = selectedPackageForOrder?.maxQty || 100000;
  const activePrice = selectedPackageForOrder ? getPackageEffectivePrice(selectedPackageForOrder) : 0;
  const baseUnit = selectedPackageForOrder?.baseQty && selectedPackageForOrder.baseQty > 0 ? selectedPackageForOrder.baseQty : 1000;
  const unitRatePer1k = selectedPackageForOrder && baseUnit > 0 ? (activePrice / baseUnit) * 1000 : activePrice;
  const calculatedCost = selectedPackageForOrder && baseUnit > 0
    ? Math.max(1, Number(((orderQuantity / baseUnit) * activePrice).toFixed(2)))
    : 0;

  const handleStartOrder = (pkg: PremiumPackage) => {
    haptic('heavy');
    const minQ = Math.max(1000, pkg.minQty || 1000);
    setSelectedPackageForOrder(pkg);
    setOrderQuantity(minQ);
    setOrderLink('');
    setLinkError('');
    setQuantityError('');
  };

  const handleConfirmOrder = async () => {
    if (!selectedPackageForOrder) return;

    if (!orderLink.trim() || orderLink.trim().length < 5) {
      setLinkError('অনুগ্রহ করে সঠিক সোশ্যাল মিডিয়া লিংক দিন (যেমন: https://...)');
      haptic('error');
      return;
    }

    if (orderQuantity < minAllowedQty) {
      setQuantityError(`মিনিমাম অর্ডার পরিমাণ ${minAllowedQty.toLocaleString()} টি (১,০০০ এর কম দেওয়া যাবে না)`);
      haptic('error');
      return;
    }

    if (userBalance < calculatedCost) {
      haptic('error');
      setQuantityError(`অপর্যাপ্ত ব্যালেন্স! প্রয়োজন: ৳ ${calculatedCost.toFixed(2)}, বর্তমান ব্যালেন্স: ৳ ${userBalance.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    haptic('heavy');
    try {
      const pkgToOrder = {
        ...selectedPackageForOrder,
        price: activePrice
      };
      await onOrderPackage(pkgToOrder, orderLink.trim(), orderQuantity);
      setSelectedPackageForOrder(null);
      setOrderLink('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryTabs = [
    { id: 'all', label: 'সব প্যাকেজ', icon: 'fas fa-fire' },
    { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f' },
    { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
    { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok' },
    { id: 'telegram', label: 'Telegram', icon: 'fab fa-telegram-plane' },
    { id: 'combo', label: 'Mega Combo', icon: 'fas fa-crown' },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl bg-gradient-to-b from-[#0f172a] via-[#090d1f] to-[#030712] border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.8)] text-white space-y-4 my-auto max-h-[92vh] flex flex-col ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 text-xl shadow-lg shadow-amber-500/30 border border-amber-300 shrink-0">
              <i className="fas fa-gift"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>Packages</span>
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm font-mono">
                  ALL PACKAGES
                </span>
                {globalDiscountPercent > 0 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                    {globalDiscountPercent}% OFF ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                সোশ্যাল মিডিয়া গ্রোথ প্যাকেজ • অটোমেটিক ইনস্ট্যান্ট ডেলিভারি
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center text-sm transition cursor-pointer border border-white/10"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* User Balance & Quick Deposit Bar */}
        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/25 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              <i className="fas fa-wallet"></i>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">আপনার বর্তমান ব্যালেন্স</span>
              <span className="text-sm font-black text-emerald-400 font-mono">৳ {userBalance.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onNavigateToDeposit();
              haptic('light');
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <i className="fas fa-plus-circle text-xs"></i>
            <span>টাকা যোগ করুন</span>
          </button>
        </div>

        {/* Global Offer Notification Banner */}
        {globalDiscountPercent > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-3 shrink-0 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shrink-0 animate-bounce">
                <i className="fas fa-fire"></i>
              </div>
              <div>
                <span className="text-amber-200 font-black text-xs sm:text-sm block">
                  🔥 মেগা অফার লাইভ! সব প্যাকেজে {globalDiscountPercent}% স্পেশাল ছাড় চলছে
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 whitespace-nowrap">
              Active Sale
            </span>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex overflow-x-auto gap-1.5 pb-1 shrink-0 scrollbar-none">
          {categoryTabs.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  haptic('light');
                }}
                className={`px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                <i className={`${cat.icon} text-xs`}></i>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Packages Grid / List */}
        <div className="overflow-y-auto pr-1 space-y-3.5 flex-1 scrollbar-thin scrollbar-thumb-amber-500/30">
          {displayPackages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white/[0.02] rounded-3xl border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-2 text-slate-500 text-xl">
                <i className="fas fa-box-open"></i>
              </div>
              <p className="text-xs font-bold text-slate-300">এই ক্যাটাগরিতে বর্তমানে কোনো প্যাকেজ নেই</p>
              <p className="text-[11px] text-slate-500 mt-0.5">অন্যান্য ক্যাটাগরি দেখতে উপরের ট্যাবগুলোতে ক্লিক করুন।</p>
            </div>
          ) : (
            displayPackages.map((pkg) => {
              const effectivePrice = getPackageEffectivePrice(pkg);
              const hasEnoughBalance = userBalance >= effectivePrice;
              const hasDiscount = globalDiscountPercent > 0;
              const pConfig = PLATFORM_CONFIG[pkg.category] || PLATFORM_CONFIG.other;

              return (
                <div
                  key={pkg.id}
                  className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900/95 via-[#0a1128]/95 to-slate-950/95 border transition-all duration-200 shadow-xl group ${pConfig.borderColor}`}
                >
                  {/* Subtle top-corner platform glow */}
                  <div
                    className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20 bg-gradient-to-br ${pConfig.accentGlow}`}
                  />

                  {/* Top Bar: Platform Icon, Title & Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 relative z-10">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-lg ${pConfig.iconBg}`}
                      >
                        <i className={pConfig.icon}></i>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/10 ${pConfig.badgeBg} ${pConfig.badgeText}`}
                          >
                            {pConfig.name}
                          </span>
                          {pkg.badge && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] shadow-sm uppercase tracking-wider flex items-center gap-1">
                              <i className="fas fa-sparkles text-[8px]"></i>
                              <span>{pkg.badge}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                          {pkg.title}
                        </h4>
                      </div>
                    </div>

                    {/* Price Showcase Card */}
                    <div className="sm:text-right shrink-0 bg-white/[0.04] sm:bg-transparent p-2.5 sm:p-0 rounded-2xl border border-white/5 sm:border-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                      {hasDiscount ? (
                        <div>
                          <div className="flex items-baseline sm:justify-end gap-1.5">
                            <span className="text-xs text-slate-400 line-through">
                              ৳ {pkg.price}
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                              ৳ {effectivePrice}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:justify-end mt-0.5">
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                              🔥 {globalDiscountPercent}% ছাড় (রেট ৳{effectivePrice} / ১K)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                            ৳ {pkg.price}
                          </div>
                          <span className="text-[10px] text-amber-300/90 block font-medium">প্রতি ১,০০০ রেট</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="text-xs text-slate-300 leading-relaxed mb-3 relative z-10">
                      {pkg.description}
                    </p>
                  )}

                  {/* Feature Highlights Pills Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 pb-3.5 border-t border-white/5 text-[11px] relative z-10">
                    {pkg.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200"
                      >
                        <i className="fas fa-check-circle text-emerald-400 text-xs shrink-0"></i>
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer: Specs & High-Impact Order Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-amber-300 font-bold">
                        <i className="fas fa-layer-group text-amber-400 text-[9px]"></i>
                        <span>মিনিমাম: {(pkg.minQty || 1000).toLocaleString()} টি</span>
                      </span>
                      {pkg.speed && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-slate-300 font-medium">
                          <i className="fas fa-tachometer-alt text-cyan-400 text-[9px]"></i>
                          <span>{pkg.speed}</span>
                        </span>
                      )}
                      {pkg.guarantee && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-emerald-300 font-medium">
                          <i className="fas fa-shield-check text-emerald-400 text-[9px]"></i>
                          <span>{pkg.guarantee}</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartOrder(pkg)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25"
                    >
                      <i className="fas fa-bolt text-xs"></i>
                      <span>অর্ডার করুন ➔</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ORDER CHECKOUT MODAL OVERLAY */}
        {selectedPackageForOrder && (
          <div
            className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={() => {
              if (!isSubmitting) setSelectedPackageForOrder(null);
            }}
          >
            <div
              className="relative w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0b0f19] to-[#030712] border-t sm:border border-amber-500/40 sm:rounded-3xl rounded-t-3xl p-5 sm:p-6 shadow-[0_-15px_50px_rgba(0,0,0,0.9)] sm:shadow-[0_25px_80px_rgba(0,0,0,0.9)] text-white space-y-4 max-h-[94vh] overflow-y-auto ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

              {/* Checkout Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-400/40 flex items-center justify-center text-amber-400 text-lg shadow-inner shrink-0">
                    <i className={
                      selectedPackageForOrder.category === 'facebook' ? 'fab fa-facebook-f text-blue-400' :
                      selectedPackageForOrder.category === 'youtube' ? 'fab fa-youtube text-red-400' :
                      selectedPackageForOrder.category === 'instagram' ? 'fab fa-instagram text-pink-400' :
                      selectedPackageForOrder.category === 'tiktok' ? 'fab fa-tiktok text-cyan-400' :
                      selectedPackageForOrder.category === 'telegram' ? 'fab fa-telegram-plane text-sky-400' :
                      'fas fa-crown text-amber-400'
                    }></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono">
                        অর্ডার কনফার্মেশন
                      </span>
                      {selectedPackageForOrder.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                          {selectedPackageForOrder.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                      {selectedPackageForOrder.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPackageForOrder(null)}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer border border-white/10 shrink-0"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Rate & Features Strip */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/70 border border-white/10 text-center">
                <div className="p-1.5">
                  <span className="text-[10px] text-slate-400 block font-medium">প্রতি ১,০০০ রেট</span>
                  <span className="text-sm font-black text-amber-300 font-mono">৳ {unitRatePer1k.toFixed(2)}</span>
                </div>
                <div className="p-1.5 border-x border-white/10">
                  <span className="text-[10px] text-slate-400 block font-medium">ডেলিভারি স্পিড</span>
                  <span className="text-[11px] font-bold text-slate-200">
                    {selectedPackageForOrder.speed || '⚡ ইনস্ট্যান্ট'}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-[10px] text-slate-400 block font-medium">নিশ্চয়তা</span>
                  <span className="text-[11px] font-bold text-emerald-400">
                    {selectedPackageForOrder.guarantee || '১০০% নন-ড্রপ'}
                  </span>
                </div>
              </div>

              {/* Target Link Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <label className="flex items-center gap-1.5">
                    <i className="fas fa-link text-amber-400 text-xs"></i>
                    <span>টার্গেট সোশ্যাল লিংক (Social Link)</span>
                    <span className="text-amber-400 font-mono text-[10px]">*আবশ্যক</span>
                  </label>
                  {navigator.clipboard && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setOrderLink(text);
                            setLinkError('');
                            haptic('light');
                          }
                        } catch {
                          // ignore clipboard read error
                        }
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      <i className="fas fa-paste text-[10px]"></i>
                      <span>পেস্ট করুন</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedPackageForOrder.linkPlaceholder || 'https://... লিংক দিন'}
                    value={orderLink}
                    onChange={(e) => {
                      setOrderLink(e.target.value);
                      setLinkError('');
                    }}
                    className="w-full bg-slate-950/90 border border-white/20 focus:border-amber-400 rounded-2xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 font-mono shadow-inner transition"
                  />
                </div>
                {linkError ? (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5 font-medium">
                    <i className="fas fa-exclamation-circle text-xs"></i>
                    <span>{linkError}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <i className="fas fa-info-circle text-slate-500 text-[10px]"></i>
                    <span>আপনার ফেসবুক/ইউটিউব/ইনস্টাগ্রাম পেজ, প্রোফাইল বা পোস্টের পাবলিক লিংক দিন।</span>
                  </p>
                )}
              </div>

              {/* Quantity Stepper & Quick Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <label className="flex items-center gap-1.5">
                    <i className="fas fa-layer-group text-amber-400 text-xs"></i>
                    <span>অর্ডারের পরিমাণ (Quantity)</span>
                    <span className="text-amber-400 font-mono text-[10px]">(মিনিমাম: {minAllowedQty.toLocaleString()})</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    হিসাব: ৳{unitRatePer1k.toFixed(2)} / ১K
                  </span>
                </div>

                {/* Stepper Input */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(minAllowedQty, (orderQuantity || minAllowedQty) - 1000);
                      setOrderQuantity(next);
                      setQuantityError('');
                      haptic('light');
                    }}
                    disabled={orderQuantity <= minAllowedQty}
                    className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 text-white font-black text-lg border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    -
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={minAllowedQty}
                      max={maxAllowedQty}
                      step="any"
                      value={orderQuantity || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOrderQuantity(val);
                        if (val < minAllowedQty) {
                          setQuantityError(`মিনিমাম অর্ডার পরিমাণ ${minAllowedQty.toLocaleString()} টি (১,০০০ এর কম দেওয়া যাবে না)`);
                        } else {
                          setQuantityError('');
                        }
                      }}
                      className="w-full bg-slate-950/90 border border-white/20 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-center text-base font-black text-amber-300 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-inner"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none uppercase font-bold">
                      টি
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = (orderQuantity || minAllowedQty) + 1000;
                      setOrderQuantity(next);
                      setQuantityError('');
                      haptic('light');
                    }}
                    className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-lg border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">কুইক সিলেক্ট:</span>
                  {[1000, 2000, 5000, 10000, 25000].map((preset) => {
                    if (preset < minAllowedQty) return null;
                    const isSelected = orderQuantity === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setOrderQuantity(preset);
                          setQuantityError('');
                          haptic('light');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer font-bold ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md scale-105'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {preset.toLocaleString()} টি
                      </button>
                    );
                  })}
                </div>

                {quantityError && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5 font-medium pt-0.5">
                    <i className="fas fa-exclamation-circle text-xs"></i>
                    <span>{quantityError}</span>
                  </p>
                )}
              </div>

              {/* Clean Transparent Receipt Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>মোট পরিমাণ:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {orderQuantity.toLocaleString()} টি
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>প্রতি ১,০০০ রেট:</span>
                  <span className="font-mono font-bold text-amber-300">
                    ৳ {unitRatePer1k.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">মোট চার্জ (কাটা হবে):</span>
                  <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                    ৳ {calculatedCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span className="text-slate-400">আপনার বর্তমান ব্যালেন্স:</span>
                  <span className="font-mono font-bold text-slate-300">
                    ৳ {userBalance.toFixed(2)}
                  </span>
                </div>

                {userBalance < calculatedCost ? (
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-2 mt-1">
                    <i className="fas fa-exclamation-triangle text-red-400 text-xs shrink-0"></i>
                    <span>
                      ব্যালেন্সে ঘাটতি আছে! আরও <strong>৳ {(calculatedCost - userBalance).toFixed(2)}</strong> প্রয়োজন।
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium pt-0.5">
                    <span>অর্ডারের পর অবশিষ্ট ব্যালেন্স:</span>
                    <span className="font-mono font-bold">
                      ৳ {(userBalance - calculatedCost).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedPackageForOrder(null)}
                  disabled={isSubmitting}
                  className="w-1/3 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition active:scale-95 cursor-pointer"
                >
                  বাতিল
                </button>

                {userBalance < calculatedCost ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackageForOrder(null);
                      onClose();
                      onNavigateToDeposit();
                    }}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <i className="fas fa-wallet text-sm"></i>
                    <span>টাকা রিচার্জ করুন (৳{(calculatedCost - userBalance).toFixed(2)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || orderQuantity < minAllowedQty}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                        <span>অর্ডার পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle text-sm"></i>
                        <span>অর্ডার নিশ্চিত করুন (৳{calculatedCost.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

