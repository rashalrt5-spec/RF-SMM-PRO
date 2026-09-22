export interface VIPPackage {
  id: string;
  name: string;
  price: number;
  dailyReturnPercent: number; // admin configured daily percentage (e.g. 5, 8, 10, 15)
  durationDays: number; // admin configured duration in days (e.g. 7, 15, 30, 60)
  logoUrl?: string; // Custom logo image URL or uploaded base64 data URL
  bannerUrl?: string; // Direct horizontal banner image URL or uploaded base64 data URL
  icon?: string; // FontAwesome icon class or emoji (e.g. 'crown', 'gem', 'shield-halved', 'bolt')
  badge?: string;
  description?: string;
  features?: string[];
  colorTheme?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose';
  isActive: boolean;
  buyersCount?: number; // total number of users who bought this package
  baseBuyersCount?: number;
  createdAt?: string;
}

export interface UserVIPSubscription {
  id: string;
  uid: string;
  userName?: string;
  userEmail?: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  packageLogoUrl?: string;
  packageBannerUrl?: string;
  packageIcon?: string;
  dailyReturnPercent: number;
  dailyReturnAmount: number;
  durationDays: number;
  daysClaimed: number;
  totalEarned: number;
  purchasedAt: string;
  purchasedTimestamp: number;
  lastClaimedAt?: string;
  lastClaimedTimestamp?: number;
  lastAutoCreditAt?: string;
  lastAutoCreditTimestamp?: number;
  status: 'Active' | 'Completed' | 'Expired';
}

export interface WithdrawalMethodConfig {
  id: string;
  name: string;
  logoUrl?: string; // custom logo url or uploaded base64 data url from admin panel
  icon?: string; // FontAwesome fallback
  colorTheme?: 'pink' | 'orange' | 'purple' | 'emerald' | 'blue' | 'yellow' | string;
  gradient?: string;
  minAmount: number;
  maxAmount?: number;
  chargePercent?: number; // e.g. 0%
  instructions?: string;
  accountPlaceholder?: string;
  accountTypeRequired?: boolean;
  orderIndex?: number;
  isActive: boolean;
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  method: string;
  methodId?: string;
  methodLogoUrl?: string;
  accountType: 'Personal' | 'Agent' | string;
  accountNumber: string;
  amount: number;
  chargeAmount?: number;
  finalReceiveAmount?: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  trxId?: string;
  adminNote?: string;
  rejectReason?: string;
  proofScreenshotUrl?: string;
  createdAt: string;
  createdTimestamp: number;
  reviewedAt?: string;
}

export const DEFAULT_WITHDRAWAL_METHODS: WithdrawalMethodConfig[] = [
  {
    id: 'bkash',
    name: 'bKash',
    logoUrl: 'https://freelogopng.com/images/all_img/1656234745bkash-app-logo.png',
    icon: 'fa-wallet',
    colorTheme: 'pink',
    gradient: 'from-pink-600 to-rose-700',
    minAmount: 50,
    maxAmount: 25000,
    chargePercent: 5,
    instructions: 'আপনার ১১ ডিজিট পার্সোনাল বিকাশ নাম্বার দিন। শুধুমাত্র সেন্ড মানি (Send Money) করা হবে। চার্জ ৫%।',
    accountPlaceholder: '01XXXXXXXXX',
    accountTypeRequired: false,
    orderIndex: 1,
    isActive: true,
  },
  {
    id: 'nagad',
    name: 'Nagad',
    logoUrl: 'https://freelogopng.com/images/all_img/1679248787Nagad-Logo.png',
    icon: 'fa-money-bill-transfer',
    colorTheme: 'orange',
    gradient: 'from-orange-600 to-amber-600',
    minAmount: 50,
    maxAmount: 25000,
    chargePercent: 5,
    instructions: 'আপনার ১১ ডিজিট পার্সোনাল নগদ নাম্বার দিন। শুধুমাত্র সেন্ড মানি (Send Money) করা হবে। চার্জ ৫%।',
    accountPlaceholder: '01XXXXXXXXX',
    accountTypeRequired: false,
    orderIndex: 2,
    isActive: true,
  },
  {
    id: 'rocket',
    name: 'Rocket',
    logoUrl: 'https://seeklogo.com/images/D/dutch-bangla-rocket-logo-B4D1CC458D-seeklogo.com.png',
    icon: 'fa-paper-plane',
    colorTheme: 'purple',
    gradient: 'from-purple-600 to-indigo-700',
    minAmount: 50,
    maxAmount: 25000,
    chargePercent: 5,
    instructions: 'রকেটের ১১ ডিজিট পার্সোনাল নাম্বার সঠিকভাবে দিন (১২ ডিজিট প্রযোজ্য নয়)। শুধুমাত্র সেন্ড মানি করা হবে। চার্জ ৫%।',
    accountPlaceholder: '01XXXXXXXXX',
    accountTypeRequired: false,
    orderIndex: 3,
    isActive: true,
  },
];

