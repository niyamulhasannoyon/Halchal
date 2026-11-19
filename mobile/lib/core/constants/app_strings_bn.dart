/// Centralized Bengali Localization Strings (CLAUDE.md Section 4.6)
///
/// 100% of user-facing UI text, notifications, and numbers must be natively
/// rendered in Bengali. English strings in customer UI components are forbidden.
class AppStringsBn {
  // App Identity
  static const String appName = 'হালচাল';
  static const String appTagline = 'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর';

  // Universal Community Disclaimer (CLAUDE.md Section 1.5)
  static const String communityDisclaimer =
      'নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়';

  // Navigation Items
  static const String navHome = 'হালচাল';
  static const String navMap = 'লাইভ ম্যাপ';
  static const String navHistory = 'ইতিহাস';
  static const String navSettings = 'সেটিংস';

  // Status Display States
  static const String statusOk = 'আছে';
  static const String statusLow = 'কম';
  static const String statusOut = 'নেই';
  static const String statusUnverified = 'অনিশ্চিত';
  static const String statusUnknown = 'খবর নেই';

  // Categories
  static const String categoryElectricity = 'বিদ্যুৎ';
  static const String categoryElectricityColloquial = 'কারেন্ট';
  static const String categoryGas = 'গ্যাস';
  static const String categoryWater = 'পানি';
  static const String categoryLpg = 'এলপিজি';

  // Reporting Flow
  static const String reportButtonLabel = 'আপনার এলাকার হাল জানান';
  static const String reportSheetTitle = 'আজকের অবস্থা জানান';
  static const String reportSheetSubtitle = 'আপনার রিপোর্ট এলাকার প্রতিবেশীদের সাহায্য করবে';
  static const String selectCategory = 'ক্যাটাগরি নির্বাচন করুন';
  static const String selectState = 'বর্তমান অবস্থা কী?';
  static const String stateOkDesc = 'স্বাভাবিকভাবে সেবা চলছে';
  static const String stateLowDesc = 'ভোল্টেজ বা চাপ কম / বিঘ্নিত';
  static const String stateOutDesc = 'সম্পূর্ণ বিচ্ছিন্ন বা বন্ধ';
  static const String lpgPriceLabel = '১২ কেজি সিলিন্ডারের দাম (টাকা, ঐচ্ছিক)';
  static const String lpgPriceHint = 'যেমন: ১৪৫০';
  static const String submitReport = 'রিপোর্ট জমা দিন';
  static const String submitting = 'যাচাই করা হচ্ছে...';
  static const String reportSuccess = 'আপনার রিপোর্ট সফলভাবে গ্রহণ করা হয়েছে। ধন্যবাদ!';
  static const String reportRateLimited = 'আপনি এইমাত্র রিপোর্ট করেছেন। ১৫ মিনিট পর আবার দিতে পারবেন।';

  // Offline Queue (Prompt Requirement)
  static const String offlineSavedToast = 'অফলাইনে সেভ হয়েছে, নেট এলেই জমা হবে';
  static const String offlineStatusIndicator = 'অফলাইন মোড (ইন্টারনেট নেই)';
  static const String syncPendingReports = 'অপেক্ষমাণ রিপোর্ট জমা হচ্ছে...';

  // Location & Integrity (Prompt Requirement)
  static const String gpsMockWarning = 'সঠিক তথ্যের জন্য ফোনের আসল GPS ব্যবহার করুন।';
  static const String locationAcquiring = 'আপনার এলাকা চিহ্নিত করা হচ্ছে...';
  static const String locationPermissionDenied = 'এলাকা যাচাইয়ের জন্য লোকেশন অনুমতি প্রয়োজন।';
  static const String locationServiceDisabled = 'অনুগ্রহ করে ফোনের জিপিএস / লোকেশন চালু করুন।';
  static const String outOfBoundsError = 'লোকেশন বাংলাদেশের ভৌগোলিক সীমার বাইরে।';
  static const String accuracyPoorWarning = 'জিপিএস নির্ভুলতা ২০০ মিটারের মধ্যে হতে হবে। একটু খোলা জায়গায় আসুন।';
  static const String homeZoneLockNotice = 'আপনি শুধু আপনার নিবন্ধিত এলাকা বা পার্শ্ববর্তী এলাকার হাল জানাতে পারেন (৭ দিনে একবার পরিবর্তনযোগ্য)।';

  // Push Notifications & Interactive Restoration (Prompt Requirement)
  static const String notifRestoredAction = 'হ্যাঁ, ফিরেছে';
  static const String notifNotRestoredAction = 'না, এখনো নেই';
  static const String notifRestoredQuestion = 'আপনার এলাকায় কি বিদ্যুৎ/সেবা ফিরেছে?';
  static const String notifVoteRecordedSuccess = 'বিদ্যুৎ ও সেবা স্বাভাবিক হওয়ার তথ্য সফলভাবে গ্রহণ করা হয়েছে।';
  static const String notifVoteRecordedOut = 'সংযোগ এখনো বিচ্ছিন্ন থাকার তথ্য সফলভাবে গ্রহণ করা হয়েছে।';

  // Battery Optimization Guidance for OEM Phones (Prompt Requirement)
  static const String batteryOptimizationTitle = 'ব্যাকগ্রাউন্ড নোটিফিকেশন সচল রাখুন';
  static const String batteryOptimizationSubtitle =
      'Xiaomi, Samsung, Oppo ও Vivo ফোনে সিস্টেম ব্যাটারি সেভার ব্যাকগ্রাউন্ডে নোটিফিকেশন বন্ধ করে দেয়। জরুরি বিদ্যুৎ বিভ্রাটের খবর পেতে নিচের সেটিংসটি বন্ধ করুন:';
  static const String batteryOptimizationXiaomi =
      'Xiaomi (MIUI/HyperOS): Settings > Apps > Manage Apps > Halchal > Autostart (চালু করুন) এবং Battery Saver > No restrictions নির্বাচন করুন।';
  static const String batteryOptimizationSamsung =
      'Samsung (One UI): Settings > Battery > Background usage limits > Never sleeping apps > Halchal যোগ করুন।';
  static const String batteryOptimizationOppo =
      'Oppo/Realme (ColorOS): Settings > Battery > App Battery Management > Halchal > Allow Background Activity চালু করুন।';
  static const String batteryOptimizationVivo =
      'Vivo (FuntouchOS): Settings > Battery > High background power consumption > Halchal চালু করুন।';
  static const String openBatterySettings = 'ব্যাটারি সেটিংস খুলুন';
  static const String dismiss = 'বুঝেছি';

  // Settings
  static const String settingsNotificationsHeader = 'নোটিফিকেশন পছন্দ';
  static const String settingsNightAlerts = 'রাতের জরুরি অ্যালার্ট (রাত ১১টা - সকাল ৬টা)';
  static const String settingsNightAlertsDesc = 'রাতের বেলা লোডশেডিং বা বিভ্রাটের গুরুত্বপূর্ণ সতর্কবার্তা পান';
  static const String settingsHomeZoneHeader = 'আমার এলাকা (হোম জোন)';
  static const String settingsOemGuidanceHeader = 'ফোন ব্যাটারি অপ্টিমাইজেশন গাইড';
  static const String settingsAboutHeader = 'হালচাল সম্পর্কে';
}
