import 'dart:math';
import 'package:flutter/material.dart';
import '../../../../theme/app_theme.dart';
import '../../../../utils/bengali_utils.dart';
import '../../models/zone_status_model.dart';

/// Status Card Widget for Tactical Utility HUD (ADR-0009)
///
/// Implements strict "Never Color Alone" multi-modal specification:
/// - Distinct Color
/// - Dedicated Status Icon
/// - Explicit Bengali Status Label ("আছে", "কম", "নেই", "অনিশ্চিত", "খবর নেই")
/// - Distinct Border Texture (Solid, Dashed, Dotted)
///
/// Golden Rule: `unknown` must NEVER be rendered as green.
class StatusCard extends StatelessWidget {
  final ZoneCategoryStatus status;
  final VoidCallback? onTap;

  const StatusCard({
    super.key,
    required this.status,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final statusTheme = theme.extension<HalchalStatusTheme>() ??
        (isDark ? AppTheme.darkStatusTheme : AppTheme.lightStatusTheme);

    final token = statusTheme.getToken(status.state);

    final categoryDetails = _getCategoryDetails(status.category);
    final isVerified = status.state == HalchalStatusState.ok ||
        status.state == HalchalStatusState.low ||
        status.state == HalchalStatusState.out;

    final reporterText = BengaliUtils.formatReporterCountBn(
      status.distinctReporters,
      isVerified: isVerified,
    );

    final isDashed = status.state == HalchalStatusState.unverified;
    final isDotted = status.state == HalchalStatusState.unknown;

    return Semantics(
      label: '${categoryDetails.titleBn}: ${token.bengaliLabel}, $reporterText',
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: CustomPaint(
            painter: (isDashed || isDotted)
                ? _PatternBorderPainter(
                    color: token.border,
                    radius: 16,
                    isDotted: isDotted,
                  )
                : null,
            child: Container(
              constraints: const BoxConstraints(minHeight: 136),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: (!isDashed && !isDotted)
                    ? Border.all(color: token.border, width: 1.5)
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top Row: Category Icon & Title + Status Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(
                        categoryDetails.icon,
                        color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
                        size: 20,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          categoryDetails.titleBn,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            height: 1.3,
                            color: isDark
                                ? AppTheme.oledTextPrimary
                                : AppTheme.lightTextPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      // Multi-modal Status Badge (Color + Icon + Explicit Bengali Word)
                      _StatusBadge(
                        token: token,
                        state: status.state,
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Middle/Bottom: Reporter Count & Relative Timing
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.people_outline_rounded,
                            size: 14,
                            color: isDark
                                ? AppTheme.oledTextMuted
                                : AppTheme.lightTextMuted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              reporterText,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontSize: 12,
                                height: 1.5,
                                color: isDark
                                    ? AppTheme.oledTextSecondary
                                    : AppTheme.lightTextSecondary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (status.isOptimistic)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'আপনার রিপোর্ট অন্তর্ভুক্ত হয়েছে',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: token.primary,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static _CategoryMeta _getCategoryDetails(String category) {
    switch (category.toLowerCase()) {
      case 'electricity':
        return const _CategoryMeta('বিদ্যুৎ', Icons.bolt_rounded);
      case 'gas':
        return const _CategoryMeta('গ্যাস', Icons.local_fire_department_rounded);
      case 'water':
        return const _CategoryMeta('পানি', Icons.water_drop_rounded);
      case 'lpg':
        return const _CategoryMeta('এলপিজি', Icons.propane_tank_rounded);
      default:
        return const _CategoryMeta('সেবা', Icons.electrical_services_rounded);
    }
  }
}

class _CategoryMeta {
  final String titleBn;
  final IconData icon;
  const _CategoryMeta(this.titleBn, this.icon);
}

/// Multi-Modal Status Badge
class _StatusBadge extends StatelessWidget {
  final StatusToken token;
  final HalchalStatusState state;

  const _StatusBadge({
    required this.token,
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
      decoration: BoxDecoration(
        color: token.tint,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: token.border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            token.icon,
            size: 13,
            color: token.text,
          ),
          const SizedBox(width: 4),
          Text(
            token.bengaliLabel,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: token.text,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom Border Painter for Dashed (unverified) and Dotted (unknown) cards
class _PatternBorderPainter extends CustomPainter {
  final Color color;
  final double radius;
  final bool isDotted;

  _PatternBorderPainter({
    required this.color,
    required this.radius,
    required this.isDotted,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0.75, 0.75, size.width - 1.5, size.height - 1.5),
      Radius.circular(radius),
    );

    final path = Path()..addRRect(rrect);
    final dashLength = isDotted ? 2.0 : 6.0;
    final spaceLength = isDotted ? 4.0 : 4.0;

    for (final metric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final currentDash = min(dashLength, metric.length - distance);
        canvas.drawPath(
          metric.extractPath(distance, distance + currentDash),
          paint,
        );
        distance += currentDash + spaceLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _PatternBorderPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.isDotted != isDotted ||
        oldDelegate.radius != radius;
  }
}
