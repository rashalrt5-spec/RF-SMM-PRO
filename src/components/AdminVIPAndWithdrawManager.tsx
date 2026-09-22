import React, { useState, useEffect } from 'react';
import {
  db,
  doc,
  collection,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc
} from '../firebase';
import {
  VIPPackage,
  UserVIPSubscription,
  WithdrawalRequest,
  WithdrawalMethodConfig,
  DEFAULT_VIP_PACKAGES
} from '../types/vip';
import { AdminPackagesManager } from './AdminPackagesManager';
import { AdminWithdrawalMethodsManager } from './AdminWithdrawalMethodsManager';

interface AdminVIPAndWithdrawManagerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const AdminVIPAndWithdrawManager: React.FC<AdminVIPAndWithdrawManagerProps> = ({
  showToast,
  haptic = () => {}
}) => {
  const [adminTab, setAdminTab] = useState<'withdrawals' | 'methods' | 'packages' | 'subscriptions'>('withdrawals');

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Approve modal state
  const [approvingWithdrawal, setApprovingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [approveTrxId, setApproveTrxId] = useState('');
  const [approveAdminNote, setApproveAdminNote] = useState('');

  // Reject modal state
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Incorrect account information or mobile banking issue');

  // VIP Packages state
  const [packages, setPackages] = useState<VIPPackage[]>([]);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState('100');
  const [pkgDailyPercent, setPkgDailyPercent] = useState('10');
  const [pkgDuration, setPkgDuration] = useState('30');
  const [pkgLogoUrl, setPkgLogoUrl] = useState('');
  const [pkgBannerUrl, setPkgBannerUrl] = useState('');
  const [pkgIcon, setPkgIcon] = useState('fa-crown');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [pkgBadge, setPkgBadge] = useState('🔥 10% Daily');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [isSavingPkg, setIsSavingPkg] = useState(false);

  // VIP Hub General Header Banner state
  const [vipHubBannerUrl, setVipHubBannerUrl] = useState('');
  const [isUploadingHubBanner, setIsUploadingHubBanner] = useState(false);
  const [isSavingHubBanner, setIsSavingHubBanner] = useState(false);

  // Logo file upload handler
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('ছবি ২MB এর কম হতে হবে!', 'error');
      return;
    }
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPkgLogoUrl(result);
        showToast('✅ লোগো প্রিভিউ যুক্ত হয়েছে!', 'success');
      }
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      showToast('লোগো রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Package Banner file upload handler
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('ব্যানার ছবি ৩MB এর কম হতে হবে!', 'error');
      return;
    }
    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPkgBannerUrl(result);
        showToast('✅ প্যাকেজ ব্যানার প্রিভিউ যুক্ত হয়েছে!', 'success');
      }
      setIsUploadingBanner(false);
    };
    reader.onerror = () => {
      showToast('ব্যানার রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // VIP Hub Main Header Banner file upload handler
  const handleHubBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('ব্যানার ছবি ৩MB এর কম হতে হবে!', 'error');
      return;
    }
    setIsUploadingHubBanner(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setVipHubBannerUrl(result);
        showToast('✅ ব্যানার ছবি সিলেক্ট হয়েছে! এবার "সেভ করুন" চাপুন।', 'success');
      }
      setIsUploadingHubBanner(false);
    };
    reader.onerror = () => {
      showToast('ব্যানার রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingHubBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<UserVIPSubscription[]>([]);

  // 1. Listen to all withdrawals
  useEffect(() => {
    try {
      const q = collection(db, 'withdrawals');
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
        (err) => console.warn('Withdrawals error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 2. Listen to all VIP packages
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
            // If empty in DB, show defaults
            setPackages(DEFAULT_VIP_PACKAGES);
          }
        },
        (err) => console.warn('Packages error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 3. Listen to all VIP subscriptions
  useEffect(() => {
    try {
      const q = collection(db, 'vip_subscriptions');
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: UserVIPSubscription[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as UserVIPSubscription);
          });
          list.sort((a, b) => (b.purchasedTimestamp || 0) - (a.purchasedTimestamp || 0));
          setSubscriptions(list);
        },
        (err) => console.warn('Subscriptions error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 4. Listen to VIP Hub general settings (Hub Banner)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'vip_settings', 'general'),
        (snap) => {
          if (snap.exists()) {
            setVipHubBannerUrl(snap.data().hubBannerUrl || '');
          }
        },
        (err) => console.warn('VIP Hub settings error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Save VIP Hub Header Banner
  const handleSaveHubBanner = async () => {
    setIsSavingHubBanner(true);
    haptic('light');
    try {
      await setDoc(
        doc(db, 'vip_settings', 'general'),
        {
          hubBannerUrl: vipHubBannerUrl.trim(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      showToast('✅ VIP পেজের প্রধান ব্যানার সফলভাবে সংরক্ষিত হয়েছে!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('ব্যানার সংরক্ষণ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSavingHubBanner(false);
    }
  };

  // Approve a withdrawal request
  const handleApproveConfirm = async () => {
    if (!approvingWithdrawal) return;
    setActionLoadingId(approvingWithdrawal.id);
    haptic('heavy');

    try {
      const wRef = doc(db, 'withdrawals', approvingWithdrawal.id);
      await updateDoc(wRef, {
        status: 'Approved',
        trxId: approveTrxId.trim() || 'Paid',
        adminNote: approveAdminNote.trim() || 'Payment successful',
        reviewedAt: new Date().toISOString()
      });

      haptic('success');
      showToast(`✅ ৳${approvingWithdrawal.amount} উত্তোলন সফলভাবে অ্যাপ্রুভ করা হয়েছে!`, 'success');
      setApprovingWithdrawal(null);
      setApproveTrxId('');
      setApproveAdminNote('');
    } catch (err: any) {
      console.error('Approve error:', err);
      showToast('অ্যাপ্রুভ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject a withdrawal request and REFUND balance back to user
  const handleRejectConfirm = async () => {
    if (!rejectingWithdrawal) return;
    setActionLoadingId(rejectingWithdrawal.id);
    haptic('heavy');

    try {
      // 1. Refund amount back to user's balance
      const userRef = doc(db, 'users', rejectingWithdrawal.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const curBal = userSnap.data().balance || 0;
        await updateDoc(userRef, {
          balance: curBal + rejectingWithdrawal.amount
        });
      }

      // 2. Mark withdrawal as rejected
      const wRef = doc(db, 'withdrawals', rejectingWithdrawal.id);
      await updateDoc(wRef, {
        status: 'Rejected',
        adminNote: rejectReason.trim() || 'Rejected by Admin',
        reviewedAt: new Date().toISOString()
      });

      haptic('success');
      showToast(
        `❌ আবেদন বাতিল করা হয়েছে এবং ৳${rejectingWithdrawal.amount} টাকা ইউজারের একাউন্টে রিফান্ড করা হয়েছে!`,
        'info'
      );
      setRejectingWithdrawal(null);
      setRejectReason('তথ্য ভুল অথবা একাউন্টে সমস্যা রয়েছে');
    } catch (err: any) {
      console.error('Reject error:', err);
      showToast('বাতিল করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Seed / Reset Default Packages into Firestore
  const handleSeedDefaultPackages = async () => {
    if (!window.confirm('আপনি কি ডিফল্ট ১০০, ২০০, ৩০০, ৪০০ প্যাকেজগুলো ডাটাবেজে সংরক্ষণ করতে চান?')) return;
    haptic('heavy');
    try {
      for (const p of DEFAULT_VIP_PACKAGES) {
        await setDoc(doc(db, 'vip_packages', p.id), p);
      }
      showToast('✅ ডিফল্ট ভিআইপি প্যাকেজগুলো সফলভাবে সংরক্ষিত হয়েছে!', 'success');
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  // Save / Update VIP Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(pkgPrice);
    const returnNum = parseFloat(pkgDailyPercent) || 10;
    const durationNum = parseInt(pkgDuration, 10) || 30;

    if (!pkgName.trim() || isNaN(priceNum) || priceNum <= 0) {
      showToast('প্যাকেজের নাম ও সঠিক মূল্য দিন!', 'error');
      return;
    }

    setIsSavingPkg(true);
    haptic('light');

    try {
      const dailyAmt = (priceNum * returnNum) / 100;
      const pkgData: Omit<VIPPackage, 'id'> = {
        name: pkgName.trim(),
        price: priceNum,
        dailyReturnPercent: returnNum,
        durationDays: durationNum,
        logoUrl: pkgLogoUrl.trim() || '',
        bannerUrl: pkgBannerUrl.trim() || '',
        icon: pkgIcon.trim() || 'fa-crown',
        badge: pkgBadge.trim() || `${returnNum}% Daily`,
        description: pkgDesc.trim() || `প্রতিদিন ${returnNum}% লাভ (৳${dailyAmt}) হিসেবে ${durationNum} দিনে ৳${dailyAmt * durationNum} আয়!`,
        isActive: pkgIsActive,
        colorTheme: priceNum <= 100 ? 'amber' : priceNum <= 200 ? 'blue' : priceNum <= 300 ? 'purple' : 'rose'
      };

      if (editingPkgId) {
        await updateDoc(doc(db, 'vip_packages', editingPkgId), pkgData as any);
        showToast('✅ প্যাকেজ আপডেট করা হয়েছে!', 'success');
      } else {
        const newId = `vip_${priceNum}_${Date.now().toString().slice(-4)}`;
        await setDoc(doc(db, 'vip_packages', newId), { id: newId, ...pkgData });
        showToast('✅ নতুন ভিআইপি প্যাকেজ তৈরি হয়েছে!', 'success');
      }

      setIsEditingPackage(false);
      setEditingPkgId(null);
      setPkgName('');
      setPkgPrice('100');
      setPkgDailyPercent('10');
      setPkgDuration('30');
      setPkgLogoUrl('');
      setPkgBannerUrl('');
      setPkgIcon('fa-crown');
      setPkgBadge('🔥 10% Daily');
      setPkgDesc('');
      setPkgIsActive(true);
    } catch (err: any) {
      console.error(err);
      showToast('সেভ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSavingPkg(false);
    }
  };

  // Delete a package
  const handleDeletePackage = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি "${name}" প্যাকেজটি ডিলিট করতে চান?`)) return;
    try {
      await deleteDoc(doc(db, 'vip_packages', id));
      showToast('প্যাকেজ মুছে ফেলা হয়েছে!', 'info');
    } catch (err: any) {
      showToast('ডিলিট এরর: ' + err.message, 'error');
    }
  };

  // Stats calculation
  const pendingList = withdrawals.filter((w) => w.status === 'Pending');
  const approvedList = withdrawals.filter((w) => w.status === 'Approved');
  const rejectedList = withdrawals.filter((w) => w.status === 'Rejected');

  const totalPendingAmt = pendingList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalApprovedAmt = approvedList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filterStatus !== 'All' && w.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (w.userName || '').toLowerCase().includes(q);
      const matchNum = (w.accountNumber || '').includes(q);
      const matchUid = (w.uid || '').toLowerCase().includes(q);
      const matchTrx = (w.trxId || '').toLowerCase().includes(q);
      return matchName || matchNum || matchUid || matchTrx;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/50 border border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center text-xl font-black shadow-lg">
            <i className="fas fa-money-bill-transfer"></i>
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>VIP Membership & Withdrawals Manager</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                VIP & CASHOUT
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              বিকাশ/নগদ উত্তোলন অনুমোদন, ভিআইপি মেম্বারশিপ প্যাকেজ কন্ট্রোল ও ইউজার মনিটরিং
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleSeedDefaultPackages}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-1.5"
          title="১০০, ২০০, ৩০০, ৪০০ প্যাকেজ ডাটাবেজে রিসেট করুন"
        >
          <i className="fas fa-rotate text-amber-400"></i>
          <span>ডিফল্ট প্যাকেজ রিসেট</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 overflow-x-auto">
        <button
          onClick={() => {
            setAdminTab('withdrawals');
            haptic('light');
          }}
          className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            adminTab === 'withdrawals'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="fas fa-money-bill-transfer"></i>
          <span>উত্তোলন রিকোয়েস্ট ({pendingList.length})</span>
          {pendingList.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {pendingList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setAdminTab('methods');
            haptic('light');
          }}
          className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            adminTab === 'methods'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="fas fa-wallet"></i>
          <span>উত্তোলন মেথড ও লোগো</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('packages');
            haptic('light');
          }}
          className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            adminTab === 'packages'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="fas fa-gem"></i>
          <span>VIP প্যাকেজ সেটিংস ({packages.length})</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('subscriptions');
            haptic('light');
          }}
          className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            adminTab === 'subscriptions'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="fas fa-users"></i>
          <span>ইউজার ভিআইপি লিস্ট ({subscriptions.length})</span>
        </button>
      </div>

      {/* TAB: WITHDRAWAL METHODS & LOGOS */}
      {adminTab === 'methods' && (
        <AdminWithdrawalMethodsManager showToast={showToast} haptic={haptic} />
      )}

      {/* TAB 1: WITHDRAWALS MANAGEMENT */}
      {adminTab === 'withdrawals' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-500/20">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">অপেক্ষমাণ রিকোয়েস্ট</span>
              <div className="text-xl font-black text-amber-300 font-mono mt-0.5">
                {pendingList.length} <span className="text-xs text-slate-400 font-normal">টি (৳{totalPendingAmt})</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">পেমেন্ট সম্পন্ন</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {approvedList.length} <span className="text-xs text-slate-400 font-normal">টি (৳{totalApprovedAmt})</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-red-500/20">
              <span className="text-[10px] font-bold text-red-400 uppercase block">বাতিল / রিফান্ডেড</span>
              <div className="text-xl font-black text-red-400 font-mono mt-0.5">
                {rejectedList.length} <span className="text-xs text-slate-400 font-normal">টি</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">সর্বমোট আবেদন</span>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {withdrawals.length} <span className="text-xs text-slate-400 font-normal">টি</span>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-2xl border border-white/10">
            <div className="flex gap-1">
              {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    haptic('light');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterStatus === st
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {st === 'Pending' ? 'অপেক্ষমাণ ⏳' : st === 'Approved' ? 'সম্পন্ন ✅' : st === 'Rejected' ? 'বাতিল ❌' : 'সকল'}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <input
                type="text"
                className="input-modern pl-9 py-1.5 text-xs w-full"
                placeholder="নাম্বার, ইউজার বা TrxID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-2.5 text-slate-500 text-xs"></i>
            </div>
          </div>

          {/* Withdrawal List Cards */}
          {filteredWithdrawals.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400 text-xs">
              কোনো উত্তোলন রিকোয়েস্ট পাওয়া যায়নি!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((w) => {
                const isLoadingThis = actionLoadingId === w.id;

                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-amber-500/30 transition shadow-lg space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md overflow-hidden p-1 ${
                            w.method === 'bKash'
                              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                              : w.method === 'Nagad'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          }`}
                        >
                          {w.methodLogoUrl ? (
                            <img
                              src={w.methodLogoUrl}
                              alt={w.method}
                              className="w-full h-full object-contain filter drop-shadow"
                            />
                          ) : (
                            <span>{w.method === 'bKash' ? 'bK' : w.method === 'Nagad' ? 'NG' : 'RK'}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-white">{w.userName || 'User'}</h4>
                            <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                              UID: {w.uid ? w.uid.slice(0, 10) : 'N/A'}...
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-black text-amber-300 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                              <span>{w.method} ({w.accountType}) :</span>
                              <span className="text-white">{w.accountNumber}</span>
                            </span>

                            {/* 1-click Copy Button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(w.accountNumber);
                                showToast(`নাম্বার কপি হয়েছে: ${w.accountNumber}`, 'success');
                                haptic('light');
                              }}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/10 flex items-center gap-1"
                              title="নাম্বার কপি করুন"
                            >
                              <i className="fas fa-copy"></i>
                              <span>কপি</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Amount & Status */}
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">রিকোয়েস্ট: ৳{w.amount.toFixed(2)}</div>
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          সেন্ড মানি: ৳{(w.finalReceiveAmount !== undefined ? w.finalReceiveAmount : (w.amount * 0.95)).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-amber-300 font-bold">
                          (৫% চার্জ কর্তিত: -৳{(w.chargeAmount !== undefined ? w.chargeAmount : (w.amount * 0.05)).toFixed(2)})
                        </div>
                        <span
                          className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase mt-1 ${
                            w.status === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : w.status === 'Rejected'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          }`}
                        >
                          {w.status === 'Approved' ? 'পেমেন্ট সম্পন্ন ✅' : w.status === 'Rejected' ? 'বাতিল ও রিফান্ডেড ❌' : 'অপেক্ষমাণ ⏳'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(w.createdAt).toLocaleString('bn-BD')}
                        </div>
                      </div>
                    </div>

                    {/* Admin Note / Trx Info if exists */}
                    {(w.trxId || w.adminNote) && (
                      <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 text-xs flex flex-wrap items-center justify-between text-slate-300">
                        {w.trxId && (
                          <span className="font-mono text-[11px]">
                            <strong className="text-amber-400">TrxID:</strong> {w.trxId}
                          </span>
                        )}
                        {w.adminNote && (
                          <span className="text-[11px] text-slate-400">
                            <strong className="text-slate-300">নোট:</strong> {w.adminNote}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pending Action Buttons: APPROVE & REJECT */}
                    {w.status === 'Pending' && (
                      <div className="flex gap-2 pt-1 border-t border-white/5">
                        <button
                          onClick={() => {
                            setApprovingWithdrawal(w);
                            setApproveTrxId('');
                            setApproveAdminNote('');
                            haptic('light');
                          }}
                          disabled={isLoadingThis}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <i className="fas fa-check-circle"></i>
                          <span>পেমেন্ট অ্যাপ্রুভ করুন (Approve)</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectingWithdrawal(w);
                            setRejectReason('তথ্য ভুল অথবা একাউন্টে সমস্যা রয়েছে');
                            haptic('light');
                          }}
                          disabled={isLoadingThis}
                          className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <i className="fas fa-times-circle"></i>
                          <span>বাতিল ও রিফান্ড</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VIP PACKAGES SETTINGS */}
      {adminTab === 'packages' && (
        <div className="space-y-4">
          {/* VIP HUB MAIN PROMOTIONAL HEADER BANNER (ডাইরেক্ট ব্যানার আপলোড) */}
          <div className="glass-card p-4 rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-base shadow">
                  <i className="fas fa-panorama"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <span>VIP পেজের প্রধান ব্যানার (VIP Hub Main Header Banner)</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                      PROMO BANNER
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    ইউজারদের VIP ড্যাশবোর্ডের উপরে আকর্ষণীয় বড় ব্যানার যুক্ত করুন
                  </p>
                </div>
              </div>

              {vipHubBannerUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setVipHubBannerUrl('');
                    haptic('light');
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
                >
                  <i className="fas fa-trash-can"></i>
                  <span>ব্যানার মুছে ফেলুন</span>
                </button>
              )}
            </div>

            {/* Live Banner Preview */}
            {vipHubBannerUrl ? (
              <div className="w-full h-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-amber-500/40 relative shadow-2xl group">
                <img src={vipHubBannerUrl} alt="VIP Hub Banner Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-3">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30">
                    <i className="fas fa-check-circle text-emerald-400"></i> লাইভ ব্যানার প্রিভিউ
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono bg-black/70 px-2 py-0.5 rounded">
                    3:1 Aspect Ratio
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full py-6 rounded-2xl border-2 border-dashed border-amber-500/25 bg-black/30 flex flex-col items-center justify-center text-center p-4">
                <i className="fas fa-image text-amber-400/60 text-2xl mb-1.5"></i>
                <span className="text-xs font-bold text-slate-300">কোনো প্রধান ব্যানার সেট করা নেই</span>
                <span className="text-[10px] text-slate-500 mt-0.5">নিচে সরাসরি ডিভাইস থেকে ব্যানার আপলোড করুন বা লিংক দিন</span>
              </div>
            )}

            {/* Banner Upload / Link Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg active:scale-95">
                <i className="fas fa-cloud-arrow-up"></i>
                <span>{isUploadingHubBanner ? 'আপলোড হচ্ছে...' : 'ডিভাইস থেকে সরাসরি ব্যানার আপলোড'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHubBannerUpload}
                  disabled={isUploadingHubBanner}
                  className="hidden"
                />
              </label>

              <div className="flex-1 min-w-[220px]">
                <input
                  type="url"
                  value={vipHubBannerUrl}
                  onChange={(e) => setVipHubBannerUrl(e.target.value)}
                  placeholder="অথবা অনলাইন ব্যানার লিংক পেস্ট করুন (https://...)"
                  className="input-modern py-1.5 text-xs w-full"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveHubBanner}
                disabled={isSavingHubBanner}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg active:scale-95 shrink-0"
              >
                <i className="fas fa-save"></i>
                <span>{isSavingHubBanner ? 'সেভ হচ্ছে...' : 'ব্যানার সেভ করুন 💾'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-white">VIP প্যাকেজ সমূহ ({packages.length})</h4>
              <p className="text-[11px] text-slate-400">প্রতিটি প্যাকেজে নিজস্ব লোগো ও ব্যানার যুক্ত করে আকর্ষণীয় করুন</p>
            </div>
            <button
              onClick={() => {
                setIsEditingPackage(true);
                setEditingPkgId(null);
                setPkgName('নতুন VIP প্যাকেজ');
                setPkgPrice('500');
                setPkgDailyPercent('10');
                setPkgDuration('30');
                setPkgLogoUrl('');
                setPkgBannerUrl('');
                setPkgIcon('fa-crown');
                setPkgBadge('💎 10% Daily');
                setPkgDesc('');
                setPkgIsActive(true);
                haptic('light');
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow transition active:scale-95 flex items-center gap-1.5"
            >
              <i className="fas fa-plus"></i>
              <span>+ নতুন প্যাকেজ তৈরি</span>
            </button>
          </div>

          {/* Package Create / Edit Form */}
          {isEditingPackage && (
            <form onSubmit={handleSavePackage} className="glass-card p-4 rounded-3xl border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h5 className="font-extrabold text-xs text-amber-300 flex items-center gap-2">
                  <i className="fas fa-image text-amber-400"></i>
                  <span>{editingPkgId ? '✏️ প্যাকেজ, লোগো ও ব্যানার এডিট করুন' : '✨ নতুন VIP প্যাকেজ তৈরি (লোগো ও ব্যানার সহ)'}</span>
                </h5>
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  বাতিল
                </button>
              </div>

              {/* VIP Package Direct Banner Controls */}
              <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <i className="fas fa-panorama"></i>
                    <span>প্যাকেজ ব্যানার কভার (VIP Package Cover Banner)</span>
                  </label>
                  {pkgBannerUrl && (
                    <button
                      type="button"
                      onClick={() => setPkgBannerUrl('')}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      ব্যানার সরান ✕
                    </button>
                  )}
                </div>

                {/* Live Banner Preview */}
                {pkgBannerUrl && (
                  <div className="w-full h-24 rounded-2xl overflow-hidden border-2 border-amber-500/40 relative shadow-lg">
                    <img src={pkgBannerUrl} alt="Package Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] font-bold text-amber-300">প্যাকেজ ব্যানার প্রিভিউ</span>
                    </div>
                  </div>
                )}

                {/* Upload Banner from device or URL */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5">
                    <i className="fas fa-cloud-arrow-up"></i>
                    <span>{isUploadingBanner ? 'আপলোড হচ্ছে...' : 'ডিভাইস থেকে ব্যানার আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFileUpload}
                      disabled={isUploadingBanner}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-slate-400">বা অনলাইন ব্যানার লিংক:</span>
                </div>

                <input
                  type="url"
                  value={pkgBannerUrl}
                  onChange={(e) => setPkgBannerUrl(e.target.value)}
                  placeholder="https://example.com/package-banner.jpg"
                  className="input-modern py-1 text-xs w-full"
                />
              </div>

              {/* VIP Package Logo / Icon Controls */}
              <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <i className="fas fa-crown"></i>
                    <span>প্যাকেজ লোগো বা আইকন (VIP Package Logo)</span>
                  </label>
                  {pkgLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setPkgLogoUrl('')}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      লোগো সরান ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Live Logo Preview */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center overflow-hidden shadow-md shrink-0">
                    {pkgLogoUrl ? (
                      <img src={pkgLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <i className={`fas ${pkgIcon || 'fa-crown'} text-amber-400 text-2xl`}></i>
                    )}
                  </div>

                  {/* Upload from device */}
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5">
                        <i className="fas fa-upload"></i>
                        <span>{isUploadingLogo ? 'আপলোড হচ্ছে...' : 'ডিভাইস থেকে লোগো আপলোড'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">বা অনলাইন লিংক দিন</span>
                    </div>

                    {/* Image URL input */}
                    <input
                      type="url"
                      value={pkgLogoUrl}
                      onChange={(e) => setPkgLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="input-modern py-1 text-xs w-full"
                    />
                  </div>
                </div>

                {/* Preset Icon Selector */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    অথবা আইকন বেছে নিন (যদি নিজস্ব ছবি না থাকে):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { icon: 'fa-crown', label: '👑 ক্রাউন' },
                      { icon: 'fa-gem', label: '💎 ডায়মন্ড' },
                      { icon: 'fa-shield-halved', label: '🛡️ শিল্ড' },
                      { icon: 'fa-medal', label: '🥈 মেডেল' },
                      { icon: 'fa-award', label: '🥇 অ্যাওয়ার্ড' },
                      { icon: 'fa-bolt', label: '⚡ বোল্ট' },
                      { icon: 'fa-rocket', label: '🚀 রকেট' },
                      { icon: 'fa-sack-dollar', label: '💰 মানি' },
                      { icon: 'fa-star', label: '⭐ স্টার' },
                      { icon: 'fa-fire', label: '🔥 ফায়ার' }
                    ].map((item) => (
                      <button
                        key={item.icon}
                        type="button"
                        onClick={() => {
                          setPkgIcon(item.icon);
                          haptic('light');
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                          pkgIcon === item.icon && !pkgLogoUrl
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <i className={`fas ${item.icon}`}></i>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">প্যাকেজের নাম:</label>
                  <input
                    type="text"
                    required
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    placeholder="যেমন: VIP 1 - ব্রোঞ্জ"
                    className="input-modern py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">প্যাকেজ মূল্য (টাকা):</label>
                  <input
                    type="number"
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    placeholder="100, 200, 300..."
                    className="input-modern py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">দৈনিক লাভ (%):</label>
                  <input
                    type="number"
                    required
                    value={pkgDailyPercent}
                    onChange={(e) => setPkgDailyPercent(e.target.value)}
                    placeholder="10"
                    className="input-modern py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">মেয়াদ (দিন):</label>
                  <input
                    type="number"
                    required
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    placeholder="30"
                    className="input-modern py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">ব্যাজ টেক্সট:</label>
                  <input
                    type="text"
                    value={pkgBadge}
                    onChange={(e) => setPkgBadge(e.target.value)}
                    placeholder="HOT / Popular / 10% Daily"
                    className="input-modern py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">স্ট্যাটাস:</label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="pkgActiveCheck"
                      checked={pkgIsActive}
                      onChange={(e) => setPkgIsActive(e.target.checked)}
                      className="rounded accent-amber-500 w-4 h-4"
                    />
                    <label htmlFor="pkgActiveCheck" className="text-xs text-white font-bold cursor-pointer">
                      সক্রিয় রাখুন (Active)
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1 text-xs">বিবরণ (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  placeholder="প্যাকেজের সংক্ষিপ্ত বিবরণ..."
                  className="input-modern py-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingPkg}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow"
                >
                  {isSavingPkg ? 'সেভ হচ্ছে...' : 'প্যাকেজ সেভ করুন'}
                </button>
              </div>
            </form>
          )}

          {/* Packages List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((pkg) => {
              const dailyAmt = (pkg.price * (pkg.dailyReturnPercent || 10)) / 100;
              const totalAmt = dailyAmt * (pkg.durationDays || 30);

              return (
                <div
                  key={pkg.id}
                  className="rounded-3xl bg-slate-900/90 border border-white/10 hover:border-amber-500/30 transition shadow-lg overflow-hidden flex flex-col justify-between"
                >
                  {/* Package Top Cover Banner (if set) */}
                  {pkg.bannerUrl && (
                    <div className="w-full h-24 relative overflow-hidden border-b border-amber-500/25 bg-black">
                      <img src={pkg.bannerUrl} alt={pkg.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                      <span className="absolute top-2 right-2 text-[9px] font-black bg-black/70 backdrop-blur-md text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        🖼️ ব্যানার যুক্ত
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Logo / Icon Display */}
                          <div className={`w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner ${pkg.bannerUrl ? '-mt-7 ring-2 ring-slate-900 bg-slate-900' : ''}`}>
                            {pkg.logoUrl ? (
                              <img src={pkg.logoUrl} alt={pkg.name} className="w-full h-full object-cover" />
                            ) : (
                              <i className={`fas ${pkg.icon || 'fa-crown'} text-amber-400 text-xl`}></i>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {pkg.badge || `${pkg.dailyReturnPercent || 10}% Daily`}
                            </span>
                            <h4 className="text-base font-black text-white mt-1">{pkg.name}</h4>
                            <p className="text-[11px] text-slate-400">{pkg.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-white font-mono">৳{pkg.price}</div>
                          <span className="text-[10px] text-slate-400 font-bold block">{pkg.durationDays || 30} দিন</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 text-xs space-y-1 mt-3">
                        <div className="flex justify-between text-slate-300">
                          <span>দৈনিক লাভ ({pkg.dailyReturnPercent || 10}%):</span>
                          <span className="font-mono font-black text-emerald-400">+৳{dailyAmt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>মোট রিটার্ন ({pkg.durationDays || 30} দিন):</span>
                          <span className="font-mono font-black text-amber-400">৳{totalAmt.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Subscriber Count Display */}
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-users text-emerald-400 text-xs"></i>
                          <span className="text-[11px] font-bold text-white">গ্রাহক সংখ্যা:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-emerald-400 font-black">
                            {subscriptions.filter(s => s.packageId === pkg.id || s.packagePrice === pkg.price).length} জন
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({subscriptions.filter(s => (s.packageId === pkg.id || s.packagePrice === pkg.price) && s.status === 'Active').length} সক্রিয়)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-3">
                      <button
                        onClick={() => {
                          setEditingPkgId(pkg.id);
                          setPkgName(pkg.name);
                          setPkgPrice(pkg.price.toString());
                          setPkgDailyPercent((pkg.dailyReturnPercent || 10).toString());
                          setPkgDuration((pkg.durationDays || 30).toString());
                          setPkgLogoUrl(pkg.logoUrl || '');
                          setPkgBannerUrl(pkg.bannerUrl || '');
                          setPkgIcon(pkg.icon || 'fa-crown');
                          setPkgBadge(pkg.badge || '');
                          setPkgDesc(pkg.description || '');
                          setPkgIsActive(pkg.isActive !== false);
                          setIsEditingPackage(true);
                          haptic('light');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <i className="fas fa-edit"></i>
                        <span>এডিট (লোগো ও ব্যানার)</span>
                      </button>

                      <button
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                        className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: USER SUBSCRIPTIONS */}
      {adminTab === 'subscriptions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white">সকল ইউজার ভিআইপি সাবস্ক্রিপশন ({subscriptions.length})</h4>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400 text-xs">
              এখনও কোনো ইউজার ভিআইপি প্যাকেজ কেনেনি।
            </div>
          ) : (
            <div className="space-y-2.5">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/30">
                      <i className="fas fa-crown"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-black text-xs text-white">{sub.packageName}</h5>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.2 rounded-full border ${
                            sub.status === 'Completed'
                              ? 'bg-slate-800 text-slate-400 border-white/10'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ইউজার: <strong className="text-white">{sub.userName || 'User'}</strong> • UID: {sub.uid ? sub.uid.slice(0, 8) : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        কেনা হয়েছে: {new Date(sub.purchasedAt).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-300 font-bold">
                      ক্লেইম: <span className="text-emerald-400 font-mono font-black">{sub.daysClaimed || 0} / {sub.durationDays || 30} দিন</span>
                    </div>
                    <div className="text-xs text-amber-300 font-mono font-extrabold mt-0.5">
                      মোট লাভ: ৳{(sub.totalEarned || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      দৈনিক ১০%: ৳{(sub.dailyReturnAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve Modal */}
      {approvingWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-400"></i>
              <span>উত্তোলন অ্যাপ্রুভ করুন</span>
            </h3>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">প্রাপক:</span>
                <span className="font-bold text-white">{approvingWithdrawal.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">মেথড:</span>
                <span className="font-bold text-white">{approvingWithdrawal.method} ({approvingWithdrawal.accountType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">নাম্বার:</span>
                <span className="font-mono font-black text-amber-400">{approvingWithdrawal.accountNumber}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400">উত্তোলনের পরিমাণ:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">৳{approvingWithdrawal.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">ট্রানজেকশন আইডি (TrxID):</label>
                <input
                  type="text"
                  placeholder="যেমন: 9J4K2L8M (ঐচ্ছিক)"
                  value={approveTrxId}
                  onChange={(e) => setApproveTrxId(e.target.value)}
                  className="input-modern py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">অ্যাডমিন নোট:</label>
                <input
                  type="text"
                  placeholder="Payment Successful"
                  value={approveAdminNote}
                  onChange={(e) => setApproveAdminNote(e.target.value)}
                  className="input-modern py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApprovingWithdrawal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={handleApproveConfirm}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow transition"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <i className="fas fa-triangle-exclamation text-red-400"></i>
              <span>উত্তোলন বাতিল ও রিফান্ড</span>
            </h3>

            <p className="text-xs text-slate-300">
              বাতিল করলে ৳{rejectingWithdrawal.amount.toFixed(2)} টাকা সাথে সাথে ইউজারের ব্যালেন্সে ফেরত দেওয়া হবে।
            </p>

            <div>
              <label className="text-slate-300 font-bold block mb-1 text-xs">বাতিলের কারণ:</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="বাতিলের কারণ লিখুন..."
                className="input-modern py-1.5 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectingWithdrawal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                ফিরে যান
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow transition"
              >
                বাতিল ও রিফান্ড করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
