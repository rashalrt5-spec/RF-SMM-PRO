import React, { useState, useEffect, useMemo } from 'react';
import {
  db,
  doc,
  collection,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
} from '../firebase';
import {
  VIPPackage,
  UserVIPSubscription,
  DEFAULT_VIP_PACKAGES,
} from '../types/vip';

export interface AdminPackagesManagerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
  packagesList?: any[];
  availableServices?: any[];
  smmConfig?: any;
  globalDiscountPercent?: number;
}

export const AdminPackagesManager: React.FC<AdminPackagesManagerProps> = ({
  showToast,
  haptic = () => {},
}) => {
  // Packages and subscriptions state
  const [packages, setPackages] = useState<VIPPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserVIPSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState('100');
  const [pkgDailyPercent, setPkgDailyPercent] = useState('10');
  const [pkgDuration, setPkgDuration] = useState('30');
  const [pkgLogoUrl, setPkgLogoUrl] = useState('');
  const [pkgBannerUrl, setPkgBannerUrl] = useState('');
  const [pkgIcon, setPkgIcon] = useState('fa-crown');
  const [pkgBadge, setPkgBadge] = useState('🔥 10% Daily');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgColorTheme, setPkgColorTheme] = useState<'amber' | 'blue' | 'purple' | 'emerald' | 'rose'>('amber');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // VIP Buyers Count Live Controls State
  const [pkgBuyersCount, setPkgBuyersCount] = useState('0');
  const [updatingBuyersPkgId, setUpdatingBuyersPkgId] = useState<string | null>(null);
  const [customBuyersInput, setCustomBuyersInput] = useState<Record<string, string>>({});

  // VIP Subscribers Duration/Month Controls State (দিন ও মাস কমানো/বাড়ানো)
  const [editingSubDuration, setEditingSubDuration] = useState<UserVIPSubscription | null>(null);
  const [subModalDurationDays, setSubModalDurationDays] = useState('30');
  const [subModalDaysClaimed, setSubModalDaysClaimed] = useState('0');
  const [subModalMode, setSubModalMode] = useState<'days' | 'months'>('days');
  const [isSavingSubDuration, setIsSavingSubDuration] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewingSubscribersPkg, setViewingSubscribersPkg] = useState<VIPPackage | null>(null);

  // VIP Hub General Header Banner state
  const [vipHubBannerUrl, setVipHubBannerUrl] = useState('');
  const [isUploadingHubBanner, setIsUploadingHubBanner] = useState(false);
  const [isSavingHubBanner, setIsSavingHubBanner] = useState(false);

  // VIP Module Master On / Off Switch State
  const [isVipEnabled, setIsVipEnabled] = useState(true);
  const [isTogglingVip, setIsTogglingVip] = useState(false);

  // 1. Real-time listener for VIP packages
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
          console.warn('Packages fetch error:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  }, []);

  // 2. Real-time listener for VIP subscriptions to count subscribed users
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
          setSubscriptions(list);
        },
        (err) => console.warn('Subscriptions fetch error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // 3. Listener for VIP Hub Banner settings & Master VIP On/Off
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
        (err) => console.warn('VIP settings fetch error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Subscribed users statistics per package
  const packageStats = useMemo(() => {
    const stats: Record<
      string,
      {
        activeSubscribers: number;
        totalSubscribers: number;
        subscriberList: UserVIPSubscription[];
      }
    > = {};

    packages.forEach((pkg) => {
      stats[pkg.id] = {
        activeSubscribers: 0,
        totalSubscribers: 0,
        subscriberList: [],
      };
    });

    subscriptions.forEach((sub) => {
      // match by packageId or price/name
      let pkgId = sub.packageId;
      if (!stats[pkgId]) {
        const found = packages.find(
          (p) => p.price === sub.packagePrice || p.name === sub.packageName
        );
        if (found) pkgId = found.id;
      }

      if (!stats[pkgId]) {
        stats[pkgId] = {
          activeSubscribers: 0,
          totalSubscribers: 0,
          subscriberList: [],
        };
      }

      stats[pkgId].totalSubscribers += 1;
      if (sub.status === 'Active') {
        stats[pkgId].activeSubscribers += 1;
      }
      stats[pkgId].subscriberList.push(sub);
    });

    return stats;
  }, [packages, subscriptions]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('ছবি সর্বোচ্চ ২MB হতে হবে!', 'error');
      return;
    }
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPkgLogoUrl(result);
        showToast('✅ লোগো প্রিভিউ সফলভাবে যুক্ত হয়েছে!', 'success');
      }
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      showToast('লোগো রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle Banner Upload
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('ব্যানার ছবি সর্বোচ্চ ৩MB হতে হবে!', 'error');
      return;
    }
    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPkgBannerUrl(result);
        showToast('✅ ব্যানার প্রিভিউ সফলভাবে যুক্ত হয়েছে!', 'success');
      }
      setIsUploadingBanner(false);
    };
    reader.onerror = () => {
      showToast('ব্যানার রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle Hub Header Banner Upload
  const handleHubBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('ব্যানার ছবি সর্বোচ্চ ৩MB হতে হবে!', 'error');
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
      showToast('ব্যানার ফাইল রিড করতে সমস্যা হয়েছে', 'error');
      setIsUploadingHubBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Save VIP Hub Header Banner
  const handleSaveHubBanner = async () => {
    setIsSavingHubBanner(true);
    haptic('light');
    try {
      await setDoc(
        doc(db, 'vip_settings', 'general'),
        {
          hubBannerUrl: vipHubBannerUrl.trim(),
          updatedAt: new Date().toISOString(),
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

  // Reset Form
  const resetForm = () => {
    setIsFormOpen(false);
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
    setPkgColorTheme('amber');
    setPkgIsActive(true);
    setPkgBuyersCount('0');
  };

  // Open Form to Edit
  const handleOpenEdit = (pkg: VIPPackage) => {
    setEditingPkgId(pkg.id);
    setPkgName(pkg.name);
    setPkgPrice(pkg.price.toString());
    setPkgDailyPercent((pkg.dailyReturnPercent || 10).toString());
    setPkgDuration((pkg.durationDays || 30).toString());
    setPkgLogoUrl(pkg.logoUrl || '');
    setPkgBannerUrl(pkg.bannerUrl || '');
    setPkgIcon(pkg.icon || 'fa-crown');
    setPkgBadge(pkg.badge || `${pkg.dailyReturnPercent || 10}% Daily`);
    setPkgDesc(pkg.description || '');
    setPkgColorTheme(pkg.colorTheme || 'amber');
    setPkgIsActive(pkg.isActive !== false);
    setPkgBuyersCount((typeof pkg.buyersCount === 'number' ? pkg.buyersCount : (pkg.baseBuyersCount || 0)).toString());
    setIsFormOpen(true);
    haptic('light');
  };

  // Open Form to Add New
  const handleOpenAddNew = () => {
    resetForm();
    setIsFormOpen(true);
    setPkgName('নতুন VIP প্যাকেজ');
    setPkgPrice('500');
    setPkgDailyPercent('10');
    setPkgDuration('30');
    setPkgBadge('💎 10% Daily');
    setPkgBuyersCount('25');
    haptic('light');
  };

  // Live Adjust Buyers Count (+ / - / quick adjustments)
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
      showToast('ক্রেতা সংখ্যা আপডেট ব্যর্থ: ' + err.message, 'error');
    } finally {
      setUpdatingBuyersPkgId(null);
    }
  };

  // Set Exact Buyers Count
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

  // Quick direct adjust subscriber duration (+ / - days or months)
  const handleQuickAdjustSubscriberDuration = async (sub: UserVIPSubscription, deltaDays: number) => {
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
        `✅ "${sub.userName || 'গ্রাহক'}"-এর মেয়াদ ${changeText} করা হয়েছে (মোট: ${newDuration} দিন / ${monthsStr} মাস)!`,
        'success'
      );
    } catch (err: any) {
      console.error('Quick adjust duration error:', err);
      showToast('মেয়াদ পরিবর্তন করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  // Quick direct adjust subscriber completed / claimed days (+ / - days, reset to 0, mark complete)
  const handleQuickAdjustSubscriberClaimedDays = async (
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
        actionText = `সম্পূর্ণ ${duration} দিন কমপ্লিট হিসেবে সেট করা হয়েছে`;
      } else {
        const sign = deltaOrAction > 0 ? `+${deltaOrAction}` : `${deltaOrAction}`;
        actionText = `কমপ্লিট দিন ${sign} দিন পরিবর্তন করা হয়েছে (মোট সম্পন্ন: ${newClaimed}/${duration} দিন, বাকি: ${duration - newClaimed} দিন)`;
      }

      showToast(
        `✅ "${sub.userName || 'গ্রাহক'}"-এর ${actionText}!`,
        'success'
      );
    } catch (err: any) {
      console.error('Quick adjust claimed error:', err);
      showToast('কমপ্লিট দিন পরিবর্তন করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  // Full Save from Duration Modal for subscriber
  const handleSaveSubDurationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubDuration) return;
    const newDuration = Math.max(1, parseInt(subModalDurationDays, 10) || 30);
    const newClaimed = Math.max(0, parseInt(subModalDaysClaimed, 10) || 0);
    const newStatus =
      editingSubDuration.status === 'Cancelled'
        ? 'Cancelled'
        : newClaimed < newDuration
        ? 'Active'
        : 'Completed';

    setIsSavingSubDuration(true);
    haptic('success');
    try {
      await updateDoc(doc(db, 'vip_subscriptions', editingSubDuration.id), {
        durationDays: newDuration,
        daysClaimed: newClaimed,
        status: newStatus,
        durationUpdatedAt: new Date().toISOString()
      });

      if (newStatus === 'Active' && editingSubDuration.uid) {
        await updateDoc(doc(db, 'users', editingSubDuration.uid), {
          isVip: true,
          vipPackageName: editingSubDuration.packageName,
          vipBadge: 'VIP MEMBER'
        });
      }

      showToast(
        `🎉 "${editingSubDuration.userName || 'গ্রাহক'}"-এর VIP মোট মেয়াদ ${newDuration} দিন (${(newDuration / 30).toFixed(1)} মাস) ও সম্পন্ন ${newClaimed} দিন সফলভাবে আপডেট হয়েছে!`,
        'success'
      );
      setEditingSubDuration(null);
    } catch (err: any) {
      console.error('Save duration error:', err);
      showToast('মেয়াদ সংরক্ষণ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSavingSubDuration(false);
    }
  };

  // Save / Update Package to Firestore
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(pkgPrice);
    const dailyReturnNum = parseFloat(pkgDailyPercent) || 10;
    const durationNum = parseInt(pkgDuration, 10) || 30;
    const buyersCountNum = Math.max(0, parseInt(pkgBuyersCount, 10) || 0);

    if (!pkgName.trim()) {
      showToast('প্যাকেজের নাম দেওয়া আবশ্যক!', 'error');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('সঠিক প্যাকেজ মূল্য দিন!', 'error');
      return;
    }

    setIsSaving(true);
    haptic('light');

    try {
      const dailyAmt = (priceNum * dailyReturnNum) / 100;
      const totalAmt = dailyAmt * durationNum;

      const pkgData: Omit<VIPPackage, 'id'> = {
        name: pkgName.trim(),
        price: priceNum,
        dailyReturnPercent: dailyReturnNum,
        durationDays: durationNum,
        logoUrl: pkgLogoUrl.trim() || '',
        bannerUrl: pkgBannerUrl.trim() || '',
        icon: pkgIcon.trim() || 'fa-crown',
        badge: pkgBadge.trim() || `${dailyReturnNum}% Daily`,
        description:
          pkgDesc.trim() ||
          `প্রতিদিন ${dailyReturnNum}% লাভ (৳${dailyAmt.toFixed(2)}) হিসেবে ${durationNum} দিনে মোট ৳${totalAmt.toFixed(2)} আয়!`,
        features: [
          `${dailyReturnNum}% দৈনিক অটো প্রফিট (৳${dailyAmt.toFixed(2)}/দিন)`,
          `মেয়াদ: ${durationNum} দিন`,
          `মোট রিটার্ন: ৳${totalAmt.toFixed(2)} (${dailyReturnNum * durationNum}%)`,
          'প্রতি ২৪ ঘণ্টায় অটোমেটিক ব্যালেন্স ক্রেডিট',
          'ইনস্ট্যান্ট বিকাশ/নগদ/রকেট ক্যাশআউট',
        ],
        colorTheme: pkgColorTheme,
        isActive: pkgIsActive,
        buyersCount: buyersCountNum,
      };

      if (editingPkgId) {
        await updateDoc(doc(db, 'vip_packages', editingPkgId), pkgData as any);
        showToast('✅ VIP প্যাকেজ সফলভাবে আপডেট করা হয়েছে!', 'success');
      } else {
        const newId = `vip_${priceNum}_${Date.now().toString().slice(-4)}`;
        await setDoc(doc(db, 'vip_packages', newId), { id: newId, ...pkgData });
        showToast('✅ নতুন VIP প্যাকেজ সফলভাবে তৈরি হয়েছে!', 'success');
      }

      haptic('success');
      resetForm();
    } catch (err: any) {
      console.error('Save package error:', err);
      showToast('প্যাকেজ সেভ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Package
  const handleDeletePackage = async (id: string, name: string) => {
    const activeSubsCount = packageStats[id]?.activeSubscribers || 0;
    const confirmMessage = activeSubsCount > 0
      ? `সতর্কতা: "${name}" প্যাকেজে বর্তমানে ${activeSubsCount} জন সক্রিয় গ্রাহক আছেন। আপনি কি নিশ্চিত এই প্যাকেজটি ডিলিট করতে চান?`
      : `আপনি কি "${name}" প্যাকেজটি নিশ্চিতভাবে ডিলিট করতে চান?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      haptic('heavy');
      await deleteDoc(doc(db, 'vip_packages', id));
      showToast(`🗑️ "${name}" প্যাকেজ মুছে ফেলা হয়েছে!`, 'info');
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast('প্যাকেজ ডিলিট করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleActive = async (pkg: VIPPackage) => {
    try {
      const newStatus = !pkg.isActive;
      await updateDoc(doc(db, 'vip_packages', pkg.id), { isActive: newStatus });
      showToast(
        newStatus
          ? `✅ "${pkg.name}" প্যাকেজটি সক্রিয় (Active) করা হয়েছে!`
          : `⏸️ "${pkg.name}" প্যাকেজটি সাময়িক নিষ্ক্রিয় (Inactive) করা হয়েছে!`,
        'success'
      );
      haptic('light');
    } catch (err: any) {
      showToast('স্ট্যাটাস পরিবর্তনে ত্রুটি: ' + err.message, 'error');
    }
  };

  // Populate Default Packages
  const handleSeedDefaults = async () => {
    if (!window.confirm('আপনি কি ডিফল্ট ৪টি VIP প্যাকেজ ডাটাবেজে যুক্ত করতে চান?')) return;
    try {
      haptic('heavy');
      for (const p of DEFAULT_VIP_PACKAGES) {
        await setDoc(doc(db, 'vip_packages', p.id), p, { merge: true });
      }
      showToast('✅ ডিফল্ট VIP প্যাকেজগুলো সফলভাবে সংরক্ষিত হয়েছে!', 'success');
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (filterStatus === 'active' && pkg.isActive === false) return false;
      if (filterStatus === 'inactive' && pkg.isActive !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          pkg.name.toLowerCase().includes(q) ||
          pkg.price.toString().includes(q) ||
          (pkg.badge && pkg.badge.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [packages, filterStatus, searchQuery]);

  // Overall statistics
  const totalSubscribersAll = subscriptions.length;
  const activeSubscribersAll = subscriptions.filter((s) => s.status === 'Active').length;
  const totalInvestmentVolume = subscriptions.reduce((acc, curr) => acc + (curr.packagePrice || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. TOP OVERVIEW & STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">মোট প্যাকেজ</span>
            <i className="fas fa-boxes-stacked text-amber-400 text-xs"></i>
          </div>
          <div className="text-xl font-black text-amber-300 font-mono mt-1">
            {packages.length} টি
          </div>
          <span className="text-[9px] text-slate-500">
            {packages.filter((p) => p.isActive !== false).length} টি লাইভ সক্রিয়
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">সক্রিয় গ্রাহক (Active)</span>
            <i className="fas fa-user-check text-emerald-400 text-xs"></i>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {activeSubscribersAll} জন
          </div>
          <span className="text-[9px] text-emerald-500/80">প্রতিদিন প্রফিট পাচ্ছেন</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">মোট সাবস্ক্রিপশন</span>
            <i className="fas fa-receipt text-blue-400 text-xs"></i>
          </div>
          <div className="text-xl font-black text-blue-300 font-mono mt-1">
            {totalSubscribersAll} বার
          </div>
          <span className="text-[9px] text-slate-500">লাইফটাইম ক্রয়কৃত প্যাকেজ</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">মোট ইনভেস্টমেন্ট ভলিউম</span>
            <i className="fas fa-sack-dollar text-purple-400 text-xs"></i>
          </div>
          <div className="text-xl font-black text-purple-300 font-mono mt-1">
            ৳{totalInvestmentVolume.toLocaleString()}
          </div>
          <span className="text-[9px] text-purple-400/80">প্যাকেজ সেলস অ্যামাউন্ট</span>
        </div>
      </div>

      {/* 2. VIP HUB MAIN HEADER PROMO BANNER MANAGER */}
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
            <img
              src={vipHubBannerUrl}
              alt="VIP Hub Banner Preview"
              className="w-full h-full object-cover"
            />
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
            <span className="text-[10px] text-slate-500 mt-0.5">
              নিচে সরাসরি ডিভাইস থেকে ব্যানার আপলোড করুন বা লিংক দিন
            </span>
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

      {/* 3. PACKAGES MANAGER HEADER & ACTION CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <span>👑 VIP Packages Manager (প্যাকেজ নিয়ন্ত্রণ)</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold font-mono">
              {packages.length} Packages
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ম্যানুয়ালি VIP প্যাকেজ যুক্ত, এডিট, ডিলিট এবং প্রতিটি প্যাকেজের সাবস্ক্রাইবার সংখ্যা দেখুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          {packages.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <i className="fas fa-rotate"></i>
              <span>ডিফল্ট প্যাকেজ যুক্ত করুন</span>
            </button>
          )}

          <button
            onClick={handleOpenAddNew}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5"
          >
            <i className="fas fa-plus-circle"></i>
            <span>+ নতুন VIP প্যাকেজ তৈরি</span>
          </button>
        </div>
      </div>

      {/* 4. SEARCH & STATUS FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/80 rounded-2xl border border-white/5">
        <div className="flex items-center gap-1">
          {(['all', 'active', 'inactive'] as const).map((st) => (
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
              {st === 'all' ? 'সব প্যাকেজ' : st === 'active' ? '✅ সক্রিয় (Active)' : '⏸️ নিষ্ক্রিয় (Inactive)'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <input
            type="text"
            className="input-modern pl-9 py-1.5 text-xs w-full"
            placeholder="প্যাকেজ নাম বা মূল্য দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-2.5 text-slate-500 text-xs"></i>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* 5. ADD / EDIT PACKAGE MODAL FORM */}
      {isFormOpen && (
        <form
          onSubmit={handleSavePackage}
          className="glass-card p-4 sm:p-5 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-slate-900 via-[#0B0F17] to-slate-950 space-y-4 shadow-2xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
              <i className="fas fa-crown"></i>
              <span>{editingPkgId ? 'VIP প্যাকেজ এডিট করুন' : 'নতুন VIP প্যাকেজ তৈরি করুন'}</span>
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 flex items-center justify-center text-xs transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Banner & Logo Media Upload Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/10">
            {/* Package Cover Banner */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>প্যাকেজ কভার ব্যানার (Package Banner):</span>
                {pkgBannerUrl && (
                  <button
                    type="button"
                    onClick={() => setPkgBannerUrl('')}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    ব্যানার সরান
                  </button>
                )}
              </label>

              {pkgBannerUrl ? (
                <div className="w-full h-24 rounded-xl overflow-hidden border border-amber-500/40 relative shadow-inner">
                  <img src={pkgBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[9px] bg-black/70 text-amber-300 px-1.5 py-0.5 rounded">
                    প্রিভিউ
                  </span>
                </div>
              ) : (
                <div className="w-full h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <i className="fas fa-image text-xl mb-1"></i>
                  <span>কোনো ব্যানার নেই</span>
                </div>
              )}

              <div className="flex gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
                  <i className="fas fa-upload"></i>
                  <span>{isUploadingBanner ? 'আপলোড...' : 'আপলোড'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={isUploadingBanner}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  value={pkgBannerUrl}
                  onChange={(e) => setPkgBannerUrl(e.target.value)}
                  placeholder="অথবা ব্যানার লিংক (https://...)"
                  className="input-modern py-1 text-xs flex-1"
                />
              </div>
            </div>

            {/* Package Logo / Icon */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>প্যাকেজ লোগো বা আইকন (Logo):</span>
                {pkgLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setPkgLogoUrl('')}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    লোগো সরান
                  </button>
                )}
              </label>

              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {pkgLogoUrl ? (
                    <img src={pkgLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <i className={`fas ${pkgIcon} text-3xl text-amber-400`}></i>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
                      <i className="fas fa-upload"></i>
                      <span>{isUploadingLogo ? 'আপলোড...' : 'লোগো আপলোড'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={pkgLogoUrl}
                    onChange={(e) => setPkgLogoUrl(e.target.value)}
                    placeholder="অথবা লোগো লিংক (https://...)"
                    className="input-modern py-1 text-xs w-full"
                  />

                  {/* Icon Selector if no image */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {[
                      { icon: 'fa-crown', label: 'Crown' },
                      { icon: 'fa-gem', label: 'Gem' },
                      { icon: 'fa-shield-halved', label: 'Shield' },
                      { icon: 'fa-bolt', label: 'Bolt' },
                      { icon: 'fa-medal', label: 'Medal' },
                      { icon: 'fa-star', label: 'Star' },
                    ].map((ic) => (
                      <button
                        key={ic.icon}
                        type="button"
                        onClick={() => {
                          setPkgIcon(ic.icon);
                          haptic('light');
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition border ${
                          pkgIcon === ic.icon
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        }`}
                        title={ic.label}
                      >
                        <i className={`fas ${ic.icon}`}></i>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">প্যাকেজের নাম:</label>
              <input
                type="text"
                required
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="যেমন: VIP 1 - ব্রোঞ্জ"
                className="input-modern py-2 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">প্যাকেজ মূল্য (টাকা):</label>
              <input
                type="number"
                required
                min={1}
                value={pkgPrice}
                onChange={(e) => setPkgPrice(e.target.value)}
                placeholder="100, 200, 500..."
                className="input-modern py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">দৈনিক রিটার্ন (%):</label>
              <input
                type="number"
                required
                step="0.1"
                min={0.1}
                value={pkgDailyPercent}
                onChange={(e) => setPkgDailyPercent(e.target.value)}
                placeholder="10"
                className="input-modern py-2 text-xs font-mono"
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
                min={1}
                value={pkgDuration}
                onChange={(e) => setPkgDuration(e.target.value)}
                placeholder="30"
                className="input-modern py-2 text-xs font-mono"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1 mt-1.5">
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
              <label className="font-bold text-slate-300 block mb-1">ব্যাজ টেক্সট (Badge):</label>
              <input
                type="text"
                value={pkgBadge}
                onChange={(e) => setPkgBadge(e.target.value)}
                placeholder="🔥 10% Daily / Most Popular"
                className="input-modern py-2 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">কালার থিম (Theme):</label>
              <select
                value={pkgColorTheme}
                onChange={(e) => setPkgColorTheme(e.target.value as any)}
                className="input-modern py-2 text-xs bg-slate-900"
              >
                <option value="amber">Amber (গোল্ডেন)</option>
                <option value="blue">Blue (নীল)</option>
                <option value="purple">Purple (বেগুনি)</option>
                <option value="emerald">Emerald (সবুজ)</option>
                <option value="rose">Rose (গোলাপি)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-amber-300 block mb-1 flex items-center justify-between">
                <span>কত জন কিনেছে (Buyers Count):</span>
                <span className="text-[10px] text-emerald-400 font-bold">⚡ লাইভ আপডেট</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={pkgBuyersCount}
                  onChange={(e) => setPkgBuyersCount(e.target.value)}
                  placeholder="42, 78, 100..."
                  className="input-modern py-2 text-xs font-mono pl-8 border-amber-500/40"
                />
                <i className="fas fa-users absolute left-2.5 top-2.5 text-amber-400 text-xs pointer-events-none"></i>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                ইউজাররা প্যাকেজে এই সংখ্যা দেখতে পাবে এবং লাইভ বাড়ানো বা কমানো যাবে
              </p>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1 text-xs">বিবরণ (Description):</label>
            <textarea
              rows={2}
              value={pkgDesc}
              onChange={(e) => setPkgDesc(e.target.value)}
              placeholder="প্যাকেজের আকর্ষণীয় সংক্ষিপ্ত বিবরণ..."
              className="input-modern py-2 text-xs w-full"
            />
          </div>

          {/* Active Checkbox & Calculated Income Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/30 border border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pkgIsActive}
                onChange={(e) => setPkgIsActive(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-white">
                সরাসরি ইউজারদের ড্যাশবোর্ডে সক্রিয় রাখুন (Active)
              </span>
            </label>

            {/* Quick Profit Calculator */}
            {(() => {
              const pr = parseFloat(pkgPrice) || 0;
              const dPct = parseFloat(pkgDailyPercent) || 10;
              const dur = parseInt(pkgDuration, 10) || 30;
              const dailyProfit = (pr * dPct) / 100;
              const totalProfit = dailyProfit * dur;

              return (
                <div className="text-[11px] font-mono text-slate-300 flex items-center gap-3">
                  <span>
                    দৈনিক: <b className="text-emerald-400">৳{dailyProfit.toFixed(1)}</b>
                  </span>
                  <span>
                    মোট রিটার্ন ({dur} দিন):{' '}
                    <b className="text-amber-400">৳{totalProfit.toFixed(1)}</b>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <i className="fas fa-check"></i>
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : editingPkgId ? 'প্যাকেজ আপডেট করুন' : 'প্যাকেজ তৈরি করুন'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. VIP PACKAGES CARDS GRID WITH SUBSCRIBER COUNTS */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <i className="fas fa-spinner fa-spin text-xl text-amber-400 mb-2"></i>
          <div>VIP প্যাকেজ লোড হচ্ছে...</div>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400 text-xs space-y-3">
          <i className="fas fa-box-open text-3xl text-amber-400/50"></i>
          <div>কোনো প্যাকেজ পাওয়া যায়নি!</div>
          <button
            onClick={handleOpenAddNew}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
          >
            + নতুন প্যাকেজ তৈরি করুন
          </button>
        </div>
      ) : (
        <div className="space-y-4">
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

          {/* Top Live Buyers Dashboard Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow">
                <i className="fas fa-users-gear"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <span>VIP ক্রেতা সংখ্যা লাইভ কন্ট্রোলার (Buyers Live Controller)</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    লাইভ আপডেট সক্রিয়
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  যেকোনো প্যাকেজের ক্রেতা সংখ্যা বাড়ানো বা কমানো যাবে এবং সাথে সাথে ইউজারদের ড্যাশবোর্ডে লাইভ আপডেট হবে।
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredPackages.map((pkg) => {
            const stats = packageStats[pkg.id] || {
              activeSubscribers: 0,
              totalSubscribers: 0,
              subscriberList: [],
            };
            const dailyAmt = (pkg.price * (pkg.dailyReturnPercent || 10)) / 100;
            const totalAmt = dailyAmt * (pkg.durationDays || 30);
            const isPkgActive = pkg.isActive !== false;

            return (
              <div
                key={pkg.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xl ${
                  isPkgActive
                    ? 'bg-slate-900/90 border-white/10 hover:border-amber-500/40'
                    : 'bg-slate-950/80 border-red-500/20 opacity-85'
                }`}
              >
                {/* Package Cover Banner (If uploaded) */}
                {pkg.bannerUrl && (
                  <div className="w-full h-28 relative overflow-hidden border-b border-amber-500/20 bg-black">
                    <img
                      src={pkg.bannerUrl}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-black/70 backdrop-blur-md text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <i className="fas fa-image text-[8px]"></i> কভার ব্যানার যুক্ত
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header Row: Logo, Badges, Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Logo Box */}
                        <div
                          className={`w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner ${
                            pkg.bannerUrl ? '-mt-7 ring-2 ring-slate-900 bg-slate-900' : ''
                          }`}
                        >
                          {pkg.logoUrl ? (
                            <img
                              src={pkg.logoUrl}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <i className={`fas ${pkg.icon || 'fa-crown'} text-amber-400 text-xl`}></i>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {pkg.badge || `${pkg.dailyReturnPercent || 10}% Daily`}
                            </span>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                isPkgActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}
                            >
                              {isPkgActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                            </span>
                          </div>

                          <h4 className="text-base font-black text-white mt-1 truncate">
                            {pkg.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                      </div>

                      {/* Price Block */}
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-white font-mono">
                          ৳{pkg.price}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {pkg.durationDays || 30} দিন
                        </span>
                      </div>
                    </div>

                    {/* Subscriber Count Indicator Badge (Highlight Feature) */}
                    <div className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-between gap-2 shadow-inner">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs shadow">
                          <i className="fas fa-users"></i>
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>সাবস্ক্রাইবার সংখ্যা:</span>
                            <span className="text-emerald-400 font-mono text-sm">
                              {stats.activeSubscribers} জন সক্রিয়
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            মোট কেনা হয়েছে: {stats.totalSubscribers} বার
                          </span>
                        </div>
                      </div>

                      {stats.totalSubscribers > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingSubscribersPkg(pkg);
                            haptic('light');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition shrink-0 flex items-center gap-1"
                        >
                          <i className="fas fa-eye text-[9px]"></i>
                          <span>লিস্ট দেখুন</span>
                        </button>
                      )}
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
                          {typeof pkg.buyersCount === 'number' ? pkg.buyersCount : (pkg.baseBuyersCount || 0)} জন
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
                          value={customBuyersInput[pkg.id] ?? ''}
                          onChange={(e) => setCustomBuyersInput({ ...customBuyersInput, [pkg.id]: e.target.value })}
                          className="input-modern py-1 px-2 text-xs font-mono flex-1 bg-black/60"
                        />
                        <button
                          type="button"
                          disabled={updatingBuyersPkgId === pkg.id || !customBuyersInput[pkg.id]}
                          onClick={() => {
                            const val = parseInt(customBuyersInput[pkg.id], 10);
                            if (!isNaN(val) && val >= 0) {
                              handleSetExactBuyersCount(pkg, val);
                              setCustomBuyersInput({ ...customBuyersInput, [pkg.id]: '' });
                            }
                          }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow transition active:scale-95"
                        >
                          সেট
                        </button>
                      </div>
                    </div>

                    {/* Return Info Box */}
                    <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 text-xs space-y-1 mt-2.5">
                      <div className="flex justify-between text-slate-300">
                        <span>দৈনিক রিটার্ন ({pkg.dailyReturnPercent || 10}%):</span>
                        <span className="font-mono font-black text-emerald-400">
                          +৳{dailyAmt.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>মোট রিটার্ন ({pkg.durationDays || 30} দিন):</span>
                        <span className="font-mono font-black text-amber-400">
                          ৳{totalAmt.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row: Edit, Toggle Active, Delete */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <i className="fas fa-edit"></i>
                      <span>এডিট করুন</span>
                    </button>

                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(pkg)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 active:scale-95 ${
                        isPkgActive
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                      title={isPkgActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    >
                      <i className={`fas ${isPkgActive ? 'fa-pause' : 'fa-play'}`}></i>
                      <span className="hidden sm:inline">
                        {isPkgActive ? 'পজ' : 'চালু'}
                      </span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                      title="প্যাকেজ মুছে ফেলুন"
                    >
                      <i className="fas fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 7. SUBSCRIBED USERS VIEW MODAL */}
      {viewingSubscribersPkg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setViewingSubscribersPkg(null)}
        >
          <div
            className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 text-white space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                  <i className="fas fa-users"></i>
                  <span>{viewingSubscribersPkg.name} - সাবস্ক্রাইবার তালিকা</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  মূল্য: ৳{viewingSubscribersPkg.price} • মোট গ্রাহক:{' '}
                  {packageStats[viewingSubscribersPkg.id]?.totalSubscribers || 0} জন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubscribersPkg(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 flex items-center justify-center text-xs transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {(packageStats[viewingSubscribersPkg.id]?.subscriberList || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  কোনো গ্রাহক পাওয়া যায়নি।
                </div>
              ) : (
                packageStats[viewingSubscribersPkg.id]?.subscriberList.map((sub) => {
                  const duration = sub.durationDays || 30;
                  const claimed = sub.daysClaimed || 0;
                  const remaining = Math.max(0, duration - claimed);
                  const months = (duration / 30).toFixed(1);

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 text-xs shadow-md"
                    >
                      {/* Top User Info & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{sub.userName || 'গ্রাহক'}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                sub.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : sub.status === 'Cancelled'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : 'bg-slate-700 text-slate-300 border-white/10'
                              }`}
                            >
                              {sub.status === 'Active' ? 'সক্রিয় (Active)' : sub.status === 'Cancelled' ? 'বাতিল' : 'মেয়াদ শেষ'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            UID: {sub.uid ? sub.uid.slice(0, 12) : 'N/A'}... • ক্রয়: {sub.purchasedAt ? new Date(sub.purchasedAt).toLocaleDateString('bn-BD') : 'N/A'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-emerald-400 font-bold text-xs">
                            +৳{(sub.totalEarned || 0).toFixed(1)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            আয় হয়েছে
                          </span>
                        </div>
                      </div>

                      {/* Day and Month Details */}
                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-900/80 rounded-xl border border-white/5 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">মোট মেয়াদ:</span>
                          <span className="text-amber-300 font-mono font-black">
                            {duration} দিন <span className="text-[9px] text-amber-400/80">({months} মাস)</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">ক্লেইম হয়েছে:</span>
                          <span className="text-emerald-400 font-mono font-black">
                            {claimed} দিন
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">বাকি মেয়াদ:</span>
                          <span className="text-cyan-300 font-mono font-black">
                            {remaining} দিন
                          </span>
                        </div>
                      </div>

                      {/* Quick Adjust Buttons for Days and Months */}
                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        {/* Day Adjusters */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
                            <i className="fas fa-calendar-day text-blue-400 text-[9px]"></i>
                            <span>দিন কমান/বাড়ান:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, -1)}
                            className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                            title="১ দিন কমান"
                          >
                            -১ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, -7)}
                            className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                            title="৭ দিন কমান"
                          >
                            -৭ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, 1)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                            title="১ দিন বাড়ান"
                          >
                            +১ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, 7)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                            title="৭ দিন বাড়ান"
                          >
                            +৭ দিন
                          </button>
                        </div>

                        {/* Month Adjusters */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
                            <i className="fas fa-calendar-days text-amber-400 text-[9px]"></i>
                            <span>মাস কমান/বাড়ান:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, -30)}
                            className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-black active:scale-95 transition"
                            title="১ মাস (৩০ দিন) কমান"
                          >
                            -১ মাস (-৩০ দিন)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, 30)}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black active:scale-95 transition"
                            title="১ মাস (৩০ দিন) বাড়ান"
                          >
                            +১ মাস (+৩০ দিন)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberDuration(sub, 60)}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black active:scale-95 transition"
                            title="২ মাস (৬০ দিন) বাড়ান"
                          >
                            +২ মাস (+৬০ দিন)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubDuration(sub);
                              setSubModalDurationDays((sub.durationDays || 30).toString());
                              setSubModalDaysClaimed((sub.daysClaimed || 0).toString());
                              setSubModalMode('days');
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
                          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
                            <i className="fas fa-check-double text-emerald-400 text-[9px]"></i>
                            <span>কমপ্লিট দিন কমান/বাড়ান:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, 'reset')}
                            className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-black active:scale-95 transition"
                            title="কমপ্লিট দিন ০ করুন (নতুন করে শুরু)"
                          >
                            🔄 ০ দিন (রিসেট)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, -1)}
                            className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                            title="কমপ্লিট দিন ১ দিন কমান (বাকি ১ দিন বাড়বে)"
                          >
                            -১ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, -5)}
                            className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 font-bold active:scale-95 transition"
                            title="কমপ্লিট দিন ৫ দিন কমান"
                          >
                            -৫ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, 1)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                            title="কমপ্লিট দিন ১ দিন বাড়ান"
                          >
                            +১ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, 5)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold active:scale-95 transition"
                            title="কমপ্লিট দিন ৫ দিন বাড়ান"
                          >
                            +৫ দিন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubscriberClaimedDays(sub, 'complete')}
                            className="px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold active:scale-95 transition"
                            title="সব দিন সম্পন্ন হিসেবে মার্ক করুন (প্যাকেজ সমাপ্ত)"
                          >
                            ✓ সব সম্পন্ন
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setViewingSubscribersPkg(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SUBSCRIBER DURATION AND MONTHS CONTROLLER MODAL */}
      {editingSubDuration && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm border border-amber-500/30">
                  <i className="fas fa-calendar-days"></i>
                </div>
                <span>VIP দিন ও মাস কন্ট্রোলার</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSubDuration(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Target User Details */}
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">গ্রাহকের নাম:</span>
                <span className="font-black text-white">{editingSubDuration.userName || 'গ্রাহক'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">প্যাকেজ:</span>
                <span className="font-bold text-amber-400">
                  {editingSubDuration.packageName} (৳{editingSubDuration.packagePrice})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">বর্তমান মেয়াদ:</span>
                <span className="font-mono text-white font-bold">
                  {editingSubDuration.durationDays || 30} দিন ({((editingSubDuration.durationDays || 30) / 30).toFixed(1)} মাস)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">সম্পন্ন / বাকি:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {editingSubDuration.daysClaimed || 0} দিন সম্পন্ন • বাকি {Math.max(0, (editingSubDuration.durationDays || 30) - (editingSubDuration.daysClaimed || 0))} দিন
                </span>
              </div>
            </div>

            {/* Mode Switch: Days vs Months */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSubModalMode('days')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  subModalMode === 'days'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📅 দিন (Days) মোড
              </button>
              <button
                type="button"
                onClick={() => setSubModalMode('months')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  subModalMode === 'months'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗓️ মাস (Months) মোড
              </button>
            </div>

            {/* Quick Presets */}
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
                        const cur = parseInt(subModalDurationDays, 10) || 30;
                        setSubModalDurationDays((cur + item.days).toString());
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
                        const cur = parseInt(subModalDurationDays, 10) || 30;
                        setSubModalDurationDays(Math.max(1, cur + item.days).toString());
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
            <form onSubmit={handleSaveSubDurationModal} className="space-y-3 pt-2 border-t border-white/10 text-xs">
              {subModalMode === 'days' ? (
                <div>
                  <label className="text-slate-300 font-bold block mb-1 flex items-center justify-between">
                    <span>মোট মেয়াদ (দিন সংখ্যা):</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      = {((parseInt(subModalDurationDays, 10) || 0) / 30).toFixed(1)} মাস
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      required
                      value={subModalDurationDays}
                      onChange={(e) => setSubModalDurationDays(e.target.value)}
                      placeholder="30, 45, 60, 90..."
                      className="input-modern py-2 text-xs font-mono pl-8 border-amber-500/40"
                    />
                    <i className="fas fa-calendar-day absolute left-2.5 top-2.5 text-amber-400 text-xs pointer-events-none"></i>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 font-bold block mb-1 flex items-center justify-between">
                    <span>মোট মেয়াদ (মাস সংখ্যা):</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      = {parseInt(subModalDurationDays, 10) || 0} দিন
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.1}
                      step="0.5"
                      required
                      value={(parseInt(subModalDurationDays, 10) || 0) / 30}
                      onChange={(e) => {
                        const m = parseFloat(e.target.value) || 0;
                        setSubModalDurationDays(Math.max(1, Math.round(m * 30)).toString());
                      }}
                      placeholder="1, 2, 3, 6, 12..."
                      className="input-modern py-2 text-xs font-mono pl-8 border-amber-500/40"
                    />
                    <i className="fas fa-calendar-days absolute left-2.5 top-2.5 text-amber-400 text-xs pointer-events-none"></i>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ১ মাস = ৩০ দিন, ২ মাস = ৬০ দিন, ৩ মাস = ৯০ দিন, ৬ মাস = ১৮০ দিন
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold block">
                    অতিক্রান্ত / ক্লেইম সম্পন্ন দিন (Claimed Days):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSubModalDaysClaimed('0');
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
                    value={subModalDaysClaimed}
                    onChange={(e) => setSubModalDaysClaimed(e.target.value)}
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
                        const cur = parseInt(subModalDaysClaimed, 10) || 0;
                        const duration = parseInt(subModalDurationDays, 10) || 30;
                        if (btn.type === 'set') {
                          setSubModalDaysClaimed(btn.val.toString());
                        } else if (btn.type === 'all') {
                          setSubModalDaysClaimed(duration.toString());
                        } else {
                          setSubModalDaysClaimed(Math.max(0, Math.min(duration, cur + (btn.val as number))).toString());
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
                  ০ সেট করলে ইউজার সম্পূর্ণ নতুনভাবে শুরু থেকে প্রতিদিন লাভ পাবেন, এবং সব সম্পন্ন দিলে প্যাকেজ সমাপ্ত হবে
                </p>
              </div>

              {/* Calculated Summary Preview */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">নতুন অবশিষ্ট মেয়াদ থাকবে:</span>
                <span className="font-mono text-cyan-300 font-black text-sm">
                  {Math.max(0, (parseInt(subModalDurationDays, 10) || 0) - (parseInt(subModalDaysClaimed, 10) || 0))} দিন
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({((Math.max(0, (parseInt(subModalDurationDays, 10) || 0) - (parseInt(subModalDaysClaimed, 10) || 0))) / 30).toFixed(1)} মাস)
                  </span>
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubDuration(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubDuration}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSavingSubDuration ? (
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
