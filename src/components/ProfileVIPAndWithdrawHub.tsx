import React, { useState, useEffect, useRef } from 'react';
import {
  db,
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  addDoc,
  getDoc,
  getDocs
} from '../firebase';
import {
  VIPPackage,
  UserVIPSubscription,
  WithdrawalRequest,
  WithdrawalMethodConfig,
  DEFAULT_VIP_PACKAGES,
  DEFAULT_WITHDRAWAL_METHODS
} from '../types/vip';

interface ProfileVIPAndWithdrawHubProps {
  currentUser: {
    uid: string;
    name?: string;
    email?: string;
    username?: string;
    isVip?: boolean;
    vipPackageName?: string;
  } | null;
  userBalance: number;
  onBalanceUpdate?: (newBalance: number) => void;
  onNavigateTab?: (tab: string) => void;
  onVipStatusChange?: (hasVip: boolean, vipPackageName?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const ProfileVIPAndWithdrawHub: React.FC<ProfileVIPAndWithdrawHubProps> = ({
  currentUser,
  userBalance,
  onBalanceUpdate,
  onNavigateTab,
  onVipStatusChange,
  showToast,
  haptic = () => {}
}) => {
  // VIP Packages list
  const [packages, setPackages] = useState<VIPPackage[]>(DEFAULT_VIP_PACKAGES);
  const [userSubscriptions, setUserSubscriptions] = useState<UserVIPSubscription[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [packageBuyersCountMap, setPackageBuyersCountMap] = useState<Record<string, number>>({});
  const [vipHubBannerUrl, setVipHubBannerUrl] = useState('');
  const [loading, setLoading] = useState(true);

  // Sub-section toggle inside single VIP project card
  const [withdrawSectionView, setWithdrawSectionView] = useState<'form' | 'history'>('form');

  // Purchase modal
  const [selectedPkgForBuy, setSelectedPkgForBuy] = useState<VIPPackage | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  // Withdrawal Methods State (from Firestore withdrawal_methods)
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethodConfig[]>(DEFAULT_WITHDRAWAL_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('bkash');
  const [withdrawAccountType, setWithdrawAccountType] = useState<'Personal' | 'Agent'>('Personal');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('100');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Find currently selected method
  const currentMethod =
    withdrawalMethods.find((m) => m.id === selectedMethodId) ||
    withdrawalMethods[0] ||
    DEFAULT_WITHDRAWAL_METHODS[0];

  // Dynamic fee & payout calculation
  const withdrawAmtNum = parseFloat(withdrawAmount) || 0;
  const methodFeePercent = currentMethod.chargePercent !== undefined ? currentMethod.chargePercent : 5;
  const chargeAmount = (withdrawAmtNum * methodFeePercent) / 100;
  const finalReceiveAmount = Math.max(0, withdrawAmtNum - chargeAmount);
  const remainingBalanceAfter = Math.max(0, userBalance - withdrawAmtNum);

  // Live countdown timer (tick every 1s)
  const [currentTime, setCurrentTime] = useState(Date.now());
  const isAutoCreditingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 0. Listen to VIP Hub general settings (Hub Banner)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'vip_settings', 'general'),
        (snap) => {
          if (snap.exists()) {
            setVipHubBannerUrl(snap.data().hubBannerUrl || '');
          }
        },
        (err) => console.warn('VIP Hub banner error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 0.1 Listen to dynamic withdrawal methods configured from Admin Panel
  useEffect(() => {
    try {
      const q = collection(db, 'withdrawal_methods');
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list: WithdrawalMethodConfig[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...d.data() } as WithdrawalMethodConfig);
            });
            list.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            const activeOnly = list.filter((m) => m.isActive !== false);
            const methodsToUse = activeOnly.length > 0 ? activeOnly : DEFAULT_WITHDRAWAL_METHODS;
            setWithdrawalMethods(methodsToUse);
            if (!methodsToUse.some((m) => m.id === selectedMethodId)) {
              setSelectedMethodId(methodsToUse[0].id);
            }
          } else {
            setWithdrawalMethods(DEFAULT_WITHDRAWAL_METHODS);
          }
        },
        (err) => {
          console.warn('Withdrawal methods error notice:', err);
          setWithdrawalMethods(DEFAULT_WITHDRAWAL_METHODS);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setWithdrawalMethods(DEFAULT_WITHDRAWAL_METHODS);
    }
  }, [selectedMethodId]);

