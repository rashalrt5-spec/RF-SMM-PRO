import React from 'react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'order' | 'deposit' | 'system' | 'promo' | string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkRead,
  haptic = (_type?: any) => {},
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order':
        return { icon: 'fas fa-boxes-stacked', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'deposit':
        return { icon: 'fas fa-wallet', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'promo':
        return { icon: 'fas fa-gift', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default:
        return { icon: 'fas fa-bell', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-amber-500/10 text-white space-y-4 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/25 text-slate-950 text-lg">
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>নোটিফিকেশন ও আপডেট</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-red-500 text-white animate-pulse">
                    {unreadCount} নতুন
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">অ্যাকাউন্ট ও সিস্টেমের সাম্প্রতিক বার্তা</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              haptic('light');
            }}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Mark All As Read Bar */}
        {unreadCount > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex-shrink-0">
            <span className="text-amber-300 text-[11px] font-medium">আপনার {unreadCount}টি অপঠিত নোটিফিকেশন আছে</span>
            <button
              type="button"
              onClick={() => {
                onMarkAllRead();
                haptic('success');
              }}
              className="text-[10px] font-black text-white bg-amber-500/30 hover:bg-amber-500/50 px-2.5 py-1 rounded-lg transition"
            >
              সব পঠিত করুন ✓
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[240px]">
          {notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <i className="fas fa-bell-slash text-3xl opacity-30 block mb-1"></i>
              <p>বর্তমানে কোনো নোটিফিকেশন নেই</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const meta = getTypeIcon(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.unread) {
                      onMarkRead(notif.id);
                      haptic('light');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                    notif.unread
                      ? 'bg-slate-800/95 border-amber-500/40 hover:border-amber-400 shadow-md'
                      : 'bg-slate-800/50 border-white/5 hover:border-white/15 opacity-80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${meta.bg}`}>
                    <i className={meta.icon}></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-white text-xs leading-snug">{notif.title}</h4>
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-ping"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                    <div className="text-[9px] text-slate-500 font-mono mt-1.5 flex items-center gap-1">
                      <i className="fas fa-clock text-[8px]"></i>
                      <span>{notif.time}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