export const DEFAULT_VIP_PACKAGES: VIPPackage[] = [
  {
    id: 'vip_100',
    name: 'VIP 1 - Bronze Package',
    price: 100,
    dailyReturnPercent: 10,
    durationDays: 30,
    icon: 'fa-shield-halved',
    badge: '🔥 Starter VIP',
    description: 'প্রতিদিন ১০% লাভ (৳১০) হিসেবে ৩০ দিনে মোট ৳৩০০ আয়!',
    features: [
      '১০% দৈনিক অটো প্রফিট (৳১০/দিন)',
      'মেয়াদ: ৩০ দিন',
      'মোট রিটার্ন: ৳৩০০ (৩০০%)',
      'প্রতি ২৪ ঘণ্টায় অটোমেটিক ব্যালেন্স ক্রেডিট',
      'ইনস্ট্যান্ট বিকাশ/নগদ/রকেট ক্যাশআউট'
    ],
    colorTheme: 'amber',
    buyersCount: 42,
    isActive: true
  },
  {
    id: 'vip_200',
    name: 'VIP 2 - Silver Package',
    price: 200,
    dailyReturnPercent: 10,
    durationDays: 30,
    icon: 'fa-medal',
    badge: '⭐ Popular VIP',
    description: 'প্রতিদিন ১০% লাভ (৳২০) হিসেবে ৩০ দিনে মোট ৳৬০০ আয়!',
    features: [
      '১০% দৈনিক অটো প্রফিট (৳২০/দিন)',
      'মেয়াদ: ৩০ দিন',
      'মোট রিটার্ন: ৳৬০০ (৩০০%)',
      'প্রতি ২৪ ঘণ্টায় অটোমেটিক ব্যালেন্স ক্রেডিট',
      'প্রাইওরিটি দ্রুত ক্যাশআউট'
    ],
    colorTheme: 'blue',
    buyersCount: 78,
    isActive: true
  },
  {
    id: 'vip_300',
    name: 'VIP 3 - Gold Package',
    price: 300,
    dailyReturnPercent: 10,
    durationDays: 30,
    icon: 'fa-gem',
    badge: '💎 High Return',
    description: 'প্রতিদিন ১০% লাভ (৳৩০) হিসেবে ৩০ দিনে মোট ৳৯০০ আয়!',
    features: [
      '১০% দৈনিক অটো প্রফিট (৳৩০/দিন)',
      'মেয়াদ: ৩০ দিন',
      'মোট রিটার্ন: ৳৯০০ (৩০০%)',
      'প্রতি ২৪ ঘণ্টায় অটোমেটিক ব্যালেন্স ক্রেডিট',
      'ভিআইপি প্রায়োরিটি সাপোর্ট'
    ],
    colorTheme: 'purple',
    buyersCount: 35,
    isActive: true
  },
  {
    id: 'vip_400',
    name: 'VIP 4 - Platinum Package',
    price: 400,
    dailyReturnPercent: 10,
    durationDays: 30,
    icon: 'fa-crown',
    badge: '👑 Master VIP',
    description: 'প্রতিদিন ১০% লাভ (৳৪০) হিসেবে ৩০ দিনে মোট ৳১,২০০ আয়!',
    features: [
      '১০% দৈনিক অটো প্রফিট (৳৪০/দিন)',
      'মেয়াদ: ৩০ দিন',
      'মোট রিটার্ন: ৳১,২০০ (৩০০%)',
      'প্রতি ২৪ ঘণ্টায় অটোমেটিক ব্যালেন্স ক্রেডিট',
      'ভিআইপি ম্যানেজার ও সুপারফাস্ট ক্যাশআউট'
    ],
    colorTheme: 'rose',
    buyersCount: 19,
    isActive: true
  }
];
