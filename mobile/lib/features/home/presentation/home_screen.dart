import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../core/providers/core_providers.dart';
import '../../../../theme/app_theme.dart';
import '../providers/home_zone_provider.dart';
import '../providers/offline_queue_provider.dart';
import 'widgets/area_pill.dart';
import 'widgets/community_disclaimer.dart';
import 'widgets/offline_banner.dart';
import 'widgets/quick_report_bottom_sheet.dart';
import 'widgets/status_card_grid.dart';

/// Halchal Main Home Screen (Tactical Utility HUD)
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final zoneStatusAsync = ref.watch(zoneStatusProvider);
    final isOnlineAsync = ref.watch(isOnlineProvider);
    final pendingCount = ref.watch(pendingOfflineCountProvider);
    final isOnline = isOnlineAsync.valueOrNull ?? true;

    // Trigger offline flusher listener
    ref.watch(offlineQueueFlusherProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: [
            Text(
              AppStringsBn.appName,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0x2910B981),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0x7310B981)),
              ),
              child: const Text(
                'LIVE',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF10B981),
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'হালনাগাদ করুন',
            onPressed: () => ref.read(zoneStatusProvider.notifier).refresh(),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(zoneStatusProvider.notifier).refresh(),
          color: const Color(0xFF10B981),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: [
              // Sticky Area Pill
              zoneStatusAsync.when(
                data: (statuses) {
                  final first = statuses.isNotEmpty ? statuses.first : null;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AreaPill(
                      areaNameBn: first?.areaNameBn ?? 'মিরপুর-১০',
                      ward: first?.ward,
                      updatedAt: first?.updatedAt ?? DateTime.now(),
                      onTap: () => ref.read(zoneStatusProvider.notifier).refresh(),
                    ),
                  );
                },
                loading: () => const SizedBox(height: 36),
                error: (_, __) => const SizedBox(height: 36),
              ),

              // Offline Status Banner
              OfflineBanner(
                isOnline: isOnline,
                pendingCount: pendingCount,
              ),

              // Status Cards 2x2 Grid
              zoneStatusAsync.when(
                data: (statuses) => StatusCardGrid(
                  statuses: statuses,
                  onCardTap: (card) {
                    QuickReportBottomSheet.show(
                      context,
                      initialCategory: card.category,
                    );
                  },
                ),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (err, _) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 30),
                  child: Text(
                    'ডাটা লোড হতে সমস্যা হয়েছে: $err',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Community Disclaimer (Mandatory)
              const CommunityDisclaimer(),

              const SizedBox(height: 80), // Padding for bottom persistent button
            ],
          ),
        ),
      ),
      // Bottom Persistent Report Button (Thumb Reach Zone - ADR-0009)
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
          border: Border(
            top: BorderSide(
              color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: SizedBox(
            height: 52,
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => QuickReportBottomSheet.show(context),
              icon: const Icon(Icons.add_location_alt_rounded, size: 20),
              label: const Text(
                AppStringsBn.reportButtonLabel,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.3,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: isDark
                    ? const Color(0xFF10B981)
                    : const Color(0xFF047857),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
