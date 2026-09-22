import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { UserVIPSubscription } from '../types/vip';

export interface ProfileNextAutoProfitDisplayProps {
  currentUser: {
    uid: string;
    name?: string;
    email?: string;
    username?: string;
    isVip?: boolean;
    vipPackageName?: string;
  } | null;
  onNavigateToVIP?: () => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const ProfileNextAutoProfitDisplay: React.FC<ProfileNextAutoProfitDisplayProps> = ({
  currentUser,
  onNavigateToVIP,
  haptic = () => {},
}) => {
  const [subscriptions, setSubscriptions] = useState<UserVIPSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 1-second live countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to user's VIP subscriptions in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'vip_subscriptions'),
        where('uid', '==', currentUser.uid)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: UserVIPSubscription[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as UserVIPSubscription);
          });
          // Sort by newest purchased first
          list.sort((a, b) => (b.purchasedTimestamp || 0) - (a.purchasedTimestamp || 0));
          setSubscriptions(list);
          setLoading(false);
        },
        (err) => {
          console.warn('VIP subscriptions listener error:', err);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Subscription query exception:', e);
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // Filter for active VIP subscriptions that have remaining days
  const activeSubs = subscriptions.filter(
    (s) => s.status === 'Active' && (s.daysClaimed || 0) < (s.durationDays || 30)
  );

  // If multiple, pick the primary one with the soonest upcoming profit time
  const primarySub = activeSubs.length > 0
    ? [...activeSubs].sort((a, b) => {
        const timeA = (a.lastAutoCreditTimestamp || a.purchasedTimestamp || 0) + 24 * 60 * 60 * 1000;
        const timeB = (b.lastAutoCreditTimestamp || b.purchasedTimestamp || 0) + 24 * 60 * 60 * 1000;
        return timeA - timeB;
      })[0]
    : null;

  // Calculate 24h cycle metrics
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const lastCreditTime = primarySub
    ? primarySub.lastAutoCreditTimestamp || primarySub.purchasedTimestamp || currentTime
    : currentTime;

  const nextProfitTimestamp = lastCreditTime + COOLDOWN_MS;
  const remainingMs = Math.max(0, nextProfitTimestamp - currentTime);

  // Progress percentage (0% to 100%) through the 24-hour cycle
  const elapsedMs = Math.max(0, Math.min(COOLDOWN_MS, COOLDOWN_MS - remainingMs));
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / COOLDOWN_MS) * 100));

  // Time formatters
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return { hours: '00', minutes: '00', seconds: '00', isReady: true };
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    return { hours, minutes, seconds, isReady: false };
  };

  const { hours, minutes, seconds, isReady } = formatCountdown(remainingMs);

  // Format exact target date & time (12-hour format with AM/PM)
  const formatTargetDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const dateStr = date.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let relativeLabel = dateStr;
    if (isToday) {
      relativeLabel = 'আজ (Today)';
    } else if (isTomorrow) {
      relativeLabel = 'আগামীকাল (Tomorrow)';
    }

    return { relativeLabel, timeStr, fullDate: dateStr };
  };

  const targetTimeInfo = formatTargetDateTime(nextProfitTimestamp);

  // Expected profit amount
  const dailyProfitAmt = primarySub
    ? primarySub.dailyReturnAmount ||
      (primarySub.packagePrice * (primarySub.dailyReturnPercent || 10)) / 100
    : 0;

  const totalRemainingDays = primarySub
    ? (primarySub.durationDays || 30) - (primarySub.daysClaimed || 0)
    : 0;

  if (loading) {
    return (
      <div className="glass-card p-4 border border-amber-500/20 bg-slate-900/80 rounded-2xl animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5"></div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-white/10 rounded w-1/3"></div>
            <div className="h-2.5 bg-white/5 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // 1. ACTIVE VIP SUBSCRIBER VIEW
  if (primarySub) {
    return (
      <div className="glass-card p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-[#0b1329] to-slate-950 relative overflow-hidden shadow-[0_0_35px_rgba(245,158,11,0.12)] space-y-4">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm shadow-md">
              <i className="fas fa-clock-rotate-left"></i>
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Next Auto-Profit Time (পরবর্তী অটো লাভের সময়)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              </h4>
              <p className="text-[10px] text-slate-400">
                ২৪ ঘণ্টার সাইকেল অনুযায়ী অটোমেটিক ব্যালেন্স যোগ হওয়ার সময়
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
            <i className="fas fa-crown text-[9px]"></i>
            <span>{primarySub.packageName}</span>
          </span>
        </div>

        {/* Highlighted Next Profit Time Card */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Exact Next Time Display */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                <i className="fas fa-calendar-check text-emerald-400"></i>
                <span>নির্ধারিত সময় ও তারিখ (Scheduled Time):</span>
              </span>

              <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                  {targetTimeInfo.timeStr}
                </span>
                <span className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  {targetTimeInfo.relativeLabel}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                তারিখ: {targetTimeInfo.fullDate}
              </div>
            </div>

            {/* Expected Credit Amount Box */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex items-center justify-between sm:justify-end gap-3 text-right">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-emerald-400 font-bold block">
                  জমা হবে (Next Credit):
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-300 font-mono">
                  +৳{dailyProfitAmt.toFixed(2)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs">
                <i className="fas fa-sack-dollar"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Live Countdown Timer Clock */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <i className="fas fa-stopwatch text-amber-400 animate-spin text-[10px]"></i>
              <span>বাকি সময় (Time Remaining Countdown):</span>
            </span>
            {isReady ? (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 animate-pulse">
                প্রসেস হচ্ছে (Processing Now...)
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-400">
                {progressPercent.toFixed(0)}% সাইকেল সম্পন্ন
              </span>
            )}
          </div>

          {/* Countdown Digital Blocks */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-black/60 border border-amber-500/20 shadow-inner">
              <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-wider">
                {hours}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                ঘণ্টা (Hours)
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-2xl bg-black/60 border border-amber-500/20 shadow-inner">
              <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-wider">
                {minutes}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                মিনিট (Minutes)
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-2xl bg-black/60 border border-amber-500/20 shadow-inner">
              <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-wider">
                {seconds}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                সেকেন্ড (Seconds)
              </div>
            </div>
          </div>

          {/* 24-Hour Cycle Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${Math.max(3, progressPercent)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Subscription Meta Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">সম্পন্ন মেয়াদ:</span>
            <span className="font-mono font-bold text-white">
              দিন {primarySub.daysClaimed || 0} / {primarySub.durationDays || 30}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">অবশিষ্ট মেয়াদ:</span>
            <span className="font-mono font-bold text-amber-400">
              {totalRemainingDays} দিন বাকি
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between sm:block">
            <span className="text-slate-400 block text-[10px]">মোট অর্জিত লাভ:</span>
            <span className="font-mono font-black text-emerald-400">
              ৳{(primarySub.totalEarned || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Button: View Details in VIP Hub */}
        {onNavigateToVIP && (
          <button
            onClick={() => {
              onNavigateToVIP();
              haptic('light');
            }}
            className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition border border-amber-500/30 active:scale-98"
          >
            <i className="fas fa-crown text-[11px]"></i>
            <span>VIP প্যাকেজ ও ক্যাশআউট ড্যাশবোর্ড দেখুন</span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>
        )}
      </div>
    );
  }

  // 2. NO ACTIVE VIP VIEW (INFORMATIVE CALL-TO-ACTION)
  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-[#0b1329] to-slate-950 relative overflow-hidden shadow-lg space-y-3">
      {/* Background Ambient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg shadow shrink-0">
            <i className="fas fa-clock-rotate-left"></i>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>Next Auto-Profit Time (পরবর্তী অটো লাভ)</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/10 font-mono">
                অপেক্ষারত
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              VIP প্যাকেজ নিলে প্রতি ২৪ ঘণ্টায় ১০% অটোমেটিক লাভ ব্যালেন্সে যোগ হয়
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
          <i className="fas fa-circle-info"></i>
          <span>আপনার বর্তমানে কোনো সক্রিয় VIP প্যাকেজ নেই</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          যেকোনো VIP প্যাকেজ সক্রিয় করলেই এখানে আপনার লাইভ ২৪-ঘণ্টা রিভার্স কাউন্টডাউন এবং পরবর্তী অটো-প্রফিট ক্রেডিট হওয়ার সঠিক সময় দেখতে পাবেন।
        </p>
      </div>

      {onNavigateToVIP && (
        <button
          onClick={() => {
            onNavigateToVIP();
            haptic('light');
          }}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="fas fa-crown text-amber-950"></i>
          <span>VIP প্যাকেজ তালিকা দেখুন ও সক্রিয় করুন</span>
          <i className="fas fa-arrow-right text-[10px]"></i>
        </button>
      )}
    </div>
  );
};
