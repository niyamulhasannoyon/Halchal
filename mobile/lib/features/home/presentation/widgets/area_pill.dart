import 'package:flutter/material.dart';
import '../../../../theme/app_theme.dart';
import '../../../../utils/bengali_utils.dart';

/// Glanceable Sticky Area Pill Widget (ADR-0009 Thumb-Zone Hierarchy)
class AreaPill extends StatelessWidget {
  final String areaNameBn;
  final String? ward;
  final DateTime updatedAt;
  final VoidCallback? onTap;

  const AreaPill({
    super.key,
    required this.areaNameBn,
    this.ward,
    required this.updatedAt,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final relativeTime = BengaliUtils.formatRelativeTimeBn(updatedAt);

    final title = ward != null && ward!.isNotEmpty
        ? '$areaNameBn ($ward)'
        : areaNameBn;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.location_on_rounded,
                color: Color(0xFFEF4444),
                size: 16,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontSize: 14,
                    color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                'লাইভ • $relativeTime',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontSize: 12,
                  color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
