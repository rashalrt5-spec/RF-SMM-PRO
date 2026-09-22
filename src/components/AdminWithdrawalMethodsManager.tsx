import React, { useState, useEffect } from 'react';
import {
  db,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc
} from '../firebase';
import {
  WithdrawalMethodConfig,
  DEFAULT_WITHDRAWAL_METHODS
} from '../types/vip';

interface AdminWithdrawalMethodsManagerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const AdminWithdrawalMethodsManager: React.FC<AdminWithdrawalMethodsManagerProps> = ({
  showToast,
  haptic = () => {}
}) => {
  const [methods, setMethods] = useState<WithdrawalMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [icon, setIcon] = useState('fa-wallet');
  const [minAmount, setMinAmount] = useState('50');
  const [maxAmount, setMaxAmount] = useState('25000');
  const [chargePercent, setChargePercent] = useState('5');
  const [instructions, setInstructions] = useState('');
  const [accountPlaceholder, setAccountPlaceholder] = useState('01XXXXXXXXX');
  const [accountTypeRequired, setAccountTypeRequired] = useState(false);
  const [colorTheme, setColorTheme] = useState('emerald');
  const [isActive, setIsActive] = useState(true);

  // Uploading & Saving State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Listen to withdrawal_methods collection in Firestore
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
            setMethods(list);
          } else {
            // DB is empty, use defaults
            setMethods(DEFAULT_WITHDRAWAL_METHODS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Withdrawal methods listener warning:', err);
          setMethods(DEFAULT_WITHDRAWAL_METHODS);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn(e);
      setMethods(DEFAULT_WITHDRAWAL_METHODS);
      setLoading(false);
    }
  }, []);

  // Handle Logo File Upload (reads file into base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('লোগো ফাইলের সাইজ ২MB-এর নিচে হতে হবে!', 'error');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setLogoUrl(res);
        haptic('success');
        showToast('✅ নতুন লোগো সফলভাবে লোড হয়েছে!', 'success');
      }
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      showToast('লোগো ফাইল রিড করতে সমস্যা হয়েছে!', 'error');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Open modal for editing existing method
  const handleOpenEdit = (m: WithdrawalMethodConfig) => {
    setEditingMethodId(m.id);
    setName(m.name || '');
    setLogoUrl(m.logoUrl || '');
    setIcon(m.icon || 'fa-wallet');
    setMinAmount(m.minAmount?.toString() || '50');
    setMaxAmount(m.maxAmount?.toString() || '25000');
    setChargePercent((m.chargePercent !== undefined ? m.chargePercent : 5).toString());
    setInstructions(m.instructions || '');
    setAccountPlaceholder(m.accountPlaceholder || '01XXXXXXXXX');
    setAccountTypeRequired(m.accountTypeRequired === true);
    setColorTheme(m.colorTheme || 'emerald');
    setIsActive(m.isActive !== false);
    setIsModalOpen(true);
    haptic('light');
  };

  // Open modal for creating a new method
  const handleOpenAddNew = () => {
    setEditingMethodId(null);
    setName('');
    setLogoUrl('');
    setIcon('fa-wallet');
    setMinAmount('50');
    setMaxAmount('25000');
    setChargePercent('5');
    setInstructions('আপনার ১১ ডিজিটের পার্সোনাল নাম্বার দিন। শুধুমাত্র সেন্ড মানি করা হবে। চার্জ ৫%।');
    setAccountPlaceholder('01XXXXXXXXX');
    setAccountTypeRequired(false);
    setColorTheme('blue');
    setIsActive(true);
    setIsModalOpen(true);
    haptic('light');
  };

  // Save Method to Firestore
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('অনুগ্রহ করে মেথডের নাম লিখুন!', 'error');
      return;
    }

    setIsSaving(true);
    haptic('light');
    try {
      const methodId =
        editingMethodId ||
        name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

      const payload: WithdrawalMethodConfig = {
        id: methodId,
        name: name.trim(),
        logoUrl: logoUrl.trim(),
        icon: icon.trim() || 'fa-wallet',
        minAmount: parseFloat(minAmount) || 50,
        maxAmount: parseFloat(maxAmount) || 25000,
        chargePercent: parseFloat(chargePercent) || 0,
        instructions: instructions.trim(),
        accountPlaceholder: accountPlaceholder.trim() || '01XXXXXXXXX',
        accountTypeRequired,
        colorTheme,
        isActive,
        orderIndex: editingMethodId
          ? methods.find((m) => m.id === editingMethodId)?.orderIndex || 0
          : methods.length + 1
      };

      await setDoc(doc(db, 'withdrawal_methods', methodId), payload, { merge: true });

      haptic('success');
      showToast(
        editingMethodId
          ? `✅ "${name}" মেথড ও লোগো সফলভাবে আপডেট হয়েছে!`
          : `🎉 নতুন উত্তোলন মেথড "${name}" সফলভাবে যুক্ত হয়েছে!`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save withdrawal method error:', err);
      showToast('মেথড সংরক্ষণ করতে ব্যর্থ: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active/Inactive state directly
  const handleToggleActive = async (m: WithdrawalMethodConfig) => {
    haptic('light');
    try {
      const newStatus = !m.isActive;
      await updateDoc(doc(db, 'withdrawal_methods', m.id), { isActive: newStatus });
      showToast(
        `"${m.name}" মেথড এখন ${newStatus ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}!`,
        'info'
      );
    } catch (err: any) {
      // If doc doesn't exist yet, write the whole object
      await setDoc(
        doc(db, 'withdrawal_methods', m.id),
        { ...m, isActive: !m.isActive },
        { merge: true }
      );
      showToast(`"${m.name}" স্ট্যাটাস পরিবর্তন হয়েছে!`, 'info');
    }
  };

  // Delete Custom Method
  const handleDeleteMethod = async (m: WithdrawalMethodConfig) => {
    if (!window.confirm(`আপনি কি সত্যিই "${m.name}" মেথডটি মুছে ফেলতে চান?`)) return;
    haptic('heavy');
    try {
      await deleteDoc(doc(db, 'withdrawal_methods', m.id));
      showToast(`🗑️ "${m.name}" মুছে ফেলা হয়েছে!`, 'success');
    } catch (err: any) {
      showToast('ডিলিট করতে ব্যর্থ: ' + (err.message || 'Error'), 'error');
    }
  };

  // Reset or Seed Defaults to Firestore
  const handleSeedDefaults = async () => {
    if (
      !window.confirm(
        'আপনি কি ডিফল্ট মেথডগুলো (bKash, Nagad, Rocket) ডাটাবেজে রিস্টোর ও সেভ করতে চান?'
      )
    )
      return;

    setIsResetting(true);
    haptic('light');
    try {
      for (const defMethod of DEFAULT_WITHDRAWAL_METHODS) {
        await setDoc(doc(db, 'withdrawal_methods', defMethod.id), defMethod, { merge: true });
      }
      haptic('success');
      showToast('🎉 ডিফল্ট মেথডগুলো সফলভাবে ডাটাবেজে রিস্টোর হয়েছে!', 'success');
    } catch (err: any) {
      console.error('Seed defaults error:', err);
      showToast('রিস্টোর করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-lg shadow-inner">
            <i className="fas fa-wallet"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                উত্তোলন মেথড ও কাস্টম লোগো কন্ট্রোল
              </h3>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                LIVE SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              বিকাশ, নগদ, রকেটসহ যেকোনো উত্তোলন মেথডের লোগো পরিবর্তন, আপলোড ও নতুন মেথড তৈরি করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="ডিফল্ট bKash, Nagad, Rocket রিস্টোর করুন"
          >
            <i className={`fas fa-rotate ${isResetting ? 'animate-spin text-amber-400' : 'text-slate-400'}`}></i>
            <span>{isResetting ? 'রিস্টোর হচ্ছে...' : 'ডিফল্ট রিস্টোর'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddNew}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 font-black text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <i className="fas fa-plus-circle"></i>
            <span>+ নতুন মেথড যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Methods Grid */}
      {loading ? (
        <div className="p-10 text-center text-slate-400 text-xs rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse">
          উত্তোলন মেথড ডাটা লোড হচ্ছে...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {methods.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl p-4 bg-slate-900/90 border transition-all duration-200 flex flex-col justify-between relative overflow-hidden shadow-lg ${
                m.isActive !== false
                  ? 'border-white/10 hover:border-emerald-500/50 hover:shadow-emerald-500/5'
                  : 'border-white/5 opacity-60 bg-black/40'
              }`}
            >
              {/* Method Card Content */}
              <div>
                {/* Top bar: Status badge & Actions */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      m.isActive !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}
                  >
                    {m.isActive !== false ? '● সক্রিয় (Active)' : '○ নিষ্ক্রিয় (Disabled)'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition cursor-pointer ${
                        m.isActive !== false
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      {m.isActive !== false ? 'পজ করুন' : 'চালু করুন'}
                    </button>
                    {['bkash', 'nagad', 'rocket'].indexOf(m.id) === -1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(m)}
                        className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-[10px] border border-red-500/20 transition cursor-pointer"
                        title="মেথড মুছে ফেলুন"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Logo & Method Identity */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center p-2 shrink-0 shadow-inner relative overflow-hidden group">
                    {m.logoUrl ? (
                      <img
                        src={m.logoUrl}
                        alt={m.name}
                        className="w-full h-full object-contain filter drop-shadow"
                      />
                    ) : (
                      <i className={`fas ${m.icon || 'fa-wallet'} text-2xl text-emerald-400`}></i>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-white flex items-center gap-1.5 truncate">
                      <span>{m.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      মিনিমাম: <strong className="text-amber-300 font-bold">৳{m.minAmount}</strong> | চার্জ:{' '}
                      <strong className="text-emerald-400 font-bold">{m.chargePercent || 0}%</strong>
                    </p>
                  </div>
                </div>

                {/* Info Pills */}
                <div className="space-y-1.5 text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/5 mb-3 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">উত্তোলন সীমা:</span>
                    <span className="font-mono text-white">
                      ৳{m.minAmount} – ৳{m.maxAmount || 25000}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">অ্যাকাউন্ট টাইপ:</span>
                    <span className="text-amber-300 font-bold">
                      {m.accountTypeRequired ? 'Personal / Agent' : 'General'}
                    </span>
                  </div>
                  {m.instructions && (
                    <div className="pt-1 text-[10px] text-slate-400 border-t border-white/5 line-clamp-2">
                      💡 {m.instructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action */}
              <button
                type="button"
                onClick={() => handleOpenEdit(m)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <i className="fas fa-pen-to-square text-amber-400"></i>
                <span>লোগো ও সেটিংস এডিট করুন</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm">
                  <i className="fas fa-pen-nib"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingMethodId ? 'উত্তোলন মেথড ও লোগো এডিট' : 'নতুন উত্তোলন মেথড যোগ করুন'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    ইউজার প্যানেলে প্রদর্শিত লোগো, লিমিট ও নির্দেশনা কনফিগার করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveMethod} className="space-y-4 text-xs">
              {/* Logo Section with Live Preview */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <i className="fas fa-image text-emerald-400"></i>
                    <span>মেথড লোগো (Logo Image):</span>
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[10px] text-red-400 hover:underline font-bold"
                    >
                      রিমুভ করুন
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Live Preview Square */}
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-emerald-400/40 flex items-center justify-center p-2.5 shrink-0 shadow-lg relative overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <i className={`fas ${icon || 'fa-wallet'} text-2xl text-slate-500`}></i>
                    )}
                  </div>

                  {/* Upload from device & URL option */}
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition cursor-pointer">
                      <i className={`fas ${isUploadingLogo ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                      <span>{isUploadingLogo ? 'আপলোড হচ্ছে...' : 'ডিভাইস থেকে লোগো আপলোড'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      সুপারিশ: PNG/WebP স্বচ্ছ ব্যাকগ্রাউন্ড ইমেজ (Max 2MB)
                    </p>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    অথবা সরাসরি লোগো ইমেজ লিঙ্ক (URL) পেস্ট করুন:
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="input-modern py-1.5 text-xs font-mono w-full"
                  />
                </div>
              </div>

              {/* Method Name & Theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">মেথডের নাম:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. bKash, Nagad, Rocket, Upay"
                    className="input-modern py-1.5 text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">বিকল্প আইকন (Fallback):</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="input-modern py-1.5 text-xs w-full bg-slate-900"
                  >
                    <option value="fa-wallet">Wallet (fa-wallet)</option>
                    <option value="fa-money-bill-transfer">Transfer (fa-money-bill-transfer)</option>
                    <option value="fa-paper-plane">Paper Plane (fa-paper-plane)</option>
                    <option value="fa-building-columns">Bank (fa-building-columns)</option>
                    <option value="fa-coins">Crypto / Coins (fa-coins)</option>
                  </select>
                </div>
              </div>

              {/* Limits & Fees */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">মিনিমাম (৳):</label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="input-modern py-1.5 text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">ম্যাক্সিমাম (৳):</label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="input-modern py-1.5 text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">চার্জ ফি (%):</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={chargePercent}
                    onChange={(e) => setChargePercent(e.target.value)}
                    className="input-modern py-1.5 text-xs font-mono w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Instructions & Placeholder */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  ইউজারের জন্য বিশেষ নির্দেশনা:
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="যেমন: আপনার পার্সোনাল বিকাশ নাম্বার লিখুন। ১-১২ ঘণ্টার মধ্যে পেমেন্ট সম্পন্ন হবে।"
                  className="input-modern py-1.5 text-xs w-full"
                />
              </div>

              {/* Account Type & Status Toggles */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accountTypeRequired}
                    onChange={(e) => setAccountTypeRequired(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300 font-bold text-xs">
                    Personal / Agent সিলেকশন অপশন দেখান
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-400 font-black text-xs">
                    মেথডটি চালু (Active) রাখুন
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
