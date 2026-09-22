import React from 'react';

interface MailItem {
  id: string;
  sender: string;
  subject: string;
  message: string;
  time: string;
  unread: boolean;
  isAdminReply?: boolean;
}

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailList: MailItem[];
  onSendMail: () => void;
  mailSubject: string;
  setMailSubject: (val: string) => void;
  mailMessage: string;
  setMailMessage: (val: string) => void;
  mailSubmitting: boolean;
  mailboxTab: 'inbox' | 'compose';
  setMailboxTab: (val: 'inbox' | 'compose') => void;
  onMarkRead: (id: string) => void;
  haptic?: (type?: 'light' | 'heavy' | 'success' | 'error') => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  isOpen,
  onClose,
  mailList,
  onSendMail,
  mailSubject,
  setMailSubject,
  mailMessage,
  setMailMessage,
  mailSubmitting,
  mailboxTab,
  setMailboxTab,
  onMarkRead,
  haptic = (_type?: any) => {},
}) => {
  if (!isOpen) return null;

  const unreadCount = mailList.filter((m) => m.unread).length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-emerald-500/10 text-white space-y-4 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white text-lg">
              <i className="fas fa-envelope"></i>
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>মেইল বক্স ও সাপোর্ট</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {unreadCount} নতুন
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">অ্যাডমিন সাপোর্ট মেসেজ ও কাস্টমার সার্ভিস</p>
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

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setMailboxTab('inbox');
              haptic('light');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mailboxTab === 'inbox'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-inbox text-xs"></i>
            <span>ইনবক্স ({mailList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMailboxTab('compose');
              haptic('light');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mailboxTab === 'compose'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-paper-plane text-xs"></i>
            <span>নতুন মেসেজ পাঠান</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1 min-h-[260px]">
          {mailboxTab === 'inbox' && (
            <div className="space-y-2.5">
              {mailList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs space-y-3">
                  <i className="fas fa-envelope-open text-3xl opacity-30 block mb-1"></i>
                  <p>ইনবক্সে কোনো বার্তা নেই।</p>
                  <button
                    type="button"
                    onClick={() => setMailboxTab('compose')}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    সাপোর্টে মেসেজ পাঠান ✍️
                  </button>
                </div>
              ) : (
                mailList.map((mail) => (
                  <div
                    key={mail.id}
                    onClick={() => {
                      if (mail.unread) onMarkRead(mail.id);
                    }}
                    className={`p-3.5 rounded-2xl border transition space-y-2 cursor-pointer ${
                      mail.unread
                        ? 'bg-slate-800/90 border-emerald-500/40 hover:border-emerald-400 shadow-md'
                        : 'bg-slate-800/50 border-white/5 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{mail.sender}</span>
                        {mail.isAdminReply && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                            Support Team ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{mail.time}</span>
                    </div>

                    <div className="font-semibold text-xs text-emerald-300">{mail.subject}</div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{mail.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {mailboxTab === 'compose' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <i className="fas fa-headset text-sm flex-shrink-0"></i>
                <span>সরাসরি অ্যাডমিন সাপোর্ট টিমের কাছে আপনার প্রশ্ন বা রিকোয়েস্ট পাঠান।</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বিষয় (Subject)</label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="যেমন: অর্ডার প্রবলেম / পেমেন্ট ইস্যু / কাস্টম সার্ভিস"
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বার্তা (Message)</label>
                <textarea
                  rows={4}
                  value={mailMessage}
                  onChange={(e) => setMailMessage(e.target.value)}
                  placeholder="আপনার সমস্যা বিস্তারিত লিখুন (অর্ডার আইডি বা ট্রানজেকশন আইডি সহ)..."
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <button
                type="button"
                disabled={mailSubmitting || !mailSubject.trim() || !mailMessage.trim()}
                onClick={() => {
                  onSendMail();
                  haptic('success');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {mailSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>বার্তা পাঠান (Send Message)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
