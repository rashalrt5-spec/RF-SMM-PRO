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

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewingSubscribersPkg, setViewingSubscribersPkg] = useState<VIPPackage | null>(null);

  // VIP Hub General Header Banner state
  const [vipHubBannerUrl, setVipHubBannerUrl] = useState('');
  const [isUploadingHubBanner, setIsUploadingHubBanner] = useState(false);
  const [isSavingHubBanner, setIsSavingHubBanner] = useState(false);

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

  // 3. Listener for VIP Hub Banner settings
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'vip_settings', 'general'),
        (snap) => {
          if (snap.exists()) {
            setVipHubBannerUrl(snap.data().hubBannerUrl || '');
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
    haptic('light');
  };

  // Save / Update Package to Firestore
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(pkgPrice);
    const dailyReturnNum = parseFloat(pkgDailyPercent) || 10;
    const durationNum = parseInt(pkgDuration, 10) || 30;

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
              <label className="font-bold text-slate-300 block mb-1">মেয়াদ (দিন):</label>
              <input
                type="number"
                required
                min={1}
                value={pkgDuration}
                onChange={(e) => setPkgDuration(e.target.value)}
                placeholder="30"
                className="input-modern py-2 text-xs font-mono"
              />
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
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(packageStats[viewingSubscribersPkg.id]?.subscriberList || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  কোনো গ্রাহক পাওয়া যায়নি।
                </div>
              ) : (
                packageStats[viewingSubscribersPkg.id]?.subscriberList.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{sub.userName || 'গ্রাহক'}</span>
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${
                            sub.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        UID: {sub.uid ? sub.uid.slice(0, 12) : 'N/A'}... • ক্রয়:{' '}
                        {sub.purchasedAt || 'N/A'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-emerald-400 font-bold text-xs">
                        +৳{sub.totalEarned || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {sub.daysClaimed || 0}/{sub.durationDays || 30} দিন
                      </span>
                    </div>
                  </div>
                ))
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
    </div>
  );
};
