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

  // VIP Buyers Count Live Controls State
  const [pkgBuyersCount, setPkgBuyersCount] = useState('0');
  const [updatingBuyersPkgId, setUpdatingBuyersPkgId] = useState<string | null>(null);
  const [buyersCountInputMap, setBuyersCountInputMap] = useState<Record<string, string>>({});

  // VIP Hub General Header Banner state
  const [vipHubBannerUrl, setVipHubBannerUrl] = useState('');
  const [isUploadingHubBanner, setIsUploadingHubBanner] = useState(false);
  const [isSavingHubBanner, setIsSavingHubBanner] = useState(false);

  // VIP Module Master On / Off Switch State
  const [isVipEnabled, setIsVipEnabled] = useState(true);
  const [isTogglingVip, setIsTogglingVip] = useState(false);

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
  const [subFilterStatus, setSubFilterStatus] = useState<'All' | 'Active' | 'Cancelled' | 'Completed'>('All');
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [cancellingSub, setCancellingSub] = useState<UserVIPSubscription | null>(null);
  const [cancelRefundAmount, setCancelRefundAmount] = useState('0');
  const [isRefunding, setIsRefunding] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState('অ্যাডমিন কর্তৃক ভিআইপি ক্যানসেল করা হয়েছে');
  const [isProcessingSubAction, setIsProcessingSubAction] = useState(false);

  // VIP Duration & Days Adjustment State
  const [editingDurationSub, setEditingDurationSub] = useState<UserVIPSubscription | null>(null);
  const [modalDurationDays, setModalDurationDays] = useState<string>('30');
  const [modalDaysClaimed, setModalDaysClaimed] = useState<string>('0');
  const [isSavingDuration, setIsSavingDuration] = useState(false);

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

  // 4. Listen to VIP Hub general settings (Hub Banner & Master On/Off)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'vip_settings', 'general'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setVipHubBannerUrl(data.hubBannerUrl || '');
            setIsVipEnabled(data.isVipEnabled !== false);
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

  // Master Toggle VIP Module (On / Off for users)
  const handleToggleVipModule = async () => {
    const newStatus = !isVipEnabled;
    setIsTogglingVip(true);
    haptic('heavy');
    try {
      await setDoc(
        doc(db, 'vip_settings', 'general'),
        {
          isVipEnabled: newStatus,
          vipStatusUpdatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      showToast(
        newStatus
          ? '🎉 VIP অপশন সফলভাবে চালু করা হয়েছে! এখন ইউজার প্যানেলে VIP অপশন প্রদর্শিত হবে।'
          : '🔒 VIP অপশন সফলভাবে বন্ধ করা হয়েছে! এখন ইউজার প্যানেলে কোনো VIP অপশন প্রদর্শিত হবে না।',
        newStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      console.error(err);
      showToast('VIP স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsTogglingVip(false);
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

  // Live adjust buyers count for a package (+ / -)
  const handleAdjustBuyersCount = async (pkg: VIPPackage, delta: number) => {
    const currentCount = typeof pkg.buyersCount === 'number' ? pkg.buyersCount : (pkg.baseBuyersCount || 0);
    const newCount = Math.max(0, currentCount + delta);
    haptic('light');
    try {
      setUpdatingBuyersPkgId(pkg.id);
      await setDoc(doc(db, 'vip_packages', pkg.id), { ...pkg, buyersCount: newCount }, { merge: true });
      showToast(`✅ ${pkg.name} ক্রেতা সংখ্যা লাইভ আপডেট হয়েছে: ${newCount} জন`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('ক্রেতা সংখ্যা আপডেট করতে সমস্যা: ' + err.message, 'error');
    } finally {
      setUpdatingBuyersPkgId(null);
    }
  };

  const handleSetExactBuyersCount = async (pkg: VIPPackage, exactCount: number) => {
    const newCount = Math.max(0, exactCount);
    haptic('light');
    try {
      setUpdatingBuyersPkgId(pkg.id);
      await setDoc(doc(db, 'vip_packages', pkg.id), { ...pkg, buyersCount: newCount }, { merge: true });
      showToast(`✅ ${pkg.name} ক্রেতা সংখ্যা লাইভ সেট হয়েছে: ${newCount} জন`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('সেট করতে সমস্যা: ' + err.message, 'error');
    } finally {
      setUpdatingBuyersPkgId(null);
    }
  };

  // Save / Update VIP Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(pkgPrice);
    const returnNum = parseFloat(pkgDailyPercent) || 10;
    const durationNum = parseInt(pkgDuration, 10) || 30;
    const buyersCountNum = Math.max(0, parseInt(pkgBuyersCount, 10) || 0);

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
        colorTheme: priceNum <= 100 ? 'amber' : priceNum <= 200 ? 'blue' : priceNum <= 300 ? 'purple' : 'rose',
        buyersCount: buyersCountNum,
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
      setPkgBuyersCount('0');
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

  // Filtered subscriptions
  const filteredSubscriptions = subscriptions.filter((s) => {
    if (subFilterStatus !== 'All' && s.status !== subFilterStatus) return false;
    if (subSearchQuery.trim()) {
      const q = subSearchQuery.toLowerCase().trim();
      const matchName = (s.userName || '').toLowerCase().includes(q);
      const matchUid = (s.uid || '').toLowerCase().includes(q);
      const matchPkg = (s.packageName || '').toLowerCase().includes(q);
      const matchEmail = (s.userEmail || '').toLowerCase().includes(q);
      return matchName || matchUid || matchPkg || matchEmail;
    }
    return true;
  });

  // Cancel VIP Subscription handler
  const handleConfirmCancelSub = async () => {
    if (!cancellingSub) return;
    setIsProcessingSubAction(true);
    haptic('heavy');
    try {
      const refundNum = isRefunding ? parseFloat(cancelRefundAmount) || 0 : 0;

      // 1. Update subscription in Firestore
      await updateDoc(doc(db, 'vip_subscriptions', cancellingSub.id), {
        status: 'Cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledByAdmin: true,
        cancelReason: cancelReasonText.trim() || 'অ্যাডমিন কর্তৃক বাতিল',
        refundAmount: refundNum
      });

      // 2. Refund balance if specified
      if (refundNum > 0 && cancellingSub.uid) {
        const uRef = doc(db, 'users', cancellingSub.uid);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const currentBal = uSnap.data().balance || 0;
          await updateDoc(uRef, { balance: currentBal + refundNum });
        }
      }

      // 3. Update User document VIP status if no other active VIP subscription
      if (cancellingSub.uid) {
        const otherActive = subscriptions.filter(
          (s) => s.uid === cancellingSub.uid && s.id !== cancellingSub.id && s.status === 'Active'
        );
        const uRef = doc(db, 'users', cancellingSub.uid);
        if (otherActive.length === 0) {
          await updateDoc(uRef, {
            isVip: false,
            vipPackageName: '',
            vipBadge: '',
            vipCancelledAt: new Date().toISOString()
          });
        } else {
          await updateDoc(uRef, {
            isVip: true,
            vipPackageName: otherActive[0].packageName,
            vipBadge: 'VIP MEMBER'
          });
        }
      }

      showToast(
        `✅ ইউজার "${cancellingSub.userName || cancellingSub.uid}"-এর VIP বাতিল করা হয়েছে${refundNum > 0 ? ` (৳${refundNum} রিফান্ড সহ)` : ''}!`,
        'success'
      );
      setCancellingSub(null);
    } catch (err: any) {
      console.error('Cancel VIP error:', err);
      showToast('ভিআইপি বাতিল ব্যর্থ: ' + err.message, 'error');
    } finally {
      setIsProcessingSubAction(false);
    }
  };

  // Reactivate / Restore Cancelled VIP Subscription
  const handleReactivateSub = async (sub: UserVIPSubscription) => {
    if (!window.confirm(`আপনি কি "${sub.userName || sub.uid}"-এর "${sub.packageName}" ভিআইপি মেম্বারশিপ পুনরায় সক্রিয় (চালু) করতে চান?`)) {
      return;
    }
    setIsProcessingSubAction(true);
    haptic('success');
    try {
      // 1. Update subscription status to Active
      await updateDoc(doc(db, 'vip_subscriptions', sub.id), {
        status: 'Active',
        reactivatedAt: new Date().toISOString(),
        lastAutoCreditTimestamp: Date.now()
      });

      // 2. Update user doc
      if (sub.uid) {
        const uRef = doc(db, 'users', sub.uid);
        await updateDoc(uRef, {
          isVip: true,
          vipPackageName: sub.packageName,
          vipBadge: 'VIP MEMBER',
          vipReactivatedAt: new Date().toISOString()
        });
      }

      showToast(`🎉 ইউজার "${sub.userName || sub.uid}"-এর ভিআইপি মেম্বারশিপ পুনরায় সক্রিয় করা হয়েছে!`, 'success');
    } catch (err: any) {
      console.error('Reactivate VIP error:', err);
      showToast('ভিআইপি পুনরায় চালু করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsProcessingSubAction(false);
    }
  };

  // Quick direct adjust duration (+ / - days)
  const handleQuickAdjustDuration = async (sub: UserVIPSubscription, deltaDays: number) => {
    const currentDuration = sub.durationDays || 30;
    const newDuration = Math.max(1, currentDuration + deltaDays);
    const claimed = sub.daysClaimed || 0;
    const newStatus = claimed < newDuration ? 'Active' : 'Completed';
    haptic('light');
    try {
      await updateDoc(doc(db, 'vip_subscriptions', sub.id), {
        durationDays: newDuration,
        status: sub.status === 'Cancelled' ? 'Cancelled' : newStatus,
        durationUpdatedAt: new Date().toISOString()
      });
      if (newStatus === 'Active' && sub.status !== 'Cancelled' && sub.uid) {
        await updateDoc(doc(db, 'users', sub.uid), {
          isVip: true,
          vipPackageName: sub.packageName,
          vipBadge: 'VIP MEMBER'
        });
      }
      const monthsStr = (newDuration / 30).toFixed(1);
      const isMonthExact = Math.abs(deltaDays) % 30 === 0 && Math.abs(deltaDays) >= 30;
      const changeText = isMonthExact
        ? `${deltaDays > 0 ? `+${deltaDays / 30}` : `${deltaDays / 30}`} মাস (${deltaDays > 0 ? `+${deltaDays}` : deltaDays} দিন)`
        : `${deltaDays > 0 ? `+${deltaDays}` : deltaDays} দিন`;
      showToast(
        `✅ "${sub.userName || 'User'}"-এর মেয়াদ ${changeText} করা হয়েছে (মোট: ${newDuration} দিন / ${monthsStr} মাস)!`,
        'success'
      );
    } catch (err: any) {
      console.error('Quick adjust duration error:', err);
      showToast('মেয়াদ পরিবর্তন করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  // Quick direct adjust completed / claimed days (+ / - days, reset to 0, mark complete)
  const handleQuickAdjustClaimedDays = async (
    sub: UserVIPSubscription,
    deltaOrAction: number | 'reset' | 'complete'
  ) => {
    const currentClaimed = sub.daysClaimed || 0;
    const duration = sub.durationDays || 30;
    let newClaimed = 0;

    if (deltaOrAction === 'reset') {
      newClaimed = 0;
    } else if (deltaOrAction === 'complete') {
      newClaimed = duration;
    } else {
      newClaimed = Math.max(0, Math.min(duration, currentClaimed + deltaOrAction));
    }

    const newStatus =
      sub.status === 'Cancelled'
        ? 'Cancelled'
        : newClaimed < duration
        ? 'Active'
        : 'Completed';

    haptic('light');
    try {
      await updateDoc(doc(db, 'vip_subscriptions', sub.id), {
        daysClaimed: newClaimed,
        status: newStatus,
        claimedUpdatedAt: new Date().toISOString()
      });

      if (newStatus === 'Active' && sub.status !== 'Cancelled' && sub.uid) {
        await updateDoc(doc(db, 'users', sub.uid), {
          isVip: true,
          vipPackageName: sub.packageName,
          vipBadge: 'VIP MEMBER'
        });
      } else if (newStatus === 'Completed' && sub.uid) {
        await updateDoc(doc(db, 'users', sub.uid), {
          isVip: false
        });
      }

      let actionText = '';
      if (deltaOrAction === 'reset') {
        actionText = 'কমপ্লিট দিন রিসেট করে ০ দিন করা হয়েছে (নতুন করে শুরু)';
      } else if (deltaOrAction === 'complete') {
        actionText = `সম্পূর্ণ ${duration} দিন কমপ্লিট হিসেবে সেট করা হয়েছে (প্যাকেজ সমাপ্ত)`;
      } else {
        const sign = deltaOrAction > 0 ? `+${deltaOrAction}` : `${deltaOrAction}`;
        actionText = `কমপ্লিট দিন ${sign} দিন পরিবর্তন করা হয়েছে (মোট সম্পন্ন: ${newClaimed}/${duration} দিন, বাকি: ${duration - newClaimed} দিন)`;
      }

      showToast(
        `✅ "${sub.userName || 'User'}"-এর ${actionText}!`,
        'success'
      );
    } catch (err: any) {
      console.error('Quick adjust claimed error:', err);
      showToast('কমপ্লিট দিন পরিবর্তন করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  // Full Save from Duration Modal
  const handleSaveDurationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDurationSub) return;
    const newDuration = Math.max(1, parseInt(modalDurationDays, 10) || 30);
    const newClaimed = Math.max(0, parseInt(modalDaysClaimed, 10) || 0);
    const newStatus =
      editingDurationSub.status === 'Cancelled'
        ? 'Cancelled'
        : newClaimed < newDuration
        ? 'Active'
        : 'Completed';

    setIsSavingDuration(true);
    haptic('success');
    try {
      await updateDoc(doc(db, 'vip_subscriptions', editingDurationSub.id), {
        durationDays: newDuration,
        daysClaimed: newClaimed,
        status: newStatus,
        durationUpdatedAt: new Date().toISOString()
      });

      if (newStatus === 'Active' && editingDurationSub.uid) {
        await updateDoc(doc(db, 'users', editingDurationSub.uid), {
          isVip: true,
          vipPackageName: editingDurationSub.packageName,
          vipBadge: 'VIP MEMBER'
        });
      }

      showToast(
        `🎉 "${editingDurationSub.userName || 'User'}"-এর VIP মোট মেয়াদ ${newDuration} দিন (${(newDuration / 30).toFixed(1)} মাস) ও সম্পন্ন ${newClaimed} দিন সফলভাবে সেট করা হয়েছে!`,
        'success'
      );
      setEditingDurationSub(null);
    } catch (err: any) {
      console.error('Save duration error:', err);
      showToast('মেয়াদ সংরক্ষণ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSavingDuration(false);
    }
  };

  // Delete subscription permanently
  const handleDeleteSub = async (sub: UserVIPSubscription) => {
    if (!window.confirm(`আপনি কি "${sub.userName || sub.uid}"-এর এই ভিআইপি রেকর্ডটি ডিলিট করতে চান?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'vip_subscriptions', sub.id));
      if (sub.uid) {
        const otherActive = subscriptions.filter(
          (s) => s.uid === sub.uid && s.id !== sub.id && s.status === 'Active'
        );
        if (otherActive.length === 0) {
          const uRef = doc(db, 'users', sub.uid);
          await updateDoc(uRef, {
            isVip: false,
            vipPackageName: '',
            vipBadge: ''
          });
        }
      }
      showToast('ভিআইপি রেকর্ড ডিলিট করা হয়েছে!', 'info');
      haptic('light');
    } catch (err: any) {
      showToast('ডিলিট এরর: ' + err.message, 'error');
    }
  };

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
                  <label className="font-bold text-slate-300 block mb-1 flex items-center justify-between">
                    <span>মেয়াদ (দিন ও মাস):</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      = {((parseInt(pkgDuration, 10) || 0) / 30).toFixed(1)} মাস
                    </span>
                  </label>
                  <input
                    type="number"
                    required
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    placeholder="30"
                    className="input-modern py-1.5 text-xs font-mono"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { label: '১৫ দিন', val: '15' },
                      { label: '১ মাস (৩০ দিন)', val: '30' },
                      { label: '২ মাস (৬০ দিন)', val: '60' },
                      { label: '৩ মাস (৯০ দিন)', val: '90' },
                      { label: '৬ মাস (১৮০ দিন)', val: '180' },
                      { label: '১ বছর (৩৬৫ দিন)', val: '365' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setPkgDuration(item.val);
                          haptic('light');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                          pkgDuration === item.val
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
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
                  <label className="font-bold text-amber-300 block mb-1 flex items-center justify-between">
                    <span>কত জন কিনেছে (Buyers Count):</span>
                    <span className="text-[10px] text-emerald-400 font-bold">⚡ লাইভ আপডেট</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pkgBuyersCount}
                    onChange={(e) => setPkgBuyersCount(e.target.value)}
                    placeholder="42, 78, 100..."
                    className="input-modern py-1.5 text-xs font-mono border-amber-500/40"
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

          {/* Master VIP Feature ON / OFF Switch Card */}
          <div className={`p-4 rounded-3xl border transition-all shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isVipEnabled
              ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/40 border-emerald-500/40'
              : 'bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-950 border-red-500/40'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg border transition-all ${
                isVipEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
                <i className={`fas ${isVipEnabled ? 'fa-crown animate-pulse' : 'fa-ban'}`}></i>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white">VIP সিস্টেম মাস্টার কন্ট্রোল (ON / OFF)</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border flex items-center gap-1.5 ${
                    isVipEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isVipEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                    <span>{isVipEnabled ? 'বর্তমানে চালু (ACTIVE)' : 'বর্তমানে বন্ধ (DISABLED)'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 max-w-xl">
                  {isVipEnabled
                    ? '✅ VIP ফিচার চালু আছে। ইউজাররা তাদের প্যানেল থেকে VIP প্যাকেজ দেখতে ও কিনতে পারবেন।'
                    : '🚫 VIP ফিচার বন্ধ আছে। ইউজার প্যানেলের বটম বার, মেনু, প্রোফাইল ও সব জায়গা থেকে VIP অপশন সম্পূর্ণ লুকিয়ে রাখা হয়েছে।'}
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={handleToggleVipModule}
              disabled={isTogglingVip}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 active:scale-95 shadow-lg cursor-pointer ${
                isVipEnabled
                  ? 'bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/50 hover:border-red-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isTogglingVip ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className={`fas ${isVipEnabled ? 'fa-toggle-on text-base' : 'fa-toggle-off text-base'}`}></i>
              )}
              <span>{isVipEnabled ? 'VIP বন্ধ করুন (Turn OFF)' : 'VIP চালু করুন (Turn ON)'}</span>
            </button>
          </div>

          {/* Live Buyers Controller Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow">
                <i className="fas fa-users-gear"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <span>VIP কত জন কিনেছে (Buyers Count Live Controller)</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    লাইভ আপডেট সক্রিয়
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  যেকোনো প্যাকেজের ক্রেতা সংখ্যা বাড়ানো বা কমানো যাবে এবং এটি ইউজারদের স্ক্রিনে রিয়েলটাইমে আপডেট হবে।
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">মোট ভিআইপি ক্রেতা সংখ্যা</span>
              <span className="text-base font-black text-amber-300 font-mono">
                {packages.reduce((sum, p) => sum + (typeof p.buyersCount === 'number' ? p.buyersCount : (p.baseBuyersCount || 0)), 0)} জন
              </span>
            </div>
          </div>

          {/* Packages List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((pkg) => {
              const dailyAmt = (pkg.price * (pkg.dailyReturnPercent || 10)) / 100;
              const totalAmt = dailyAmt * (pkg.durationDays || 30);
              const effectiveBuyersCount = typeof pkg.buyersCount === 'number' ? pkg.buyersCount : (pkg.baseBuyersCount || 0);

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

                      {/* VIP Buyers Count Live Controller Card (বাড়ানো ও কমানো) */}
                      <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-black text-amber-300">কত জন কিনেছে (Buyers):</span>
                          </div>
                          <span className="text-sm font-black font-mono text-emerald-400">
                            {effectiveBuyersCount} জন
                          </span>
                        </div>

                        {/* Quick Increase / Decrease Buttons */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={updatingBuyersPkgId === pkg.id}
                              onClick={() => handleAdjustBuyersCount(pkg, -10)}
                              className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-[10px] font-bold active:scale-95 transition"
                              title="১০ জন কমান"
                            >
                              -১০
                            </button>
                            <button
                              type="button"
                              disabled={updatingBuyersPkgId === pkg.id}
                              onClick={() => handleAdjustBuyersCount(pkg, -1)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-black active:scale-95 transition flex items-center gap-1"
                              title="১ জন কমান"
                            >
                              <i className="fas fa-minus text-[9px]"></i> ১
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={updatingBuyersPkgId === pkg.id}
                              onClick={() => handleAdjustBuyersCount(pkg, 1)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-black active:scale-95 transition flex items-center gap-1"
                              title="১ জন বাড়ান"
                            >
                              <i className="fas fa-plus text-[9px]"></i> ১
                            </button>
                            <button
                              type="button"
                              disabled={updatingBuyersPkgId === pkg.id}
                              onClick={() => handleAdjustBuyersCount(pkg, 5)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[10px] font-bold active:scale-95 transition"
                              title="৫ জন বাড়ান"
                            >
                              +৫
                            </button>
                            <button
                              type="button"
                              disabled={updatingBuyersPkgId === pkg.id}
                              onClick={() => handleAdjustBuyersCount(pkg, 10)}
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold active:scale-95 transition"
                              title="১০ জন বাড়ান"
                            >
                              +১০
                            </button>
                          </div>
                        </div>

                        {/* Direct Numeric Input */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="number"
                            min={0}
                            placeholder="নির্দিষ্ট সংখ্যা লিখুন..."
                            value={buyersCountInputMap[pkg.id] ?? ''}
                            onChange={(e) => setBuyersCountInputMap({ ...buyersCountInputMap, [pkg.id]: e.target.value })}
                            className="input-modern py-1 px-2 text-xs font-mono flex-1 bg-black/60"
                          />
                          <button
                            type="button"
                            disabled={updatingBuyersPkgId === pkg.id || !buyersCountInputMap[pkg.id]}
                            onClick={() => {
                              const val = parseInt(buyersCountInputMap[pkg.id], 10);
                              if (!isNaN(val) && val >= 0) {
                                handleSetExactBuyersCount(pkg, val);
                                setBuyersCountInputMap({ ...buyersCountInputMap, [pkg.id]: '' });
                              }
                            }}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow transition active:scale-95"
                          >
                            সেট
                          </button>
                        </div>
                      </div>

                      {/* Subscriber Count Display */}
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-id-card-clip text-slate-400 text-xs"></i>
                          <span className="text-[11px] font-bold text-slate-300">ডাটাবেজ সাবস্ক্রিপশন:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-white font-black">
                            {subscriptions.filter(s => s.packageId === pkg.id || s.packagePrice === pkg.price).length} জন
                          </span>
                          <span className="text-[10px] text-emerald-400">
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
                          setPkgBuyersCount((typeof pkg.buyersCount === 'number' ? pkg.buyersCount : (pkg.baseBuyersCount || 0)).toString());
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
        <div className="space-y-4">
          {/* Header & Description */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-crown text-amber-400"></i>
                <span>ইউজার ভিআইপি মেম্বারশিপ তালিকা ({subscriptions.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                যেকোনো ইউজারের VIP মেম্বারশিপ সরাসরি ক্যানসেল (বাতিল) করুন অথবা পূর্বে বাতিল করা VIP পুনরায় চালু / সক্রিয় করুন
              </p>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">মোট মেম্বারশিপ</span>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {subscriptions.length} <span className="text-xs text-slate-400 font-normal">জন</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/30 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">সক্রিয় ভিআইপি (Active)</span>
              <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                {subscriptions.filter((s) => s.status === 'Active').length} <span className="text-xs text-slate-400 font-normal">জন</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-red-500/30 shadow-sm">
              <span className="text-[10px] font-bold text-red-400 uppercase block">ক্যানসেলড / বাতিল</span>
              <div className="text-lg font-black text-red-400 font-mono mt-0.5">
                {subscriptions.filter((s) => s.status === 'Cancelled').length} <span className="text-xs text-slate-400 font-normal">জন</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-500/30 shadow-sm">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">মোট প্যাকেজ ইনভেস্ট</span>
              <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                ৳{subscriptions.reduce((sum, s) => sum + (s.packagePrice || 0), 0).toFixed(0)}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                placeholder="ইউজারের নাম, UID অথবা প্যাকেজ দিয়ে সার্চ করুন..."
                className="input-modern text-xs pl-9 py-2"
              />
              <i className="fas fa-search absolute left-3 top-2.5 text-slate-500 text-xs"></i>
              {subSearchQuery && (
                <button
                  onClick={() => setSubSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 self-start sm:self-auto overflow-x-auto">
              {[
                { id: 'All', label: 'সকল', count: subscriptions.length },
                { id: 'Active', label: 'সক্রিয়', count: subscriptions.filter((s) => s.status === 'Active').length },
                { id: 'Cancelled', label: 'ক্যানসেলড', count: subscriptions.filter((s) => s.status === 'Cancelled').length },
                { id: 'Completed', label: 'সম্পন্ন', count: subscriptions.filter((s) => s.status === 'Completed').length }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSubFilterStatus(f.id as any);
                    haptic('light');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    subFilterStatus === f.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Subscription List */}
          {filteredSubscriptions.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400 text-xs">
              কোনো ভিআইপি সাবস্ক্রিপশন রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubscriptions.map((sub) => {
                const isCancelled = sub.status === 'Cancelled';
                const isActive = sub.status === 'Active';
                const isCompleted = sub.status === 'Completed';

                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-2xl border transition-all shadow-md ${
                      isCancelled
                        ? 'bg-red-950/20 border-red-500/30'
                        : isActive
                        ? 'bg-slate-900/90 border-emerald-500/30'
                        : 'bg-slate-900/60 border-white/10'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: User & Package info */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
                            isCancelled
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isActive
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-white/10'
                          }`}
                        >
                          <i className={`fas ${isCancelled ? 'fa-ban' : 'fa-crown'}`}></i>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-black text-sm text-white">{sub.packageName}</h5>
                            <span className="text-xs font-mono font-bold text-amber-400">৳{sub.packagePrice}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isCancelled
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : isActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-white/10'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCancelled ? 'bg-red-400' : isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                }`}
                              ></span>
                              <span>
                                {isCancelled ? 'ক্যানসেলড / বাতিল' : isActive ? 'সক্রিয় (Active)' : 'মেয়াদ শেষ (Completed)'}
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>
                              ইউজার: <strong className="text-white">{sub.userName || 'User'}</strong>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">UID: {sub.uid}</span>
                            {sub.userEmail && <span className="text-slate-500 text-[11px]">{sub.userEmail}</span>}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                            <span>কেনা হয়েছে: {new Date(sub.purchasedAt).toLocaleDateString('bn-BD')}</span>
                            {isCancelled && sub.cancelledAt && (
                              <span className="text-red-400 font-medium">
                                বাতিল: {new Date(sub.cancelledAt).toLocaleDateString('bn-BD')} ({sub.cancelReason || 'অ্যাডমিন কর্তৃক বাতিল'})
                              </span>
                            )}
                            {sub.reactivatedAt && (
                              <span className="text-emerald-400 font-medium">
                                পুনরায় সক্রিয়: {new Date(sub.reactivatedAt).toLocaleDateString('bn-BD')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Claim Progress, Duration, Remaining & Quick Adjust */}
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 text-xs flex-1 min-w-[280px]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-400 block font-bold">মোট মেয়াদ:</span>
                            <span className="text-amber-300 font-mono font-black text-xs">
                              {sub.durationDays || 30} দিন <span className="text-[10px] text-amber-400/80 font-normal">({((sub.durationDays || 30) / 30).toFixed(1)} মাস)</span>
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-400 block font-bold">ক্লেইম সম্পন্ন:</span>
                            <span className="text-emerald-400 font-mono font-black text-xs">
                              {sub.daysClaimed || 0} দিন
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-400 block font-bold">বাকি মেয়াদ:</span>
                            <span className="text-cyan-300 font-mono font-black text-xs">
                              {Math.max(0, (sub.durationDays || 30) - (sub.daysClaimed || 0))} দিন
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-400 block font-bold">মোট দেওয়া হয়েছে:</span>
                            <span className="text-white font-mono font-black text-xs">
                              ৳{(sub.totalEarned || 0).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Duration Adjust Buttons for Days and Months */}
                        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                          {/* Days Row */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
                              <i className="fas fa-calendar-day text-blue-400 text-[9px]"></i>
                              <span>দিন কমান/বাড়ান:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, -1)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                              title="১ দিন কমান"
                            >
                              -১ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, -7)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                              title="৭ দিন কমান"
                            >
                              -৭ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, -15)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                              title="১৫ দিন কমান"
                            >
                              -১৫ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 1)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                              title="১ দিন বাড়ান"
                            >
                              +১ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 7)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                              title="৭ দিন বাড়ান"
                            >
                              +৭ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 15)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                              title="১৫ দিন বাড়ান"
                            >
                              +১৫ দিন
                            </button>
                          </div>

                          {/* Months Row */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
                              <i className="fas fa-calendar-days text-amber-400 text-[9px]"></i>
                              <span>মাস কমান/বাড়ান:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, -30)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-black active:scale-95 transition"
                              title="১ মাস (৩০ দিন) কমান"
                            >
                              -১ মাস (-৩০ দিন)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, -60)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-black active:scale-95 transition"
                              title="২ মাস (৬০ দিন) কমান"
                            >
                              -২ মাস (-৬০ দিন)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 30)}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black active:scale-95 transition"
                              title="১ মাস (৩০ দিন) বাড়ান"
                            >
                              +১ মাস (+৩০ দিন)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 60)}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black active:scale-95 transition"
                              title="২ মাস (৬০ দিন) বাড়ান"
                            >
                              +২ মাস (+৬০ দিন)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(sub, 90)}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black active:scale-95 transition"
                              title="৩ মাস (৯০ দিন) বাড়ান"
                            >
                              +৩ মাস (+৯০ দিন)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDurationSub(sub);
                                setModalDurationDays((sub.durationDays || 30).toString());
                                setModalDaysClaimed((sub.daysClaimed || 0).toString());
                                haptic('light');
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-black active:scale-95 transition ml-auto flex items-center gap-1"
                            >
                              <i className="fas fa-calendar-check text-[9px]"></i>
                              <span>কাস্টম দিন/মাস এডিট</span>
                            </button>
                          </div>

                          {/* Completed/Claimed Days Row */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1.5 border-t border-white/5">
                            <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
                              <i className="fas fa-check-double text-emerald-400 text-[9px]"></i>
                              <span>কমপ্লিট দিন কমান/বাড়ান:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, 'reset')}
                              className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-black active:scale-95 transition"
                              title="কমপ্লিট দিন ০ দিন করুন (নতুন করে শুরু)"
                            >
                              🔄 ০ দিন (রিসেট)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, -1)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                              title="কমপ্লিট দিন ১ দিন কমান (বাকি ১ দিন বাড়বে)"
                            >
                              -১ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, -5)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                              title="কমপ্লিট দিন ৫ দিন কমান"
                            >
                              -৫ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, 1)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                              title="কমপ্লিট দিন ১ দিন বাড়ান"
                            >
                              +১ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, 5)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                              title="কমপ্লিট দিন ৫ দিন বাড়ান"
                            >
                              +৫ দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustClaimedDays(sub, 'complete')}
                              className="px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold active:scale-95 transition"
                              title="সব দিন সম্পন্ন হিসেবে মার্ক করুন (প্যাকেজ সমাপ্ত)"
                            >
                              ✓ সব সম্পন্ন
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: ACTION BUTTONS (Duration / Cancel VIP / Reactivate VIP) */}
                      <div className="flex items-center gap-2 self-end lg:self-center flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDurationSub(sub);
                            setModalDurationDays((sub.durationDays || 30).toString());
                            setModalDaysClaimed((sub.daysClaimed || 0).toString());
                            haptic('light');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-black transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                          title="মেয়াদ ও দিন পরিবর্তন করুন"
                        >
                          <i className="fas fa-calendar-check text-[11px]"></i>
                          <span>মেয়াদ নিয়ন্ত্রণ</span>
                        </button>

                        {isActive && (
                          <button
                            onClick={() => {
                              setCancellingSub(sub);
                              setIsRefunding(false);
                              setCancelRefundAmount(sub.packagePrice?.toString() || '100');
                              setCancelReasonText('অ্যাডমিন কর্তৃক ভিআইপি ক্যানসেল করা হয়েছে');
                              haptic('heavy');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-extrabold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                            title="ভিআইপি বাতিল করুন"
                          >
                            <i className="fas fa-ban"></i>
                            <span>VIP ক্যানসেল</span>
                          </button>
                        )}

                        {isCancelled && (
                          <button
                            onClick={() => handleReactivateSub(sub)}
                            disabled={isProcessingSubAction}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                            title="ভিআইপি পুনরায় চালু করুন"
                          >
                            <i className="fas fa-rotate-left"></i>
                            <span>আবার চালু করুন</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSub(sub)}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-white/10 flex items-center justify-center transition active:scale-95"
                          title="রেকর্ড মুছে ফেলুন"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
      {/* Cancel VIP Subscription Modal */}
      {cancellingSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <i className="fas fa-ban text-red-400 text-lg"></i>
                <span>ভিআইপি মেম্বারশিপ ক্যানসেল করুন</span>
              </h3>
              <button
                onClick={() => setCancellingSub(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Target User Details */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ইউজার:</span>
                <span className="font-black text-white">{cancellingSub.userName || 'User'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">UID:</span>
                <span className="font-mono text-slate-300">{cancellingSub.uid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">বর্তমান প্যাকেজ:</span>
                <span className="font-bold text-amber-400">
                  {cancellingSub.packageName} (৳{cancellingSub.packagePrice})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ক্লেইম দিন:</span>
                <span className="font-mono text-emerald-400">
                  {cancellingSub.daysClaimed || 0} / {cancellingSub.durationDays || 30} দিন (মোট লাভ: ৳
                  {(cancellingSub.totalEarned || 0).toFixed(2)})
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Refund balance toggle */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRefunding}
                    onChange={(e) => setIsRefunding(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="font-bold text-slate-200">ইউজারের ব্যালেন্সে টাকা রিফান্ড করবেন?</span>
                </label>
                {isRefunding && (
                  <div className="pt-1">
                    <label className="text-slate-400 text-[11px] block mb-1">রিফান্ড এমাউন্ট (টাকা):</label>
                    <input
                      type="number"
                      value={cancelRefundAmount}
                      onChange={(e) => setCancelRefundAmount(e.target.value)}
                      placeholder="রিফান্ড এমাউন্ট লিখুন"
                      className="input-modern py-1.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Cancel reason */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">ক্যানসেল করার কারণ (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="যেমন: অ্যাডমিন কর্তৃক ক্যানসেল / ব্যবহারকারীর অনুরোধ"
                  className="input-modern py-2 text-xs"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['অ্যাডমিন কর্তৃক ক্যানসেল', 'ইউজারের অনুরোধে বাতিল', 'নিয়ম লঙ্ঘন', 'ভুল প্যাকেজ ক্রয়'].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCancelReasonText(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle shrink-0"></i>
              <span>
                ক্যানসেল করলে ইউজারের দৈনিক অটো লাভ বন্ধ হবে এবং তিনি সাধারণ ইউজারে রূপান্তরিত হবেন। পরবর্তীতে আপনি যেকোনো
                সময় আবার সক্রিয় করতে পারবেন।
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancellingSub(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSub}
                disabled={isProcessingSubAction}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-50"
              >
                {isProcessingSubAction ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-ban"></i>
                )}
                <span>বাতিল নিশ্চিত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Duration & Days Adjustment Modal */}
      {editingDurationSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/50 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm border border-blue-500/30">
                  <i className="fas fa-calendar-days"></i>
                </div>
                <span>VIP মেয়াদ ও দিন কন্ট্রোলার</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDurationSub(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Target User Details */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ইউজার:</span>
                <span className="font-black text-white">{editingDurationSub.userName || 'User'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">প্যাকেজ:</span>
                <span className="font-bold text-amber-400">
                  {editingDurationSub.packageName} (৳{editingDurationSub.packagePrice})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">বর্তমান মেয়াদ:</span>
                <span className="font-mono text-white font-bold">
                  {editingDurationSub.durationDays || 30} দিন ({((editingDurationSub.durationDays || 30) / 30).toFixed(1)} মাস)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ক্লেইম হয়েছে / বাকি:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {editingDurationSub.daysClaimed || 0} দিন সম্পন্ন • বাকি {Math.max(0, (editingDurationSub.durationDays || 30) - (editingDurationSub.daysClaimed || 0))} দিন
                </span>
              </div>
            </div>

            {/* Quick Adjustment Presets */}
            <div className="space-y-2">
              <label className="text-slate-300 font-bold text-xs block">
                এক ক্লিকে মেয়াদ বাড়ান বা কমান (Quick Presets):
              </label>

              {/* Increase Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block">মেয়াদ বাড়াতে চাপুন:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+১ দিন', days: 1 },
                    { label: '+৭ দিন', days: 7 },
                    { label: '+১৫ দিন', days: 15 },
                    { label: '+১ মাস (৩০ দিন)', days: 30 },
                    { label: '+২ মাস (৬০ দিন)', days: 60 },
                    { label: '+৩ মাস (৯০ দিন)', days: 90 },
                    { label: '+৬ মাস (১৮০ দিন)', days: 180 },
                    { label: '+১ বছর (৩৬৫ দিন)', days: 365 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const cur = parseInt(modalDurationDays, 10) || 30;
                        setModalDurationDays((cur + item.days).toString());
                        haptic('light');
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold active:scale-95 transition"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Decrease Buttons */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-red-400 font-bold block">মেয়াদ কমাতে চাপুন:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '-১ দিন', days: -1 },
                    { label: '-৭ দিন', days: -7 },
                    { label: '-১৫ দিন', days: -15 },
                    { label: '-১ মাস (৩০ দিন)', days: -30 },
                    { label: '-২ মাস (৬০ দিন)', days: -60 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const cur = parseInt(modalDurationDays, 10) || 30;
                        setModalDurationDays(Math.max(1, cur + item.days).toString());
                        haptic('light');
                      }}
                      className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[10px] font-bold active:scale-95 transition"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Inputs Form */}
            <form onSubmit={handleSaveDurationModal} className="space-y-3 pt-2 border-t border-white/10 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    মোট মেয়াদ (দিন সংখ্যা):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      required
                      value={modalDurationDays}
                      onChange={(e) => setModalDurationDays(e.target.value)}
                      placeholder="30, 45, 60, 90..."
                      className="input-modern py-2 text-xs font-mono pl-8 border-blue-500/40"
                    />
                    <i className="fas fa-calendar-day absolute left-2.5 top-2.5 text-blue-400 text-xs pointer-events-none"></i>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    মোট মেয়াদ (মাস হিসেবে):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.1}
                      step="0.5"
                      value={((parseInt(modalDurationDays, 10) || 0) / 30).toFixed(1)}
                      onChange={(e) => {
                        const m = parseFloat(e.target.value) || 0;
                        setModalDurationDays(Math.max(1, Math.round(m * 30)).toString());
                      }}
                      placeholder="1, 2, 3..."
                      className="input-modern py-2 text-xs font-mono pl-8 border-blue-500/40"
                    />
                    <i className="fas fa-calendar-days absolute left-2.5 top-2.5 text-blue-400 text-xs pointer-events-none"></i>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                💡 দিন বা মাস যেকোনো একটি বক্সে পরিবর্তন করলেই অপরটি স্বয়ংক্রিয়ভাবে হিসাব হয়ে যাবে (৩০ দিন = ১ মাস)।
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold block">
                    অতিক্রান্ত / ক্লেইম সম্পন্ন দিন (Claimed Days):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDaysClaimed('0');
                      haptic('light');
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold"
                  >
                    রিসেট (০ দিন থেকে শুরু)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    value={modalDaysClaimed}
                    onChange={(e) => setModalDaysClaimed(e.target.value)}
                    placeholder="0, 5, 10..."
                    className="input-modern py-2 text-xs font-mono pl-8 border-white/20"
                  />
                  <i className="fas fa-check-double absolute left-2.5 top-2.5 text-emerald-400 text-xs pointer-events-none"></i>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold w-full">কমপ্লিট দিন কমান/বাড়ান প্রিসেট:</span>
                  {[
                    { label: '🔄 ০ দিন (রিসেট)', val: 0, type: 'set' },
                    { label: '-৫ দিন', val: -5, type: 'delta' },
                    { label: '-১ দিন', val: -1, type: 'delta' },
                    { label: '+১ দিন', val: 1, type: 'delta' },
                    { label: '+৫ দিন', val: 5, type: 'delta' },
                    { label: '+৭ দিন', val: 7, type: 'delta' },
                    { label: '✓ সব দিন সম্পন্ন', val: 'all', type: 'all' },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const cur = parseInt(modalDaysClaimed, 10) || 0;
                        const duration = parseInt(modalDurationDays, 10) || 30;
                        if (btn.type === 'set') {
                          setModalDaysClaimed(btn.val.toString());
                        } else if (btn.type === 'all') {
                          setModalDaysClaimed(duration.toString());
                        } else {
                          setModalDaysClaimed(Math.max(0, Math.min(duration, cur + (btn.val as number))).toString());
                        }
                        haptic('light');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold active:scale-95 transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ০ সেট করলে ইউজার সম্পূর্ণ নতুনভাবে শুরু থেকে প্রতিদিন লাভ পাবেন, এবং সব সম্পন্ন দিলে প্যাকেজের মেয়াদ শেষ হবে
                </p>
              </div>

              {/* Calculated Summary Preview */}
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">নতুন অবশিষ্ট মেয়াদ থাকবে:</span>
                <span className="font-mono text-cyan-300 font-black text-sm">
                  {Math.max(0, (parseInt(modalDurationDays, 10) || 0) - (parseInt(modalDaysClaimed, 10) || 0))} দিন
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDurationSub(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingDuration}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                >
                  {isSavingDuration ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-save"></i>
                  )}
                  <span>মেয়াদ পরিবর্তন সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