  // 1. Listen to VIP Packages from Firestore
  useEffect(() => {
    try {
      const q = collection(db, 'vip_packages');
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list: VIPPackage[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...d.data() } as VIPPackage);
            });
            list.sort((a, b) => a.price - b.price);
            setPackages(list);
          } else {
            setPackages(DEFAULT_VIP_PACKAGES);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('VIP packages listener notice:', err);
          setPackages(DEFAULT_VIP_PACKAGES);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setPackages(DEFAULT_VIP_PACKAGES);
      setLoading(false);
    }
  }, []);

  // 1.1 Listen to all subscriptions to compute real-time buyers count per package
  useEffect(() => {
    try {
      const q = collection(db, 'vip_subscriptions');
      const unsub = onSnapshot(
        q,
        (snap) => {
          const map: Record<string, number> = {};
          snap.forEach((d) => {
            const data = d.data();
            const pkgId = data.packageId;
            const pkgName = data.packageName;
            if (pkgId) {
              map[pkgId] = (map[pkgId] || 0) + 1;
            }
            if (pkgName && pkgName !== pkgId) {
              map[pkgName] = (map[pkgName] || 0) + 1;
            }
          });
          setPackageBuyersCountMap(map);
        },
        (err) => console.warn('All subscriptions listener notice:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 2. Listen to User's VIP Subscriptions
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const q = query(
        collection(db, 'vip_subscriptions'),
        where('uid', '==', currentUser.uid)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const subs: UserVIPSubscription[] = [];
          snap.forEach((d) => {
            subs.push({ id: d.id, ...d.data() } as UserVIPSubscription);
          });
          subs.sort((a, b) => (b.purchasedTimestamp || 0) - (a.purchasedTimestamp || 0));
          setUserSubscriptions(subs);

          // Check if user has active VIP subscription
          const activeSub = subs.find(
            (s) => s.status === 'Active' && (s.daysClaimed || 0) < (s.durationDays || 30)
          );
          if (onVipStatusChange) {
            if (activeSub) {
              onVipStatusChange(true, activeSub.packageName);
            } else {
              onVipStatusChange(false);
            }
          }
        },
        (err) => console.warn('VIP Subscriptions listener notice:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, [currentUser?.uid, onVipStatusChange]);

  // 3. Listen to User's Withdrawal Requests
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('uid', '==', currentUser.uid)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: WithdrawalRequest[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as WithdrawalRequest);
          });
          list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
          setWithdrawals(list);
        },
        (err) => console.warn('Withdrawals listener notice:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, [currentUser?.uid]);

  // 4. AUTOMATIC 24-HOUR BALANCE CREDIT ENGINE
  // Automatically calculates completed 24-hour cycles and credits balance directly
  useEffect(() => {
    if (!currentUser?.uid || userSubscriptions.length === 0) return;

    const checkAndAutoCredit = async () => {
      if (isAutoCreditingRef.current) return;

      const activeSubs = userSubscriptions.filter(
        (s) => s.status === 'Active' && (s.daysClaimed || 0) < (s.durationDays || 30)
      );
      if (activeSubs.length === 0) return;

      const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();

      for (const sub of activeSubs) {
        const lastCreditTime = sub.lastAutoCreditTimestamp || sub.purchasedTimestamp || now;
        const elapsed = now - lastCreditTime;
        const remainingDays = (sub.durationDays || 30) - (sub.daysClaimed || 0);

        const eligibleCycles = Math.min(Math.floor(elapsed / COOLDOWN_MS), remainingDays);

        if (eligibleCycles >= 1 && remainingDays > 0) {
          try {
            isAutoCreditingRef.current = true;

            const dailyAmt =
              sub.dailyReturnAmount || (sub.packagePrice * (sub.dailyReturnPercent || 10)) / 100;
            const totalAutoCreditAmt = dailyAmt * eligibleCycles;
            const newDaysClaimed = (sub.daysClaimed || 0) + eligibleCycles;
            const newTotalEarned = (sub.totalEarned || 0) + totalAutoCreditAmt;
            const isCompleted = newDaysClaimed >= (sub.durationDays || 30);
            const newLastCreditTimestamp = lastCreditTime + eligibleCycles * COOLDOWN_MS;

            // Update user balance in Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            const currentDbBal = userSnap.exists() ? userSnap.data().balance || 0 : userBalance;
            const newBalance = currentDbBal + totalAutoCreditAmt;

            await updateDoc(userRef, {
              balance: newBalance,
              isVip: !isCompleted,
              vipPackageName: !isCompleted ? sub.packageName : '',
              vipBadge: !isCompleted ? 'VIP MEMBER' : ''
            });

            if (onBalanceUpdate) onBalanceUpdate(newBalance);

            // Update VIP subscription doc in Firestore
            const subRef = doc(db, 'vip_subscriptions', sub.id);
            await updateDoc(subRef, {
              daysClaimed: newDaysClaimed,
              totalEarned: newTotalEarned,
              lastAutoCreditTimestamp: newLastCreditTimestamp,
              lastAutoCreditAt: new Date().toISOString(),
              status: isCompleted ? 'Completed' : 'Active'
            });

            haptic('success');
            showToast(
              `🎉 Auto-Credit: ৳${totalAutoCreditAmt.toFixed(2)} (10% Daily Return) from ${sub.packageName} was automatically added to your balance!`,
              'success'
            );
          } catch (err) {
            console.error('Auto credit error:', err);
          } finally {
            isAutoCreditingRef.current = false;
          }
        }
      }
    };

    checkAndAutoCredit();
    const intervalId = setInterval(checkAndAutoCredit, 5000);
    return () => clearInterval(intervalId);
  }, [currentUser?.uid, userSubscriptions, userBalance, onBalanceUpdate, showToast, haptic]);

  // Active VIP subscription if any
  const activeVIPSub = userSubscriptions.find(
    (s) => s.status === 'Active' && (s.daysClaimed || 0) < (s.durationDays || 30)
  );

  // Calculate 24-hour remaining countdown
  const getNextAutoCreditRemainingMs = (sub: UserVIPSubscription) => {
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const lastCreditTime = sub.lastAutoCreditTimestamp || sub.purchasedTimestamp || currentTime;
    const nextTargetTime = lastCreditTime + COOLDOWN_MS;
    const diff = nextTargetTime - currentTime;
    return diff > 0 ? diff : 0;
  };

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Buy VIP package handler (Strict rule: 1 active package per user at a time)
  const handleConfirmBuyPackage = async () => {
    if (!currentUser?.uid) {
      showToast('অনুগ্রহ করে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন!', 'error');
      return;
    }
    if (!selectedPkgForBuy) return;

    // Strict Rule: 1 user can only have 1 active package at a time
    if (activeVIPSub) {
      haptic('error');
      showToast(
        `❌ আপনি একসাথে শুধুমাত্র ১টি প্যাকেজ একটিভ রাখতে পারবেন। বর্তমানে আপনার "${activeVIPSub.packageName}" প্যাকেজটি চলছে (${activeVIPSub.daysClaimed || 0}/${activeVIPSub.durationDays || 30} দিন)। এই প্যাকেজের মেয়াদ শেষ হওয়ার পরেই নতুন প্যাকেজ একটিভ করতে পারবেন।`,
        'error'
      );
      setSelectedPkgForBuy(null);
      return;
    }

    if (userBalance < selectedPkgForBuy.price) {
      haptic('error');
      showToast(
        `Insufficient balance! Required: ৳${selectedPkgForBuy.price}, Current Balance: ৳${userBalance.toFixed(2)}`,
        'error'
      );
      return;
    }

    setIsBuying(true);
    try {
      // Server-side check: Ensure no active subscription exists in database for this user
      const activeSubsQ = query(
        collection(db, 'vip_subscriptions'),
        where('uid', '==', currentUser.uid),
        where('status', '==', 'Active')
      );
      const activeSubsSnap = await getDocs(activeSubsQ);
      const existingActive = activeSubsSnap.docs.find((d) => {
        const data = d.data();
        return (data.daysClaimed || 0) < (data.durationDays || 30);
      });

      if (existingActive) {
        const activeData = existingActive.data();
        haptic('error');
        showToast(
          `❌ আপনার ইতিমধ্যে "${activeData.packageName || 'VIP'}" প্যাকেজটি সক্রিয় আছে! ওই প্যাকেজ শেষ হবার পরে আবার নতুন করে একটিভ করতে পারবেন।`,
          'error'
        );
        setIsBuying(false);
        setSelectedPkgForBuy(null);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentDbBal = userSnap.exists() ? userSnap.data().balance || 0 : userBalance;

      if (currentDbBal < selectedPkgForBuy.price) {
        showToast('Insufficient balance!', 'error');
        setIsBuying(false);
        return;
      }

      const newBalance = currentDbBal - selectedPkgForBuy.price;
      const dailyAmt = (selectedPkgForBuy.price * (selectedPkgForBuy.dailyReturnPercent || 10)) / 100;
      const nowMs = Date.now();

      // 1. Update user document with VIP Status and Badge
      await updateDoc(userRef, {
        balance: newBalance,
        isVip: true,
        vipPackageName: selectedPkgForBuy.name,
        vipBadge: 'VIP MEMBER',
        vipPrice: selectedPkgForBuy.price,
        vipActivatedAt: new Date().toISOString()
      });

      if (onBalanceUpdate) onBalanceUpdate(newBalance);
      if (onVipStatusChange) onVipStatusChange(true, selectedPkgForBuy.name);

      // 2. Create VIP subscription document
      const newSubData: Omit<UserVIPSubscription, 'id'> = {
        uid: currentUser.uid,
        userName: currentUser.name || 'User',
        userEmail: currentUser.email || '',
        packageId: selectedPkgForBuy.id,
        packageName: selectedPkgForBuy.name,
        packagePrice: selectedPkgForBuy.price,
        packageLogoUrl: selectedPkgForBuy.logoUrl || '',
        packageBannerUrl: selectedPkgForBuy.bannerUrl || '',
        packageIcon: selectedPkgForBuy.icon || 'fa-crown',
        dailyReturnPercent: selectedPkgForBuy.dailyReturnPercent || 10,
        dailyReturnAmount: dailyAmt,
        durationDays: selectedPkgForBuy.durationDays || 30,
        daysClaimed: 0,
        totalEarned: 0,
        purchasedAt: new Date().toISOString(),
        purchasedTimestamp: nowMs,
        lastAutoCreditTimestamp: nowMs,
        status: 'Active'
      };

      await addDoc(collection(db, 'vip_subscriptions'), newSubData);

      // 3. Update package buyersCount in Firestore
      try {
        const pkgRef = doc(db, 'vip_packages', selectedPkgForBuy.id);
        const pkgSnap = await getDoc(pkgRef);
        if (pkgSnap.exists()) {
          const prevCount = pkgSnap.data().buyersCount || 0;
          await updateDoc(pkgRef, { buyersCount: prevCount + 1 });
        }
      } catch (pkgErr) {
        console.warn('Package buyers count update notice:', pkgErr);
      }

      haptic('success');
      showToast(
        `🎉 অভিনন্দন! ${selectedPkgForBuy.name} প্যাকেজ সফলভাবে অ্যাক্টিভ হয়েছে! আপনার প্রোফাইলে VIP ব্যাজ যুক্ত হয়েছে এবং প্রতিদিন ${selectedPkgForBuy.dailyReturnPercent || 10}% লাভ (${selectedPkgForBuy.durationDays || 30} দিন পর্যন্ত) স্বয়ংক্রিয়ভাবে জমা হবে।`,
        'success'
      );
      setSelectedPkgForBuy(null);
    } catch (err: any) {
      console.error('Package purchase error:', err);
      showToast('Purchase failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsBuying(false);
    }
  };

  // Submit withdrawal request
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');

    if (!currentUser?.uid) {
      showToast('অনুগ্রহ করে প্রথমে লগইন করুন!', 'error');
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    const minAmt = currentMethod.minAmount || 50;
    const maxAmt = currentMethod.maxAmount || 50000;

    if (isNaN(amountNum) || amountNum < minAmt) {
      setWithdrawError(`মিনিমাম উত্তোলন পরিমাণ ৳${minAmt}!`);
      haptic('error');
      return;
    }

    if (amountNum > maxAmt) {
      setWithdrawError(`একবারে সর্বোচ্চ উত্তোলন সীমা ৳${maxAmt}!`);
      haptic('error');
      return;
    }

    if (amountNum > userBalance) {
      setWithdrawError(`অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ৳${userBalance.toFixed(2)}`);
      haptic('error');
      return;
    }

    const cleanNumber = withdrawNumber.trim().replace(/\D/g, '');
    if (cleanNumber.length !== 11) {
      setWithdrawError('অ্যাকাউন্ট নাম্বার অবশ্যই সঠিক ১১ ডিজিট হতে হবে (১২ ডিজিট গ্রহণযোগ্য নয়)!');
      haptic('error');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentDbBal = userSnap.exists() ? userSnap.data().balance || 0 : userBalance;

      if (amountNum > currentDbBal) {
        setWithdrawError('অপর্যাপ্ত ব্যালেন্স!');
        setIsSubmittingWithdraw(false);
        return;
      }

      const newBal = currentDbBal - amountNum;
      await updateDoc(userRef, { balance: newBal });
      if (onBalanceUpdate) onBalanceUpdate(newBal);

      const feePct = currentMethod.chargePercent !== undefined ? currentMethod.chargePercent : 5;
      const feeAmt = (amountNum * feePct) / 100;
      const netPayout = Math.max(0, amountNum - feeAmt);

      const reqData: Omit<WithdrawalRequest, 'id'> = {
        uid: currentUser.uid,
        userName: currentUser.name || currentUser.username || 'User',
        userEmail: currentUser.email || '',
        method: currentMethod.name,
        methodId: currentMethod.id,
        methodLogoUrl: currentMethod.logoUrl || '',
        accountType: 'Personal (Send Money)',
        accountNumber: cleanNumber,
        amount: amountNum,
        chargeAmount: feeAmt,
        finalReceiveAmount: netPayout,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        createdTimestamp: Date.now()
      };

      await addDoc(collection(db, 'withdrawals'), reqData);

      haptic('success');
      showToast(
        `✅ ৳${amountNum} উত্তোলন রিকোয়েস্ট (${currentMethod.name}) সফলভাবে জমা হয়েছে! অ্যাডমিন পর্যালোচনা করে দ্রুত পেমেন্ট পাঠিয়ে দেবে।`,
        'success'
      );
      setWithdrawNumber('');
      setWithdrawSectionView('history');
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setWithdrawError('উত্তোলন ব্যর্থ হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* DIRECT VIP HUB PROMOTIONAL MAIN BANNER (ADMIN CONFIGURED) */}
      {vipHubBannerUrl && (
        <div className="w-full rounded-3xl overflow-hidden border border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.22)] relative group animate-fade-in">
          <img
            src={vipHubBannerUrl}
            alt="VIP Official Banner"
            className="w-full h-36 sm:h-52 object-cover object-center transform group-hover:scale-105 transition duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex items-end justify-between p-4">
            <span className="text-xs font-black text-amber-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/40 shadow-lg flex items-center gap-1.5">
              <i className="fas fa-crown text-amber-400"></i> VIP OFFICIAL PROMO
            </span>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        SINGLE UNIFIED VIP PROJECT CONTAINER (ALL IN ENGLISH)
        ========================================================================
      */}
      <div className="rounded-3xl p-5 border border-amber-500/40 bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.18)] relative overflow-hidden space-y-5">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. PROJECT HEADER & VIP BADGE STATUS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Ultra-Luxury Golden VIP Emblem */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border border-amber-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)] shrink-0 overflow-hidden group">
              <div className="absolute inset-0 bg-radial from-amber-400/20 via-transparent to-transparent pointer-events-none" />
              <svg
                className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] transition-transform duration-300 group-hover:scale-105"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 17.5L4 8L8.5 12.5L12 4.5L15.5 12.5L20 8L21.5 17.5H2.5Z"
                  fill="url(#vipRoyalGoldGrad)"
                  stroke="#FEF08A"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="4" r="1.5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="0.5" />
                <circle cx="4" cy="7.5" r="1.2" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="0.5" />
                <circle cx="20" cy="7.5" r="1.2" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="0.5" />
                <rect x="2.5" y="18" width="19" height="2.5" rx="1.2" fill="url(#vipBandGoldGrad)" stroke="#FDE68A" strokeWidth="0.6" />
                <circle cx="6.5" cy="19.25" r="0.7" fill="#FEF08A" />
                <circle cx="12" cy="19.25" r="0.8" fill="#FFFFFF" />
                <circle cx="17.5" cy="19.25" r="0.7" fill="#FEF08A" />
                <defs>
                  <linearGradient id="vipRoyalGoldGrad" x1="2.5" y1="4.5" x2="21.5" y2="18" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FEF08A" />
                    <stop offset="35%" stopColor="#F59E0B" />
                    <stop offset="70%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                  <linearGradient id="vipBandGoldGrad" x1="2.5" y1="18" x2="21.5" y2="20.5" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#78350F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  VIP Membership & Daily Earnings
                </h3>
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
                  ⚡ DAILY REWARDS
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Activate VIP Membership to receive automated daily rewards credited directly to your balance every 24 hours.
              </p>
            </div>
          </div>

          {/* User VIP Badge Status Pill */}
          <div className="text-right">
            {activeVIPSub ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <i className="fas fa-crown text-amber-400 animate-pulse"></i>
                <span className="text-xs font-black text-amber-300 uppercase">
                  {activeVIPSub.packageName} VIP ACTIVE
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold">
                <i className="fas fa-user text-slate-400"></i>
                <span>REGULAR MEMBER</span>
              </div>
            )}
            <div className="text-[10px] text-slate-400 mt-1">
              Main Balance: <strong className="text-emerald-400 font-mono">৳{userBalance.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* 2. ACTIVE VIP INVESTMENT STATUS & 24-HOUR AUTO-CREDIT COUNTDOWN */}
        {activeVIPSub ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/50 border border-amber-500/40 space-y-3 relative overflow-hidden shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/30 overflow-hidden shrink-0 shadow-inner">
                  {activeVIPSub.packageLogoUrl ? (
                    <img src={activeVIPSub.packageLogoUrl} alt={activeVIPSub.packageName} className="w-full h-full object-cover" />
                  ) : (
                    <i className={`fas ${activeVIPSub.packageIcon || 'fa-crown'} text-base text-amber-400`}></i>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{activeVIPSub.packageName} (৳{activeVIPSub.packagePrice})</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                      AUTO-CREDIT RUNNING ⚡
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    দৈনিক ফিক্সড রিটার্ন ({activeVIPSub.dailyReturnPercent || 10}%): <strong className="text-emerald-400 font-mono">+৳{(activeVIPSub.dailyReturnAmount || (activeVIPSub.packagePrice * (activeVIPSub.dailyReturnPercent || 10)) / 100).toFixed(2)} / দিন</strong>
                  </p>
                </div>
              </div>

              {/* Live 24-hour Auto-Credit Countdown Clock */}
              <div className="text-right bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                  পরবর্তী অটো ক্রেডিট
                </span>
                <span className="text-base font-black text-amber-300 font-mono tracking-wider">
                  ⏱️ {formatCountdown(getNextAutoCreditRemainingMs(activeVIPSub))}
                </span>
              </div>
            </div>

            {/* Days Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Duration Progress:</span>
                <span className="font-mono font-bold text-amber-300">
                  {activeVIPSub.daysClaimed || 0} / {activeVIPSub.durationDays || 30} Days Completed
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((activeVIPSub.daysClaimed || 0)) / (activeVIPSub.durationDays || 30)) * 100)}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Notice about 24-hour automatic credit */}
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
              <i className="fas fa-circle-check text-emerald-400 text-sm"></i>
              <span>
                <strong>২৪ ঘণ্টা পর পর স্বয়ংক্রিয় ক্রেডিট সক্রিয়:</strong> কোনো ম্যানুয়াল ক্লিকের প্রয়োজন নেই! প্রতি ২৪ ঘণ্টা পরপর স্বয়ংক্রিয়ভাবে মুনাফা আপনার মেইন ব্যালেন্সে জমা হবে।
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <i className="fas fa-sparkles text-amber-400 text-lg"></i>
            <div className="text-xs text-amber-200">
              <strong>VIP Privilege:</strong> Activate any VIP Membership package below to get a Golden VIP Badge on your profile and earn automated daily rewards credited every 24 hours!
            </div>
          </div>
        )}

        {/* 3. VIP PACKAGES LIST (DYNAMIC DAILY PROFIT & DURATION) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-[10px] shadow-sm">
                <i className="fas fa-gem"></i>
              </span>
              <span>Available VIP Membership Packages</span>
            </h4>
            <span className="text-[10px] text-slate-400">অ্যাডমিন অনুমোদিত প্যাকেজ</span>
          </div>

          {/* Strict 1-User 1-Active Package Rule Banner */}
          {activeVIPSub ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
                  <i className="fas fa-lock text-sm"></i>
                </div>
                <div>
                  <span className="font-black text-amber-300 block">
                    ১ জন ইউজার = ১টি সক্রিয় প্যাকেজ পলিসি
                  </span>
                  <span className="text-[11px] text-slate-300">
                    বর্তমানে আপনার <strong className="text-white">"{activeVIPSub.packageName}"</strong> প্যাকেজটি চলছে ({activeVIPSub.daysClaimed || 0}/{activeVIPSub.durationDays || 30} দিন)। এই প্যাকেজটি শেষ হবার পরে আপনি আবার নতুন করে অন্য যেকোনো প্যাকেজ একটিভ করতে পারবেন।
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black shrink-0 hidden sm:inline-block">
                ১টি চলমান
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {userSubscriptions.some((s) => s.status === 'Cancelled') && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300 shadow-sm">
                  <i className="fas fa-info-circle text-amber-400 text-sm"></i>
                  <span>
                    আপনার পূর্ববর্তী ভিআইপি সাবস্ক্রিপশনটি বাতিল করা হয়েছে। আপনি এখন নতুন করে যেকোনো ভিআইপি প্যাকেজ একটিভ করতে পারবেন।
                  </span>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 shadow-sm">
                <i className="fas fa-circle-check text-emerald-400 text-sm"></i>
                <span>
                  <strong>প্যাকেজ নিয়ম:</strong> ১ জন ইউজার একসাথে ১টি প্যাকেজ একটিভ করতে পারবেন। ওই প্যাকেজ শেষ অথবা বাতিল হলে আবার নতুন করে প্যাকেজ একটিভ করতে পারবেন।
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {packages
              .filter((p) => p.isActive !== false)
              .map((pkg) => {
                const returnPercent = pkg.dailyReturnPercent || 10;
                const durationDays = pkg.durationDays || 30;
                const dailyProfit = (pkg.price * returnPercent) / 100;
                const totalProfit = dailyProfit * durationDays;
                const isAffordable = userBalance >= pkg.price;
                const isCurrentActive = activeVIPSub?.packageId === pkg.id;
                const hasOtherActive = !!activeVIPSub && !isCurrentActive;
                const buyersCount = Math.max(
                  pkg.buyersCount || 0,
                  (packageBuyersCountMap[pkg.id] || 0) + (pkg.baseBuyersCount || 0)
                );

                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl bg-slate-900/90 border transition-all duration-300 shadow-md flex flex-col justify-between relative overflow-hidden ${
                      isCurrentActive
                        ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : hasOtherActive
                        ? 'border-white/5 opacity-75 hover:opacity-90'
                        : 'border-white/10 hover:border-amber-500/50 hover:shadow-lg'
                    }`}
                  >
                    {/* Direct Package Cover Banner (if set by admin) */}
                    {pkg.bannerUrl && (
                      <div className="w-full h-24 relative overflow-hidden border-b border-amber-500/25 bg-black">
                        <img src={pkg.bannerUrl} alt={pkg.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                      </div>
                    )}

                    {isCurrentActive && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow z-10">
                        👑 ACTIVE PACKAGE
                      </span>
                    )}

                    {hasOtherActive && (
                      <span className="absolute top-2 right-2 bg-slate-900/90 text-amber-300 border border-amber-500/40 font-bold text-[9px] px-2 py-0.5 rounded-full shadow z-10 flex items-center gap-1">
                        <i className="fas fa-lock text-[8px]"></i>
                        <span>লক করা</span>
                      </span>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-1">
                          <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                            {pkg.badge || `${returnPercent}% Daily`}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                            ⏱️ {durationDays} দিন
                          </span>
                        </div>

                        {/* Package Logo & Title */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <div
                            className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/10 border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner ${
                              pkg.bannerUrl ? '-mt-7 ring-2 ring-slate-900 bg-slate-900' : ''
                            }`}
                          >
                            {pkg.logoUrl ? (
                              <img src={pkg.logoUrl} alt={pkg.name} className="w-full h-full object-cover" />
                            ) : (
                              <i className={`fas ${pkg.icon || 'fa-crown'} text-amber-400 text-base`}></i>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-black text-white leading-tight truncate">{pkg.name}</h5>
                            {/* Buyers Count Badge */}
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                              <i className="fas fa-users text-amber-400 text-[8px]"></i>
                              <span>{buyersCount} জন কিনেছেন</span>
                            </div>
                          </div>
                        </div>

                        {/* Big Price */}
                        <div className="my-1.5 p-2 rounded-xl bg-black/40 border border-white/5 flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-amber-400 font-black">৳</span>
                            <span className="text-xl font-black text-white font-mono">{pkg.price}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold font-mono">
                            দৈনিক +৳{dailyProfit.toFixed(1)}
                          </span>
                        </div>

                        {/* Profit Highlights */}
                        <div className="space-y-1 text-[11px] text-slate-300 bg-white/5 p-2 rounded-xl mb-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">দৈনিক লাভ ({returnPercent}%):</span>
                            <span className="font-mono font-black text-emerald-400">+৳{dailyProfit.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">মোট লাভ ({durationDays} দিনে):</span>
                            <span className="font-mono font-black text-amber-400">৳{totalProfit.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                            <span>অটো ক্রেডিট:</span>
                            <span className="text-emerald-300 font-bold">প্রতি ২৪ ঘণ্টায় ⚡</span>
                          </div>
                        </div>
                      </div>

                      {/* Package Action Button according to 1 active rule */}
                      {isCurrentActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            haptic('light');
                            showToast(
                              `আপনার "${pkg.name}" প্যাকেজটি বর্তমানে সক্রিয় রয়েছে। এটি শেষ হলে নতুন প্যাকেজ নিতে পারবেন।`,
                              'info'
                            );
                          }}
                          className="w-full py-2 rounded-xl font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                        >
                          <i className="fas fa-bolt text-xs text-amber-400 animate-pulse"></i>
                          <span>চলমান আছে ({activeVIPSub.daysClaimed || 0}/{activeVIPSub.durationDays || 30} দিন)</span>
                        </button>
                      ) : hasOtherActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            haptic('error');
                            showToast(
                              `❌ আপনার ইতিমধ্যে "${activeVIPSub.packageName}" প্যাকেজটি চলছে। ১ জন ইউজার একসাথে ১টি প্যাকেজই চালাতে পারবেন। বর্তমান প্যাকেজ শেষ হলে নতুন প্যাকেজ নিতে পারবেন।`,
                              'error'
                            );
                          }}
                          className="w-full py-2 rounded-xl font-bold text-xs transition shadow flex items-center justify-center gap-1.5 bg-slate-800/90 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-slate-300 cursor-not-allowed"
                        >
                          <i className="fas fa-lock text-xs text-amber-400/80"></i>
                          <span>১টি প্যাকেজ চালু আছে 🔒</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAffordable) {
                              setSelectedPkgForBuy(pkg);
                              haptic('light');
                            } else {
                              if (onNavigateTab) onNavigateTab('deposit');
                              showToast(`প্রথমে ব্যালেন্স ডিপোজিট করুন! প্রয়োজন: ৳${pkg.price}`, 'info');
                              haptic('light');
                            }
                          }}
                          className={`w-full py-2 rounded-xl font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                            isAffordable
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          <i className="fas fa-crown text-xs"></i>
                          <span>{isAffordable ? '👑 প্যাকেজটি একটিভ করুন' : 'ব্যালেন্স ডিপোজিট করুন'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 4. WITHDRAWAL & CASHOUT MODULE (IN ENGLISH) */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/30">
                <i className="fas fa-money-bill-transfer"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Withdraw & Cashout Funds
                </h4>
                <p className="text-[10px] text-slate-400">
                  Instant withdrawals to bKash, Nagad, or Rocket
                </p>
              </div>
            </div>

            {/* Toggle between Form and History */}
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setWithdrawSectionView('form');
                  haptic('light');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                  withdrawSectionView === 'form'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💸 Withdraw Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setWithdrawSectionView('history');
                  haptic('light');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                  withdrawSectionView === 'history'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📜 History</span>
                {withdrawals.length > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {withdrawals.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* VIEW A: WITHDRAWAL FORM */}
          {withdrawSectionView === 'form' && (
            <form onSubmit={handleSubmitWithdrawal} className="space-y-3.5">
              {withdrawError && (
                <div className="p-2.5 rounded-xl bg-red-900/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-shake">
                  <i className="fas fa-circle-exclamation"></i>
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Dynamic Method Selector with Admin Configured Logos */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <i className="fas fa-credit-card text-emerald-400"></i>
                    <span>উত্তোলন মেথড নির্বাচন করুন:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    চার্জ: <strong className="text-emerald-400 font-bold">{methodFeePercent}%</strong> (শুধু সেন্ড মানি)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {withdrawalMethods.map((m) => {
                    const isSelected = m.id === selectedMethodId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethodId(m.id);
                          haptic('light');
                        }}
                        className={`p-2.5 rounded-2xl border text-xs font-black transition-all duration-200 flex items-center gap-2.5 text-left relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {/* Method Logo Box */}
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center p-1.5 shrink-0 shadow-inner overflow-hidden">
                          {m.logoUrl ? (
                            <img
                              src={m.logoUrl}
                              alt={m.name}
                              className="w-full h-full object-contain filter drop-shadow"
                            />
                          ) : (
                            <i className={`fas ${m.icon || 'fa-wallet'} text-lg text-emerald-400`}></i>
                          )}
                        </div>

                        {/* Method Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-black text-white text-xs">{m.name}</span>
                            {isSelected && (
                              <i className="fas fa-circle-check text-emerald-400 text-xs shrink-0"></i>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Min: <strong className="text-amber-300">৳{m.minAmount}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction Mode & 11-Digit Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">লেনদেনের ধরন:</label>
                  <div className="py-2.5 px-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between text-xs shadow-inner">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <i className="fas fa-paper-plane text-emerald-400"></i>
                      <span>শুধু সেন্ড মানি (Send Money)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      Personal
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300 block">
                      {currentMethod.name} নাম্বার (১১ ডিজিট):
                    </label>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        withdrawNumber.length === 11 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {withdrawNumber.length}/11 ডিজিট
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      placeholder="01XXXXXXXXX"
                      value={withdrawNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setWithdrawNumber(clean);
                      }}
                      className="input-modern py-2 text-xs font-mono w-full pl-8 tracking-wider"
                    />
                    <i className="fas fa-phone absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                  </div>
                  <div className="text-[10px] text-amber-300/90 mt-1 flex items-center gap-1">
                    <i className="fas fa-circle-exclamation text-[10px] text-amber-400"></i>
                    <span>১২ ডিজিট হবে না, অবশ্যই সঠিক ১১ ডিজিট লিখবেন।</span>
                  </div>
                </div>
              </div>

              {/* Amount input & Quick preset buttons */}
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <i className="fas fa-bangladeshi-taka-sign text-amber-400"></i>
                    <span>উত্তোলনের পরিমাণ (BDT):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    ওয়ালেট ব্যালেন্স: <strong className="text-emerald-400 font-mono">৳{userBalance.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-slate-400 font-black text-sm">৳</span>
                  <input
                    type="number"
                    required
                    min={currentMethod.minAmount || 50}
                    max={userBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-modern py-2 pl-8 text-sm font-mono w-full font-bold"
                    placeholder={`মিনিমাম ৳${currentMethod.minAmount || 50}`}
                  />
                </div>

                {/* Preset amount buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['50', '100', '200', '500', '1000', '2000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setWithdrawAmount(amt);
                        haptic('light');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                        withdrawAmount === amt
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawAmount(Math.floor(userBalance).toString());
                      haptic('light');
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] text-amber-300 border border-amber-500/30 font-bold cursor-pointer transition active:scale-95"
                  >
                    ⚡ সব টাকা ({Math.floor(userBalance)}৳)
                  </button>
                </div>
              </div>

              {/* UNIQUE LIVE CALCULATION & RECEIPT BREAKDOWN */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/25 space-y-2 text-xs shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-receipt text-emerald-400"></i>
                    <span>লাইভ হিসাব সারাংশ</span>
                  </span>
                  <span className="text-slate-500 font-mono">
                    মেথড: <strong className="text-white">{currentMethod.name}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">উত্তোলনের মোট পরিমাণ:</span>
                    <span className="font-mono text-white">৳{withdrawAmtNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      সেন্ড মানি চার্জ ({methodFeePercent}%):
                    </span>
                    <span className="font-mono text-amber-300">
                      - ৳{chargeAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/10 font-bold text-xs">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <i className="fas fa-check-circle"></i>
                      <span>আপনি অ্যাকাউন্টে পাবেন:</span>
                    </span>
                    <span className="text-emerald-300 font-mono text-sm font-black animate-pulse">
                      ৳ {finalReceiveAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>উত্তোলনের পর ব্যালেন্স থাকবে:</span>
                    <span className="font-mono text-slate-300">৳{remainingBalanceAfter.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Admin Configured Method Instructions */}
              {currentMethod.instructions && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                  <i className="fas fa-lightbulb text-amber-400 mt-0.5 shrink-0"></i>
                  <span>{currentMethod.instructions}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingWithdraw || userBalance < (currentMethod.minAmount || 50)}
                className={`w-full py-3 rounded-2xl font-black text-xs transition-all duration-200 shadow-xl flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                  userBalance >= (currentMethod.minAmount || 50)
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                <i className={`fas ${isSubmittingWithdraw ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                <span>
                  {isSubmittingWithdraw
                    ? 'রিকোয়েস্ট পাঠানো হচ্ছে...'
                    : `৳${withdrawAmtNum || 0} উত্তোলন রিকোয়েস্ট পাঠান`}
                </span>
              </button>
            </form>
          )}

          {/* VIEW B: UNIQUE WITHDRAWAL HISTORY */}
          {withdrawSectionView === 'history' && (
            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-black/20 border border-white/5 flex flex-col items-center justify-center gap-2">
                  <i className="fas fa-clock-rotate-left text-2xl text-slate-600"></i>
                  <p>এখনো কোনো উত্তোলন রিকোয়েস্ট জমা দেওয়া হয়নি।</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {withdrawals.map((w) => {
                    const matchingMethod = withdrawalMethods.find((m) => m.name === w.method || m.id === w.methodId);
                    const displayLogo = w.methodLogoUrl || matchingMethod?.logoUrl || '';

                    return (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3 text-xs shadow-md transition hover:border-emerald-500/30"
                      >
                        {/* Top row: Logo, Method, Amount & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
                              {displayLogo ? (
                                <img
                                  src={displayLogo}
                                  alt={w.method}
                                  className="w-full h-full object-contain filter drop-shadow"
                                />
                              ) : (
                                <i className="fas fa-wallet text-emerald-400 text-lg"></i>
                              )}
                            </div>
                            <div>
                              <div className="font-black text-white text-xs flex items-center gap-1.5">
                                <span>{w.method}</span>
                                {w.accountType && (
                                  <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.2 rounded font-normal">
                                    {w.accountType}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-amber-300 font-mono font-bold mt-0.5">
                                {w.accountNumber}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-emerald-400 text-base">
                              ৳{w.amount.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {new Date(w.createdAt).toLocaleString('bn-BD', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 3-Step Live Status Progression Bar */}
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                w.status === 'Approved'
                                  ? 'text-emerald-400'
                                  : w.status === 'Rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              <i
                                className={`fas ${
                                  w.status === 'Approved'
                                    ? 'fa-circle-check text-emerald-400'
                                    : w.status === 'Rejected'
                                    ? 'fa-circle-xmark text-red-400'
                                    : 'fa-spinner fa-spin text-amber-400'
                                }`}
                              ></i>
                              <span>
                                {w.status === 'Approved'
                                  ? 'পেমেন্ট সফল (Paid)'
                                  : w.status === 'Rejected'
                                  ? 'বাতিল ও রিফান্ড হয়েছে'
                                  : 'অ্যাডমিন ভেরিফিকেশন চলছে'}
                              </span>
                            </span>

                            <span className="text-[9px] text-slate-400 font-mono">
                              {w.status === 'Pending' ? 'আনুমানিক ১-১২ ঘণ্টা' : 'সম্পন্ন'}
                            </span>
                          </div>

                          {/* Progress bar track */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                w.status === 'Approved'
                                  ? 'w-full bg-emerald-500'
                                  : w.status === 'Rejected'
                                  ? 'w-full bg-red-500'
                                  : 'w-2/3 bg-amber-500 animate-pulse'
                              }`}
                            ></div>
                          </div>
                        </div>

                        {/* Approved TrxID Box with Copy Feature */}
                        {w.status === 'Approved' && w.trxId && (
                          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <i className="fas fa-barcode text-emerald-400"></i>
                              <span className="text-slate-400">TrxID:</span>
                              <strong className="font-mono text-emerald-300 truncate">
                                {w.trxId}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(w.trxId || '');
                                haptic('success');
                                showToast('✅ TrxID কপি করা হয়েছে!', 'success');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-[10px] shrink-0 transition cursor-pointer"
                            >
                              কপি
                            </button>
                          </div>
                        )}

                        {/* Rejected Notice Box */}
                        {w.status === 'Rejected' && (
                          <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-[10px] text-red-300 flex items-start gap-1.5">
                            <i className="fas fa-circle-exclamation text-red-400 mt-0.5 shrink-0"></i>
                            <div>
                              <span>বাতিলের কারণ: <strong>{w.rejectReason || w.adminNote || 'ভুল অ্যাকাউন্ট তথ্য'}</strong></span>
                              <div className="text-[9px] text-red-400/80 mt-0.5">
                                ৳{w.amount.toFixed(2)} টাকা স্বয়ংক্রিয়ভাবে মূল ওয়ালেটে ফেরত দেওয়া হয়েছে।
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. BUY PACKAGE CONFIRMATION MODAL */}
      {selectedPkgForBuy && (() => {
        const pkgReturnPercent = selectedPkgForBuy.dailyReturnPercent || 10;
        const pkgDurationDays = selectedPkgForBuy.durationDays || 30;
        const pkgDailyAmt = (selectedPkgForBuy.price * pkgReturnPercent) / 100;
        const pkgTotalProfit = pkgDailyAmt * pkgDurationDays;
        const totalBuyers = Math.max(
          selectedPkgForBuy.buyersCount || 0,
          (packageBuyersCountMap[selectedPkgForBuy.id] || 0) + (selectedPkgForBuy.baseBuyersCount || 0)
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden">
              {/* Modal Cover Banner */}
              {selectedPkgForBuy.bannerUrl && (
                <div className="w-full h-28 relative overflow-hidden border-b border-amber-500/30 bg-black">
                  <img src={selectedPkgForBuy.bannerUrl} alt={selectedPkgForBuy.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                </div>
              )}

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl font-black shadow-lg overflow-hidden shrink-0 ${
                      selectedPkgForBuy.bannerUrl ? '-mt-9 ring-2 ring-slate-900 bg-slate-900' : ''
                    }`}
                  >
                    {selectedPkgForBuy.logoUrl ? (
                      <img src={selectedPkgForBuy.logoUrl} alt={selectedPkgForBuy.name} className="w-full h-full object-cover" />
                    ) : (
                      <i className={`fas ${selectedPkgForBuy.icon || 'fa-crown'} text-xl text-amber-400`}></i>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white truncate">{selectedPkgForBuy.name}</h3>
                    <p className="text-[10px] text-amber-300 font-bold">VIP Membership Confirmation</p>
                  </div>
                </div>

              <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>প্যাকেজ মূল্য:</span>
                  <span className="font-mono font-black text-white">৳{selectedPkgForBuy.price}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>দৈনিক অটো লাভ ({pkgReturnPercent}%):</span>
                  <span className="font-mono font-black text-emerald-400">
                    +৳{pkgDailyAmt.toFixed(2)} / দিন
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>মেয়াদ:</span>
                  <span className="font-bold text-white">{pkgDurationDays} দিন</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>মোট রিটার্ন ({pkgDurationDays} দিনে):</span>
                  <span className="font-mono font-black text-amber-300">
                    ৳{pkgTotalProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span>মোট ক্রয় করেছেন:</span>
                  <span className="font-bold text-amber-300">
                    👥 {totalBuyers} জন ইউজার
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">আপনার বর্তমান ব্যালেন্স:</span>
                  <span className="font-mono font-bold text-emerald-400">৳{userBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Active package lock notice or Guarantee */}
              {activeVIPSub ? (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-[11px] text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-200">
                    <i className="fas fa-triangle-exclamation text-amber-400"></i>
                    <span>প্যাকেজ সীমাবদ্ধতা নিয়ম:</span>
                  </div>
                  <p>
                    আপনার ইতিমধ্যে <strong>"{activeVIPSub.packageName}"</strong> প্যাকেজটি চলছে ({activeVIPSub.daysClaimed || 0}/{activeVIPSub.durationDays || 30} দিন)। ১ জন ইউজার একসাথে ১টি প্যাকেজই একটিভ রাখতে পারবেন। ওই প্যাকেজ শেষ হবার পরে আবার নতুন প্যাকেজ নিতে পারবেন।
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                  ⚡ <strong>২৪ ঘণ্টা অটো ক্রেডিট:</strong> প্যাকেজটি কেনা মাত্রই প্রোফাইলে <strong>VIP ব্যাজ</strong> সক্রিয় হবে এবং প্রতিদিন {pkgReturnPercent}% হারে লাভ প্রতি ২৪ ঘণ্টায় স্বয়ংক্রিয়ভাবে আপনার একাউন্টে যোগ হবে।
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedPkgForBuy(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBuyPackage}
                  disabled={isBuying || userBalance < selectedPkgForBuy.price || !!activeVIPSub}
                  className={`flex-1 py-2 rounded-xl text-xs font-black shadow transition ${
                    isBuying || userBalance < selectedPkgForBuy.price || !!activeVIPSub
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 active:scale-95'
                  }`}
                >
                  {isBuying
                    ? 'অ্যাক্টিভ হচ্ছে...'
                    : activeVIPSub
                    ? 'একটি প্যাকেজ চলমান আছে'
                    : 'নিশ্চিত ও ক্রয় করুন'}
                </button>
              </div>
            </div>
          </div>
          </div>
        );
      })()}
    </div>
  );
};
