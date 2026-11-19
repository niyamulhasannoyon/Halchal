import 'package:flutter/material.dart';
import '../../models/zone_status_model.dart';
import 'status_card.dart';

/// 2x2 Grid Layout for Utility Status Cards
class StatusCardGrid extends StatelessWidget {
  final List<ZoneCategoryStatus> statuses;
  final ValueChanged<ZoneCategoryStatus>? onCardTap;

  const StatusCardGrid({
    super.key,
    required this.statuses,
    this.onCardTap,
  });

  @override
  Widget build(BuildContext context) {
    if (statuses.isEmpty) {
      return const SizedBox.shrink();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        // If width > 320, use 2-column grid; otherwise single column
        final crossAxisCount = constraints.maxWidth > 320 ? 2 : 1;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: crossAxisCount == 2 ? 1.25 : 2.2,
          ),
          itemCount: statuses.length,
          itemBuilder: (context, index) {
            final item = statuses[index];
            return StatusCard(
              status: item,
              onTap: () => onCardTap?.call(item),
            );
          },
        );
      },
    );
  }
}
