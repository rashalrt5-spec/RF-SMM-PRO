import React, { useState, useEffect } from 'react';
import { TaskItem } from '../App';

export interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onSave: (updatedTask: Partial<TaskItem>) => Promise<void>;
  haptic: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
  realApprovedCount: number;
}

// Image compression helper
const compressImage = (file: File, maxWidth = 900, maxHeight = 900, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  haptic,
  realApprovedCount
}) => {
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title || '');
  const [desc, setDesc] = useState(task.description || '');
  const [reward, setReward] = useState(String(task.reward ?? 5));
  const [limit, setLimit] = useState(String(task.limit ?? 100));
  const [fakeApproved, setFakeApproved] = useState(String(task.fakeApprovedCount ?? 0));
  const [link, setLink] = useState(task.link || '');
  const [icon, setIcon] = useState(task.icon || 'fas fa-tasks');
  const [images, setImages] = useState<string[]>(task.guideImages || (task.image ? [task.image] : []));
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDesc(task.description || '');
      setReward(String(task.reward ?? 5));
      setLimit(String(task.limit ?? 100));
      setFakeApproved(String(task.fakeApprovedCount ?? 0));
      setLink(task.link || '');
      setIcon(task.icon || 'fas fa-tasks');
      setImages(task.guideImages || (task.image ? [task.image] : []));
    }
  }, [task]);

  const boostVal = Number(fakeApproved || 0);
  const totalDisplayedApproved = realApprovedCount + (boostVal >= 0 ? boostVal : 0);
  const limitVal = Number(limit) || 100;

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const promises = Array.from(files).map((f) => compressImage(f));
      const base64List = await Promise.all(promises);
      setImages((prev) => [...prev, ...base64List].slice(0, 8));
      haptic('light');
    } catch (err) {
      console.error('Error uploading task images:', err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      haptic('error');
      return;
    }
    setIsSaving(true);
    try {
      const rewardParsed = parseFloat(reward) || 5;
      const limitParsed = parseInt(limit, 10);
      const limitClean = !isNaN(limitParsed) && limitParsed > 0 ? limitParsed : 100;
      const fakeParsed = parseInt(fakeApproved, 10);
      const fakeClean = !isNaN(fakeParsed) && fakeParsed >= 0 ? fakeParsed : 0;

      await onSave({
        title: title.trim(),
        description: desc.trim() || 'Complete task & submit screenshot proof',
        reward: rewardParsed,
        limit: limitClean,
        fakeApprovedCount: fakeClean,
        link: link.trim() || '#',
        icon: icon || 'fas fa-tasks',
        image: images[0] || '',
        guideImages: images
      });
      onClose();
    } catch (error) {
      console.error('Error saving task edits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg shadow-inner">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <span>টাস্ক এডিট করুন</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  Edit Task
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">আইডি: {task.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleFormSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* Quick Stats Banner: Real Approved vs Fake/Boost Count */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <i className="fas fa-chart-line text-amber-400"></i>
                <span>অনুমোদিত ইউজার সংখ্যা ক্যালকুলেটর (Approved Count Settings)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                সীমা: {limitVal} জন
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5">
                <div className="text-[10px] text-slate-400">আসল কাজ সম্পন্ন</div>
                <div className="text-sm font-black text-sky-400 font-mono">{realApprovedCount} জন</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-amber-500/30">
                <div className="text-[10px] text-amber-300">অতিরিক্ত / বুস্ট</div>
                <div className="text-sm font-black text-amber-400 font-mono">+{boostVal} জন</div>
              </div>
              <div className="p-2 rounded-xl bg-gradient-to-b from-emerald-950/60 to-slate-900/90 border border-emerald-500/40">
                <div className="text-[10px] text-emerald-300">সাইটে যা দেখাবে</div>
                <div className="text-sm font-black text-emerald-400 font-mono">{totalDisplayedApproved} জন</div>
              </div>
            </div>

            {/* Fake Approved Boost Input */}
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <i className="fas fa-user-plus text-amber-400"></i>
                  <span>দেখানো এপ্রুভ সংখ্যা বৃদ্ধি (Boost / Fake Approved Count):</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {realApprovedCount} + {boostVal} = {totalDisplayedApproved} জন
                </span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">
                    <i className="fas fa-magic"></i>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input-modern pl-8 text-xs font-mono font-bold text-amber-300"
                    placeholder="0"
                    value={fakeApproved}
                    onChange={(e) => setFakeApproved(e.target.value)}
                  />
                </div>
                {/* Quick boost presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[0, 5, 9, 10, 20, 50, 100].map((b) => (
                    <button
                      key={`boost-${b}`}
                      type="button"
                      onClick={() => {
                        setFakeApproved(String(b));
                        haptic('light');
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                        fakeApproved === String(b)
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +{b}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                💡 উদাহরণ: ১ জন কাজ করলে এখানে ৯ বা ১০ লিখলে সাইটে মোট ১০ বা ১১ জন অনুমোদিত দেখাবে।
              </p>
            </div>
          </div>

          {/* Title & Target Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <i className="fas fa-heading text-amber-400 text-[11px]"></i>
                <span>Task Title (টাস্কের নাম)</span>
              </label>
              <input
                type="text"
                required
                className="input-modern text-xs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. YouTube চ্যানেল সাবস্ক্রাইব করুন"
              />
            </div>
            <div>
              <label className="form-label text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <i className="fas fa-link text-cyan-400 text-[11px]"></i>
                <span>Target Link (টাস্ক লিংক)</span>
              </label>
              <input
                type="text"
                className="input-modern text-xs font-mono"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Reward & Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <i className="fas fa-coins text-emerald-400 text-[11px]"></i>
                <span>Reward (রিওয়ার্ড ৳)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">৳</span>
                <input
                  type="number"
                  step="any"
                  className="input-modern pl-7 text-xs font-mono font-bold text-emerald-300"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <i className="fas fa-users text-amber-400 text-[11px]"></i>
                <span>Task Limit (মোট সীমা)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">
                  <i className="fas fa-user-check"></i>
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input-modern pl-8 text-xs font-mono font-bold text-amber-300"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick limit presets */}
          <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 font-bold mr-1">কুইক লিমিট:</span>
            {[20, 50, 100, 200, 500, 1000, 5000].map((lim) => (
              <button
                key={`edit-lim-${lim}`}
                type="button"
                onClick={() => {
                  setLimit(String(lim));
                  haptic('light');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  limit === String(lim)
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lim} জন
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="form-label text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <i className="fas fa-info-circle text-amber-400 text-[11px]"></i>
              <span>Task Description & Instructions (নির্দেশনা)</span>
            </label>
            <textarea
              rows={2}
              className="input-modern text-xs resize-none"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="টাস্ক করার নিয়ম ও বিস্তারিত নির্দেশনা লিখুন..."
            />
          </div>

          {/* Guide Screenshots Upload and Management */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-white flex items-center gap-1.5">
                <i className="fas fa-images text-amber-400"></i>
                <span>Task Guide Screenshots (নমুনা ছবি / ডেমো স্ক্রিনশট)</span>
              </label>
              <span className="text-[10px] font-mono text-amber-300">
                {images.length}/8 টি ছবি
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {images.map((imgUrl, idx) => (
                  <div
                    key={`edit-img-${idx}`}
                    className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-video shadow"
                  >
                    <img
                      src={imgUrl}
                      alt={`নমুনা ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                      onClick={() => setPreviewImage(imgUrl)}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(imgUrl)}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold"
                        title="দেখুন"
                      >
                        <i className="fas fa-search-plus"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold"
                        title="মুছুন"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))}

                {images.length < 8 && (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl transition cursor-pointer text-center aspect-video p-2 group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                      className="hidden"
                    />
                    <i className="fas fa-plus text-amber-400 text-base mb-1"></i>
                    <span className="text-[10px] font-bold text-white">ছবি যোগ করুন</span>
                  </label>
                )}
              </div>
            )}

            {images.length === 0 && (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-500/30 hover:border-amber-400 bg-amber-500/5 rounded-xl transition cursor-pointer text-center group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />
                <i className="fas fa-file-upload text-amber-400 text-xl mb-1"></i>
                <span className="text-xs font-bold text-white">নমুনা ছবি বা স্ক্রিনশট আপলোড করুন</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP সাপোর্ট (সর্বোচ্চ ৮টি)</span>
              </label>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>হালনাগাদ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>সংরক্ষণ ও হালনাগাদ করুন (Save Changes)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img src={previewImage} alt="নমুনা ছবি" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-sm shadow-lg hover:scale-110 transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
