import React, { useState, useMemo } from 'react';
import { TaskItem, TaskSubmission } from '../App';

export interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTasks: TaskItem[];
  allTaskSubmissions: TaskSubmission[];
  currentUser: any;
  userBalance: number;
  haptic: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSubmitProof: (task: TaskItem, screenshots: string[], notes: string) => Promise<void>;
  isSubmittingProof: boolean;
}

// Image compression helper for user screenshots
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

// Helper: Smart platform detector for icons & colors
const getTaskPlatformMeta = (task: TaskItem) => {
  const combined = `${task.title} ${task.link} ${task.description}`.toLowerCase();
  if (combined.includes('telegram') || combined.includes('t.me')) {
    return {
      icon: 'fab fa-telegram-plane',
      brandColor: 'text-sky-400',
      bgGlow: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
      tag: 'Telegram'
    };
  }
  if (combined.includes('youtube') || combined.includes('youtu.be')) {
    return {
      icon: 'fab fa-youtube',
      brandColor: 'text-rose-500',
      bgGlow: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      tag: 'YouTube'
    };
  }
  if (combined.includes('facebook') || combined.includes('fb.watch') || combined.includes('fb.com')) {
    return {
      icon: 'fab fa-facebook-f',
      brandColor: 'text-blue-500',
      bgGlow: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      tag: 'Facebook'
    };
  }
  if (combined.includes('instagram') || combined.includes('instagr.am')) {
    return {
      icon: 'fab fa-instagram',
      brandColor: 'text-pink-400',
      bgGlow: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
      tag: 'Instagram'
    };
  }
  if (combined.includes('tiktok')) {
    return {
      icon: 'fab fa-tiktok',
      brandColor: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      tag: 'TikTok'
    };
  }
  if (combined.includes('twitter') || combined.includes('x.com')) {
    return {
      icon: 'fab fa-x-twitter',
      brandColor: 'text-slate-200',
      bgGlow: 'bg-slate-700/30 border-slate-500/30 text-slate-200',
      tag: 'Twitter / X'
    };
  }
  if (combined.includes('discord') || combined.includes('discord.gg')) {
    return {
      icon: 'fab fa-discord',
      brandColor: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      tag: 'Discord'
    };
  }
  return {
    icon: task.icon || 'fas fa-tasks',
    brandColor: 'text-amber-400',
    bgGlow: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    tag: 'Special Task'
  };
};

