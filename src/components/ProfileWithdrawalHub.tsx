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
import { WithdrawalRequest } from '../types/vip';

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

  // Form State
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [accountType, setAccountType] = useState<'Personal' | 'Agent'>('Personal');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Listen to user withdrawals in Firestore
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
          console.warn('Withdrawals listener error:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser?.uid) {
      showToast('অনুগ্রহ করে প্রথমে একাউন্টে লগইন করুন!', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      setErrorMsg('সর্বনিম্ন উত্তোলনের পরিমাণ ৫০ টাকা!');
      haptic('error');
      return;
    }

    if (numAmount > userBalance) {
      setErrorMsg(`আপনার পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${userBalance.toFixed(2)}`);
      haptic('error');
      return;
    }

    const cleanNum = accountNumber.trim();
    if (!cleanNum || cleanNum.length < 11) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল একাউন্ট নম্বর দিন!');
      haptic('error');
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentDbBal = userSnap.exists() ? userSnap.data().balance || 0 : userBalance;

      if (numAmount > currentDbBal) {
        setErrorMsg('পর্যাপ্ত ব্যালেন্স নেই!');
        setIsSubmitting(false);
        return;
      }

      const newBal = currentDbBal - numAmount;
      await updateDoc(userRef, { balance: newBal });
      if (onBalanceUpdate) onBalanceUpdate(newBal);

      const reqData: Omit<WithdrawalRequest, 'id'> = {
        uid: currentUser.uid,
        userName: currentUser.name || currentUser.username || 'User',
        userEmail: currentUser.email || '',
        method,
        accountType,
        accountNumber: cleanNum,
        amount: numAmount,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        createdTimestamp: Date.now()
      };

      await addDoc(collection(db, 'withdrawals'), reqData);

      haptic('success');
      showToast(
        `✅ ৳${numAmount} টাকা উত্তোলনের রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন দ্রুত পেমেন্ট সম্পন্ন করবে।`,
        'success'
      );
      setAccountNumber('');
      setAmount('100');
      setActiveView('history');
    } catch (err: any) {
      console.error('Withdrawal submission error:', err);
      setErrorMsg('উত্তোলন রিকোয়েস্টে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-4 space-y-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/95 via-[#0b1329] to-slate-950 shadow-xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-lg font-black shadow-lg shadow-emerald-500/30">
            <i className="fas fa-wallet"></i>
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>টাকা উত্তোলন (Cashout / Withdraw)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                FAST CASHOUT
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              বিকাশ, নগদ ও রকেটে দ্রুত টাকা উত্তোলন করুন
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveView('form');
              haptic('light');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
              activeView === 'form'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-paper-plane text-[10px]"></i>
            <span>উত্তোলন ফরম</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('history');
              haptic('light');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-receipt text-[10px]"></i>
            <span>হিস্টোরি</span>
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
            <div className="p-2.5 rounded-xl bg-red-900/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fade-in">
              <i className="fas fa-circle-exclamation text-sm"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              পেমেন্ট মাধ্যম নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bKash', 'Nagad', 'Rocket'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    haptic('light');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 ${
                    method === m
                      ? m === 'bKash'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-600/30'
                        : m === 'Nagad'
                        ? 'bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/30'
                        : 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{m === 'bKash' ? 'বিকাশ (bKash)' : m === 'Nagad' ? 'নগদ (Nagad)' : 'রকেট (Rocket)'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Type & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">একাউন্ট টাইপ:</label>
              <div className="flex gap-2">
                {(['Personal', 'Agent'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setAccountType(type);
                      haptic('light');
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                      accountType === type
                        ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {type === 'Personal' ? 'পার্সোনাল (Personal)' : 'এজেন্ট (Agent)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                {method} নম্বর (১১ ডিজিট):
              </label>
              <input
                type="text"
                required
                placeholder="01XXXXXXXXX"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="input-modern py-1.5 text-xs font-mono w-full"
                maxLength={11}
              />
            </div>
          </div>

          {/* Amount input & presets */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <label className="font-bold text-slate-300">উত্তোলনের পরিমাণ (টাকা):</label>
              <span className="text-[11px] text-slate-400">
                বর্তমান ব্যালেন্স: <strong className="text-emerald-400 font-mono">৳{userBalance.toFixed(2)}</strong>
              </span>
            </div>

            <input
              type="number"
              required
              min={50}
              max={userBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-modern py-2 text-sm font-mono font-bold w-full"
              placeholder="সর্বনিম্ন ৫০ টাকা"
            />

            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['50', '100', '200', '500', '1000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setAmount(amt);
                    haptic('light');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 border border-white/10 font-mono font-bold"
                >
                  ৳{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setAmount(Math.floor(userBalance).toString());
                  haptic('light');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] text-emerald-300 border border-emerald-500/30 font-bold"
              >
                সম্পূর্ণ ব্যালেন্স
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || userBalance < 50}
            className={`w-full py-2.5 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
              userBalance >= 50
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
            <span>{isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'উত্তোলন রিকোয়েস্ট সাবমিট করুন'}</span>
          </button>
        </form>
      )}

      {/* VIEW B: WITHDRAWAL HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-2 relative z-10">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <i className="fas fa-spinner fa-spin mr-2"></i> হিস্টোরি লোড হচ্ছে...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs rounded-2xl bg-black/20 border border-white/5">
              এখনও পর্যন্ত কোনো উত্তোলন রিকোয়েস্ট নেই।
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow ${
                        w.method === 'bKash'
                          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                          : w.method === 'Nagad'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {w.method === 'bKash' ? 'bK' : w.method === 'Nagad' ? 'NG' : 'RK'}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{w.method} ({w.accountType === 'Personal' ? 'পার্সোনাল' : 'এজেন্ট'})</span>
                        <span className="text-amber-300 font-mono">{w.accountNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(w.createdAt).toLocaleString('bn-BD', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {w.adminNote && (
                        <div className="text-[10px] text-amber-300/90 mt-0.5 font-mono">
                          নোট: {w.adminNote}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-emerald-400 text-sm">
                      ৳ {w.amount.toFixed(2)}
                    </div>
                    <span
                      className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border uppercase mt-0.5 ${
                        w.status === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : w.status === 'Rejected'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      }`}
                    >
                      {w.status === 'Approved'
                        ? 'পেমেন্ট সম্পন্ন ✅'
                        : w.status === 'Rejected'
                        ? 'বাতিল ও রিফান্ড ❌'
                        : 'অপেক্ষমাণ ⏳'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
