import React, { useState, useEffect } from 'react';
import {
  db,
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  addDoc,
  getDoc
} from '../firebase';
import {
  WithdrawalRequest,
  WithdrawalMethodConfig,
  DEFAULT_WITHDRAWAL_METHODS
} from '../types/vip';

interface ProfileWithdrawalHubProps {
  currentUser: {
    uid: string;
    name?: string;
    email?: string;
    username?: string;
  } | null;
  userBalance: number;
  onBalanceUpdate?: (newBalance: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const ProfileWithdrawalHub: React.FC<ProfileWithdrawalHubProps> = ({
  currentUser,
  userBalance,
  onBalanceUpdate,
  showToast,
  haptic = () => {}
}) => {
  const [activeView, setActiveView] = useState<'form' | 'history'>('form');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Withdrawal Methods State (from Firestore withdrawal_methods)
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethodConfig[]>(DEFAULT_WITHDRAWAL_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('bkash');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Listen to dynamic withdrawal methods configured from Admin Panel
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
          console.warn('Profile withdrawal methods notice:', err);
          setWithdrawalMethods(DEFAULT_WITHDRAWAL_METHODS);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setWithdrawalMethods(DEFAULT_WITHDRAWAL_METHODS);
    }
  }, [selectedMethodId]);

  // 2. Listen to user withdrawals in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
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
          setLoading(false);
        },
        (err) => {
          console.warn('Profile withdrawals listener notice:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // Current selected method
  const currentMethod =
    withdrawalMethods.find((m) => m.id === selectedMethodId) ||
    withdrawalMethods[0] ||
    DEFAULT_WITHDRAWAL_METHODS[0];

  // Dynamic fee & payout calculation (matching VIP system)
  const withdrawAmtNum = parseFloat(withdrawAmount) || 0;
  const methodFeePercent = currentMethod.chargePercent !== undefined ? currentMethod.chargePercent : 5;
  const chargeAmount = (withdrawAmtNum * methodFeePercent) / 100;
  const finalReceiveAmount = Math.max(0, withdrawAmtNum - chargeAmount);
  const remainingBalanceAfter = Math.max(0, userBalance - withdrawAmtNum);

  // Submit withdrawal request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser?.uid) {
      showToast('অনুগ্রহ করে প্রথমে একাউন্টে লগইন করুন!', 'error');
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    const minAmt = currentMethod.minAmount || 50;
    const maxAmt = currentMethod.maxAmount || 50000;

    if (isNaN(amountNum) || amountNum < minAmt) {
      setErrorMsg(`মিনিমাম উত্তোলন পরিমাণ ৳${minAmt}!`);
      haptic('error');
      return;
    }

    if (amountNum > maxAmt) {
      setErrorMsg(`একবারে সর্বোচ্চ উত্তোলন সীমা ৳${maxAmt}!`);
      haptic('error');
      return;
    }

    if (amountNum > userBalance) {
      setErrorMsg(`অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ৳${userBalance.toFixed(2)}`);
      haptic('error');
      return;
    }

    const cleanNumber = withdrawNumber.trim().replace(/\D/g, '');
    if (cleanNumber.length !== 11) {
      setErrorMsg('অ্যাকাউন্ট নাম্বার অবশ্যই সঠিক ১১ ডিজিট হতে হবে (১২ ডিজিট গ্রহণযোগ্য নয়)!');
      haptic('error');
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentDbBal = userSnap.exists() ? userSnap.data().balance || 0 : userBalance;

      if (amountNum > currentDbBal) {
        setErrorMsg('অপর্যাপ্ত ব্যালেন্স!');
        setIsSubmitting(false);
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
        `✅ ৳${amountNum} টাকা উত্তোলনের রিকোয়েস্ট সফলভাবে জমা হয়েছে! (${currentMethod.name}: ${cleanNumber})`,
        'success'
      );
      setWithdrawNumber('');
      setWithdrawAmount(currentMethod.minAmount ? currentMethod.minAmount.toString() : '100');
      setActiveView('history');
    } catch (err: any) {
      console.error('Profile withdrawal submission error:', err);
      setErrorMsg('উত্তোলন রিকোয়েস্টে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header matching VIP module */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/30 shadow-md">
            <i className="fas fa-money-bill-transfer"></i>
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>টাকা উত্তোলন (Cashout / Withdraw)</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
                FAST CASHOUT
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              বিকাশ, নগদ ও রকেটে দ্রুত টাকা উত্তোলন (Instant withdrawals to bKash, Nagad, or Rocket)
            </p>
          </div>
        </div>

        {/* Toggle between Form and History */}
        <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveView('form');
              haptic('light');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 cursor-pointer ${
              activeView === 'form'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💸 Withdraw Form</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('history');
              haptic('light');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 cursor-pointer ${
              activeView === 'history'
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
      {activeView === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-900/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-shake">
              <i className="fas fa-circle-exclamation text-sm"></i>
              <span>{errorMsg}</span>
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
            disabled={isSubmitting || userBalance < (currentMethod.minAmount || 50)}
            className={`w-full py-3 rounded-2xl font-black text-xs transition-all duration-200 shadow-xl flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
              userBalance >= (currentMethod.minAmount || 50)
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            <span>
              {isSubmitting
                ? 'রিকোয়েস্ট পাঠানো হচ্ছে...'
                : `৳${withdrawAmtNum || 0} উত্তোলন রিকোয়েস্ট পাঠান`}
            </span>
          </button>
        </form>
      )}

      {/* VIEW B: UNIQUE WITHDRAWAL HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-3 relative z-10">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <i className="fas fa-spinner fa-spin mr-2"></i> হিস্টোরি লোড হচ্ছে...
            </div>
          ) : withdrawals.length === 0 ? (
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
  );
};
