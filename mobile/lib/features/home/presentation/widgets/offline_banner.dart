import 'package:flutter/material.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../utils/bengali_utils.dart';

/// Offline & Pending Queue Status Banner
class OfflineBanner extends StatelessWidget {
  final bool isOnline;
  final int pendingCount;

  const OfflineBanner({
    super.key,
    required this.isOnline,
    required this.pendingCount,
  });

  @override
  Widget build(BuildContext context) {
    if (isOnline && pendingCount == 0) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF451A03), // Deep Amber background
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_rounded,
            color: Color(0xFFFCD34D),
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  !isOnline
                      ? AppStringsBn.offlineStatusIndicator
                      : 'নেটওয়ার্ক ফিরেছে, রিপোর্ট পাঠানো হচ্ছে...',
                  style: const TextStyle(
                    color: Color(0xFFFCD34D),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                Text(
                  pendingCount > 0
                      ? '${BengaliUtils.toBengaliDigits(pendingCount)}টি রিপোর্ট জমা রাখা হয়েছে • ${AppStringsBn.offlineSavedToast}'
                      : AppStringsBn.offlineSavedToast,
                  style: const TextStyle(
                    color: Color(0xFFFEF3C7),
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