export const TasksModal: React.FC<TasksModalProps> = ({
  isOpen,
  onClose,
  customTasks,
  allTaskSubmissions,
  currentUser,
  userBalance,
  haptic,
  showToast,
  onSubmitProof,
  isSubmittingProof
}) => {
  if (!isOpen) return null;

  // Active Tab:
  // 'available': মেইন পেইজ (যে কাজগুলো এখনো সম্পন্ন হয়নি)
  // 'completed': সম্পূর্ণ (কমপ্লিট হওয়া কাজগুলো এখানে থাকবে)
  // 'history': বিস্তারিত হিস্ট্রি ও এডমিন ফিডব্যাক
  const [activeTab, setActiveTab] = useState<'available' | 'completed' | 'history'>('available');
  const [filterCategory, setFilterCategory] = useState<'all' | 'high_reward'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [proofScreenshots, setProofScreenshots] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Current User Submissions
  const userSubmissions = useMemo(() => {
    return allTaskSubmissions.filter((s) => s.userId === currentUser?.uid);
  }, [allTaskSubmissions, currentUser]);

  const approvedSubmissions = useMemo(() => {
    return userSubmissions.filter((s) => s.status === 'Approved');
  }, [userSubmissions]);

  const totalEarnedFromTasks = useMemo(() => {
    return approvedSubmissions.reduce((sum, s) => sum + (Number(s.reward) || 0), 0);
  }, [approvedSubmissions]);

  const totalAvailableRewardPool = useMemo(() => {
    return customTasks.reduce((sum, t) => sum + (Number(t.reward) || 0), 0);
  }, [customTasks]);

  // Check if a task has been completed by current user (either Approved or Pending review)
  const isTaskCompletedByUser = (taskId: string) => {
    const sub = userSubmissions.find((s) => s.taskId === taskId);
    return Boolean(sub && (sub.status === 'Approved' || sub.status === 'Pending'));
  };

  // Get user's submission for a task
  const getTaskSubmission = (taskId: string) => {
    return userSubmissions.find((s) => s.taskId === taskId);
  };

  // 1. Available Tasks for the MAIN PAGE (Excludes already completed tasks!)
  const availableTasks = useMemo(() => {
    return customTasks.filter((task) => {
      // Rule: Task completed by user goes to "সম্পূর্ণ" and MUST NOT remain on main page!
      const isCompleted = isTaskCompletedByUser(task.id);
      if (isCompleted) {
        return false;
      }

      if (filterCategory === 'high_reward') {
        return task.reward >= 5;
      }
      return true;
    });
  }, [customTasks, userSubmissions, filterCategory]);

  // 2. Completed Tasks List (Tasks completed by the user)
  const completedTasks = useMemo(() => {
    return customTasks
      .map((task) => {
        const sub = getTaskSubmission(task.id);
        return { task, sub };
      })
      .filter(({ sub }) => sub && (sub.status === 'Approved' || sub.status === 'Pending'));
  }, [customTasks, userSubmissions]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (proofScreenshots.length + files.length > 5) {
      showToast('সর্বোচ্চ ৫টি স্ক্রিনশট আপলোড করতে পারবেন!', 'error');
      haptic('error');
      return;
    }

    setIsProcessingImages(true);
    try {
      const promises = Array.from(files).map((f) => compressImage(f));
      const base64List = await Promise.all(promises);
      setProofScreenshots((prev) => [...prev, ...base64List].slice(0, 5));
      showToast(`${base64List.length}টি স্ক্রিনশট যুক্ত হয়েছে`, 'success');
      haptic('light');
    } catch (err) {
      console.error('Error uploading screenshots:', err);
      showToast('ছবি প্রসেস করতে ব্যর্থ হয়েছে', 'error');
      haptic('error');
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const removeScreenshot = (index: number) => {
    setProofScreenshots((prev) => prev.filter((_, i) => i !== index));
    haptic('heavy');
  };

  const handleStartTask = (task: TaskItem) => {
    setSelectedTask(task);
    setProofScreenshots([]);
    setProofNotes('');
    haptic('light');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (proofScreenshots.length === 0 && !proofNotes.trim()) {
      showToast('দয়া করে কাজের স্ক্রিনশট আপলোড করুন অথবা বিস্তারিত তথ্য লিখুন', 'error');
      haptic('error');
      return;
    }

    const taskToSubmit = selectedTask;
    await onSubmitProof(taskToSubmit, proofScreenshots, proofNotes);
    
    // Automatically reset and switch to "completed" so user sees the task in সম্পূর্ণ!
    setSelectedTask(null);
    setProofScreenshots([]);
    setProofNotes('');
    setActiveTab('completed');
    showToast('🎉 টাস্কটি সম্পন্ন হয়েছে এবং "সম্পূর্ণ" ট্যাবে স্থানান্তরিত হয়েছে!', 'success');
    haptic('success');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950 text-xl font-bold flex-shrink-0">
              <i className="fas fa-coins"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                  টাস্ক ও ফ্রি রিওয়ার্ড হাব
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  Earn Cash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                সহজ কাজ সম্পন্ন করুন, স্ক্রিনশট জমা দিন ও সরাসরি ব্যালেন্স জিতে নিন!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
            title="বন্ধ করুন"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Top Earnings & Performance Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-3.5 bg-slate-950/80 border-b border-white/5 text-center flex-shrink-0">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-white/5 flex flex-col justify-center">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">উপলব্ধ টাস্ক পুল</div>
            <div className="text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">
              ৳{totalAvailableRewardPool.toFixed(2)}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900/90 border border-emerald-500/30 flex flex-col justify-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-300 font-medium">টাস্ক থেকে আয়</div>
            <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
              +৳{totalEarnedFromTasks.toFixed(2)}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-white/5 flex flex-col justify-center">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">আপনার ব্যালেন্স</div>
            <div className="text-xs sm:text-sm font-black text-sky-400 font-mono mt-0.5">
              ৳{userBalance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tab Switcher: 
            1. উপলব্ধ টাস্ক (মেইন পেইজ - কেবল বাকি থাকা কাজগুলো)
            2. সম্পূর্ণ (কমপ্লিট হওয়া কাজগুলো)
            3. হিস্ট্রি (সাবমিশনের বিস্তারিত রেকর্ড)
        */}
        {!selectedTask && (
          <div className="p-3 sm:px-5 pb-2 border-b border-white/5 flex flex-col gap-2.5 flex-shrink-0 bg-slate-900/50">
            <div className="flex rounded-2xl bg-slate-950 p-1 border border-white/10 gap-1">
              {/* TAB 1: Main Page (Available Tasks) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('available');
                  haptic('light');
                }}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'available'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-bolt text-xs"></i>
                <span>উপলব্ধ টাস্ক</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'available' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                }`}>
                  {availableTasks.length}
                </span>
              </button>

              {/* TAB 2: Completed Tasks (সম্পূর্ণ) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('completed');
                  haptic('light');
                }}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-check-double text-xs"></i>
                <span>সম্পূর্ণ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'completed' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {completedTasks.length}
                </span>
              </button>

              {/* TAB 3: History */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  haptic('light');
                }}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-history text-xs"></i>
                <span>হিস্ট্রি</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'history' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  {userSubmissions.length}
                </span>
              </button>
            </div>

            {/* Quick Filter Chips (for Available Tasks on Main Page) */}
            {activeTab === 'available' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { key: 'all', label: 'সকল বাকি কাজ', icon: 'fas fa-fire' },
                  { key: 'high_reward', label: 'বেশি রিওয়ার্ড (৳৫+)', icon: 'fas fa-gem' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFilterCategory(f.key as any);
                      haptic('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 flex-shrink-0 ${
                      filterCategory === f.key
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    <i className={`${f.icon} text-[10px]`}></i>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Main Scrollable Content */}
        <div className="overflow-y-auto p-3 sm:p-5 space-y-3 flex-1">

          {/* VIEW 1: MAIN PAGE (AVAILABLE TASKS)
              Rule: Completed tasks are strictly filtered out of this view!
          */}
          {activeTab === 'available' && !selectedTask && (
            <div className="space-y-3">
              {availableTasks.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/20 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">
                      🎉 অভিনন্দন! আপনি সব টাস্ক সম্পন্ন করেছেন!
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      বর্তমানে মেইন পেইজে করার মতো আর কোনো নতুন টাস্ক নেই। আপনার সম্পন্ন করা কাজগুলো দেখতে নিচের বাটনে ক্লিক করে <b>"সম্পূর্ণ"</b> ট্যাবে যান।
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('completed');
                        haptic('light');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 mx-auto"
                    >
                      <i className="fas fa-check-double"></i>
                      <span>সম্পূর্ণ টাস্কের তালিকা দেখুন ({completedTasks.length}টি) ➔</span>
                    </button>
                  </div>
                </div>
              ) : (
                availableTasks.map((task) => {
                  const mySub = getTaskSubmission(task.id);
                  const isRejected = mySub?.status === 'Rejected';

                  const platform = getTaskPlatformMeta(task);
                  const guideImgs = task.guideImages || (task.image ? [task.image] : []);

                  // Limits & Progress
                  const taskLimit = task.limit !== undefined && task.limit > 0 ? task.limit : 100;
                  const realApproved = allTaskSubmissions.filter((s) => s.taskId === task.id && s.status === 'Approved').length;
                  const boost = Number(task.fakeApprovedCount || 0);
                  const totalApproved = realApproved + boost;
                  const remainingSpots = Math.max(0, taskLimit - totalApproved);
                  const isLimitReached = totalApproved >= taskLimit;
                  const progressPercent = Math.min(100, Math.round((totalApproved / taskLimit) * 100));

                  return (
                    <div
                      key={task.id}
                      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-3.5 sm:p-4 group ${
                        isRejected
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : isLimitReached
                          ? 'bg-slate-950/60 border-rose-500/20 opacity-80'
                          : 'bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border-white/10 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5'
                      }`}
                    >
                      {/* Top Accent line */}
                      <div
                        className={`absolute top-0 inset-x-0 h-0.5 ${
                          isRejected
                            ? 'bg-rose-500'
                            : isLimitReached
                            ? 'bg-rose-500/50'
                            : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400'
                        }`}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left Info Column */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Platform / Task Icon Badge */}
                          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center text-xl flex-shrink-0 shadow-inner group-hover:scale-105 transition ${platform.bgGlow}`}>
                            <i className={platform.icon}></i>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                                {platform.tag}
                              </span>
                              {guideImgs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxImage(guideImgs[0])}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1 transition"
                                >
                                  <i className="fas fa-image text-[9px]"></i>
                                  <span>{guideImgs.length}টি নমুনা</span>
                                </button>
                              )}
                              {isRejected && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                  <i className="fas fa-redo text-[9px]"></i>
                                  <span>পূর্বের প্রুফ বাতিল - পুনরায় জমা দিন</span>
                                </span>
                              )}
                            </div>

                            <h4 className="font-extrabold text-sm sm:text-base text-white mt-1 leading-snug tracking-tight">
                              {task.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>

                            {/* Quota Progress Bar */}
                            <div className="mt-2.5 flex items-center gap-3">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLimitReached
                                      ? 'bg-rose-500'
                                      : progressPercent > 80
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap flex-shrink-0">
                                {isLimitReached ? (
                                  <span className="text-rose-400 font-bold">কোটা পূর্ণ</span>
                                ) : (
                                  <span>বাকি {remainingSpots} জন ({totalApproved}/{taskLimit})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Action & Reward Column */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-shrink-0">
                          {/* Reward Tag */}
                          <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs sm:text-sm shadow-sm">
                            <i className="fas fa-coins text-emerald-400 text-xs"></i>
                            <span>+৳{task.reward}</span>
                          </div>

                          {/* Action Button */}
                          <div>
                            {isLimitReached ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-white/5">
                                <i className="fas fa-lock text-xs"></i>
                                <span>কোটা শেষ</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartTask(task)}
                                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition ${
                                  isRejected
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25'
                                }`}
                              >
                                <span>{isRejected ? 'পুনরায় প্রুফ দিন ➔' : 'কাজ করুন ➔'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: TASK EXECUTION & PROOF SUBMISSION */}
          {activeTab === 'available' && selectedTask && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
              {/* Back to List Navigation */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    setProofScreenshots([]);
                    setProofNotes('');
                    haptic('light');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span>মেইন লিস্টে ফিরে যান</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs">
                  <i className="fas fa-coins text-emerald-400"></i>
                  <span>রিওয়ার্ড: +৳{selectedTask.reward}</span>
                </div>
              </div>

              {/* Task Overview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg flex-shrink-0">
                    <i className={getTaskPlatformMeta(selectedTask).icon}></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-white text-sm sm:text-base">{selectedTask.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedTask.description}</p>
                  </div>
                </div>

                {/* Direct Action Link */}
                {selectedTask.link && selectedTask.link !== '#' && (
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-medium">
                      👉 ধাপ ১: টাস্ক লিংকে গিয়ে কাজটি সম্পূর্ণ করুন:
                    </span>
                    <a
                      href={selectedTask.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => haptic('light')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition active:scale-95"
                    >
                      <i className="fas fa-external-link-alt text-[11px]"></i>
                      <span>টাস্ক লিংকে যান ➔</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Guide / Tutorial Screenshots */}
              {(() => {
                const guideImgs = selectedTask.guideImages || (selectedTask.image ? [selectedTask.image] : []);
                if (guideImgs.length === 0) return null;

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <i className="fas fa-images text-amber-400"></i>
                        <span>ধাপ ২: নমুনা গাইড স্ক্রিনশট ({guideImgs.length}টি)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">ক্লিক করে বড় দেখুন 🔍</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {guideImgs.map((imgUrl, idx) => (
                        <div
                          key={`guide-preview-${idx}`}
                          onClick={() => setLightboxImage(imgUrl)}
                          className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-video cursor-pointer hover:border-amber-400 transition"
                        >
                          <img src={imgUrl} alt={`নমুনা ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-amber-300">
                            নমুনা #{idx + 1}
                          </span>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition">
                            <i className="fas fa-search-plus"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Proof Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-extrabold text-white flex items-center gap-1.5">
                    <i className="fas fa-camera text-amber-400"></i>
                    <span>ধাপ ৩: আপনার কাজের স্ক্রিনশট প্রুফ দিন</span>
                  </label>
                  <span className="text-[10px] font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-white/10">
                    {proofScreenshots.length}/5 নির্বাচিত
                  </span>
                </div>

                {/* Upload dropzone */}
                {proofScreenshots.length < 5 && (
                  <label className="flex flex-col items-center justify-center p-4 sm:p-5 border-2 border-dashed border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl cursor-pointer transition text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      disabled={isProcessingImages}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-1 group-hover:scale-110 transition">
                      {isProcessingImages ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-cloud-upload-alt"></i>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {isProcessingImages ? 'ছবি প্রসেস হচ্ছে...' : 'ক্লিক করে স্ক্রিনশট নির্বাচন করুন'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, WEBP ফরম্যাট (সর্বোচ্চ ৫টি ছবি)
                    </span>
                  </label>
                )}

                {/* Proof Thumbnails Grid */}
                {proofScreenshots.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                    {proofScreenshots.map((imgBase64, idx) => (
                      <div
                        key={`user-proof-${idx}`}
                        className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-square"
                      >
                        <img
                          src={imgBase64}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxImage(imgBase64)}
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow hover:bg-rose-500 transition"
                          title="মুছুন"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Proof Notes / ID */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    আপনার ইউজার আইডি / ইউজারনেম / নোট (ঐচ্ছিক):
                  </label>
                  <textarea
                    rows={2}
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="যেমন: Telegram Username (@myusername) বা আপনার ফেসবুক নাম লিখুন..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* Form Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingProof || isProcessingImages}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSubmittingProof ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>প্রুফ জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>প্রুফ জমা দিন ও সম্পূর্ণ করুন (+৳{selectedTask.reward})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: COMPLETED TASKS (সম্পূর্ণ) 
              Rule: Shows all tasks that the user has completed!
          */}
          {activeTab === 'completed' && (
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-3xl bg-slate-950/40 border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mx-auto border border-emerald-500/20">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">এখনো কোনো টাস্ক সম্পূর্ণ করেননি</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      উপলব্ধ টাস্ক সম্পন্ন করে প্রুফ জমা দিলে তা মেইন পেইজ থেকে এখানে "সম্পূর্ণ" তালিকায় চলে আসবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('available');
                      haptic('light');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow hover:scale-105 active:scale-95 transition"
                  >
                    উপলব্ধ টাস্ক দেখুন ➔
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <i className="fas fa-check-double"></i>
                      <span>আপনার সম্পন্নকৃত টাস্ক ({completedTasks.length}টি)</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      মোট আয়: <b className="text-emerald-400 font-black">+৳{totalEarnedFromTasks.toFixed(2)}</b>
                    </span>
                  </div>

                  {completedTasks.map(({ task, sub }) => {
                    const platform = getTaskPlatformMeta(task);
                    const isApproved = sub?.status === 'Approved';
                    const isPending = sub?.status === 'Pending';

                    return (
                      <div
                        key={`completed-${task.id}`}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isApproved
                            ? 'bg-gradient-to-br from-emerald-950/25 via-slate-900 to-slate-900 border-emerald-500/40'
                            : 'bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg flex-shrink-0 ${platform.bgGlow}`}>
                              <i className={platform.icon}></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                                  {platform.tag}
                                </span>
                                {sub?.submittedAt && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(sub.submittedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-white text-sm mt-1">
                                {task.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end flex-shrink-0">
                            {isApproved ? (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                                <i className="fas fa-check-circle"></i>
                                <span>অনুমোদিত</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                                <i className="fas fa-hourglass-half animate-spin"></i>
                                <span>রিভিউ চলছে</span>
                              </span>
                            )}
                            <span className="font-black text-emerald-400 font-mono text-xs sm:text-sm mt-1">
                              +৳{task.reward} রিওয়ার্ড
                            </span>
                          </div>
                        </div>

                        {/* Status detail banner */}
                        <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          isApproved
                            ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-200'
                            : 'bg-amber-950/30 border-amber-500/20 text-amber-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <i className={isApproved ? 'fas fa-shield-alt text-emerald-400' : 'fas fa-clock text-amber-400'}></i>
                            <span>
                              {isApproved
                                ? 'টাস্ক সফলভাবে সম্পন্ন হয়েছে ও ব্যালেন্সে রিওয়ার্ড যোগ হয়েছে!'
                                : 'প্রুফ পর্যালোচনায় আছে। এডমিন অনুমোদনের পর সরাসরি ব্যালেন্সে যোগ হবে।'}
                            </span>
                          </div>
                        </div>

                        {/* Submitted Proof Photos & Notes */}
                        {sub && (
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            {sub.proofText && (
                              <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                                <span className="text-slate-500 font-bold">আপনার নোট / আইডি: </span>
                                <span>{sub.proofText}</span>
                              </div>
                            )}

                            {sub.screenshots && sub.screenshots.length > 0 && (
                              <div>
                                <div className="text-[10px] text-slate-400 mb-1">আপনার জমাকৃত স্ক্রিনশট প্রুফ:</div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                  {sub.screenshots.map((imgUrl, sIdx) => (
                                    <img
                                      key={`comp-proof-${sIdx}`}
                                      src={imgUrl}
                                      alt={`Proof ${sIdx + 1}`}
                                      onClick={() => setLightboxImage(imgUrl)}
                                      className="w-14 h-14 rounded-xl object-cover border border-white/10 cursor-pointer hover:border-emerald-400 transition flex-shrink-0"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: SUBMISSIONS HISTORY (হিস্ট্রি) */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {userSubmissions.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-3xl bg-slate-950/40 border border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl mx-auto mb-3">
                    <i className="fas fa-history"></i>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">এখনো কোনো প্রুফ জমা দেননি</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    টাস্কগুলো সম্পন্ন করে স্ক্রিনশট জমা দিন এবং সরাসরি আপনার একাউন্ট ব্যালেন্সে টাকা আয় করুন।
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('available')}
                    className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    উপলব্ধ টাস্ক দেখুন ➔
                  </button>
                </div>
              ) : (
                userSubmissions.map((sub) => {
                  const isApproved = sub.status === 'Approved';
                  const isRejected = sub.status === 'Rejected';
                  const isPending = sub.status === 'Pending';

                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                        isApproved
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-slate-950/60 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-white text-xs sm:text-sm">{sub.taskTitle}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'সম্প্রতি'}
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end flex-shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isRejected
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {isApproved ? (
                              <>
                                <i className="fas fa-check-circle"></i>
                                <span>অনুমোদিত</span>
                              </>
                            ) : isRejected ? (
                              <>
                                <i className="fas fa-times-circle"></i>
                                <span>বাতিল</span>
                              </>
                            ) : (
                              <>
                                <i className="fas fa-clock"></i>
                                <span>পর্যালোচনায় আছে</span>
                              </>
                            )}
                          </span>
                          <span className="font-black text-amber-400 font-mono text-xs mt-1">
                            +৳{sub.reward} রিওয়ার্ড
                          </span>
                        </div>
                      </div>

                      {(sub.proofText || sub.notes) && (
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-slate-300">
                          <span className="text-slate-500 font-bold">নোট: </span>
                          <span>{sub.proofText || sub.notes}</span>
                        </div>
                      )}

                      {sub.screenshots && sub.screenshots.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400">জমাকৃত স্ক্রিনশট ({sub.screenshots.length}টি):</div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {sub.screenshots.map((imgUrl, sIdx) => (
                              <img
                                key={`sub-proof-${sIdx}`}
                                src={imgUrl}
                                alt={`Proof ${sIdx + 1}`}
                                onClick={() => setLightboxImage(imgUrl)}
                                className="w-14 h-14 rounded-xl object-cover border border-white/10 cursor-pointer hover:border-amber-400 transition flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {isRejected && sub.adminNote && (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200">
                          <span className="font-bold text-rose-400">এডমিনের মন্তব্য: </span>
                          <span>{sub.adminNote}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal for zooming screenshots */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="বড় ছবি"
              className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center text-sm shadow-xl hover:scale-110 transition"
              title="বন্ধ করুন"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
