import 'package:flutter/material.dart';

/// Halchal Status Display States
enum HalchalStatusState {
  ok,
  low,
  out,
  unverified,
  unknown,
}

/// Semantic styling for a specific status state
@immutable
class StatusToken {
  final Color primary;
  final Color tint;
  final Color text;
  final Color border;
  final String bengaliLabel;
  final BorderStyle borderStyle;
  final IconData icon;

  const StatusToken({
    required this.primary,
    required this.tint,
    required this.text,
    required this.border,
    required this.bengaliLabel,
    required this.borderStyle,
    required this.icon,
  });

  StatusToken copyWith({
    Color? primary,
    Color? tint,
    Color? text,
    Color? border,
    String? bengaliLabel,
    BorderStyle? borderStyle,
    IconData? icon,
  }) {
    return StatusToken(
      primary: primary ?? this.primary,
      tint: tint ?? this.tint,
      text: text ?? this.text,
      border: border ?? this.border,
      bengaliLabel: bengaliLabel ?? this.bengaliLabel,
      borderStyle: borderStyle ?? this.borderStyle,
      icon: icon ?? this.icon,
    );
  }
}

/// Flutter ThemeExtension for Halchal Status Tokens
class HalchalStatusTheme extends ThemeExtension<HalchalStatusTheme> {
  final StatusToken ok;
  final StatusToken low;
  final StatusToken out;
  final StatusToken unverified;
  final StatusToken unknown;

  const HalchalStatusTheme({
    required this.ok,
    required this.low,
    required this.out,
    required this.unverified,
    required this.unknown,
  });

  StatusToken getToken(HalchalStatusState state) {
    switch (state) {
      case HalchalStatusState.ok:
        return ok;
      case HalchalStatusState.low:
        return low;
      case HalchalStatusState.out:
        return out;
      case HalchalStatusState.unverified:
        return unverified;
      case HalchalStatusState.unknown:
        return unknown;
    }
  }

  @override
  ThemeExtension<HalchalStatusTheme> copyWith({
    StatusToken? ok,
    StatusToken? low,
    StatusToken? out,
    StatusToken? unverified,
    StatusToken? unknown,
  }) {
    return HalchalStatusTheme(
      ok: ok ?? this.ok,
      low: low ?? this.low,
      out: out ?? this.out,
      unverified: unverified ?? this.unverified,
      unknown: unknown ?? this.unknown,
    );
  }

  @override
  ThemeExtension<HalchalStatusTheme> lerp(
    covariant ThemeExtension<HalchalStatusTheme>? other,
    double t,
  ) {
    if (other is! HalchalStatusTheme) return this;
    return HalchalStatusTheme(
      ok: _lerpToken(ok, other.ok, t),
      low: _lerpToken(low, other.low, t),
      out: _lerpToken(out, other.out, t),
      unverified: _lerpToken(unverified, other.unverified, t),
      unknown: _lerpToken(unknown, other.unknown, t),
    );
  }

  static StatusToken _lerpToken(StatusToken a, StatusToken b, double t) {
    return StatusToken(
      primary: Color.lerp(a.primary, b.primary, t) ?? a.primary,
      tint: Color.lerp(a.tint, b.tint, t) ?? a.tint,
      text: Color.lerp(a.text, b.text, t) ?? a.text,
      border: Color.lerp(a.border, b.border, t) ?? a.border,
      bengaliLabel: t < 0.5 ? a.bengaliLabel : b.bengaliLabel,
      borderStyle: t < 0.5 ? a.borderStyle : b.borderStyle,
      icon: t < 0.5 ? a.icon : b.icon,
    );
  }
}

/// Halchal Design System Theme Factory
class AppTheme {
  // Common Font Family (Bengali-first with vertical clearance)
  static const String bengaliFontFamily = 'Hind Siliguri';

  // --- Dark OLED Tokens (Tactical HUD for Blackout & Battery Conservation) ---
  static const Color oledCanvas = Color(0xFF070A0F);
  static const Color oledSurface = Color(0xFF111622);
  static const Color oledSurfaceElevated = Color(0xFF182030);
  static const Color oledBorder = Color(0xFF1E293B);
  static const Color oledTextPrimary = Color(0xFFF8FAFC);
  static const Color oledTextSecondary = Color(0xFF94A3B8);
  static const Color oledTextMuted = Color(0xFF64748B);

  // --- Light High-Contrast Tokens (Dhaka Sunlight Optimization for Cheap LCDs) ---
  static const Color lightCanvas = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceElevated = Color(0xFFF1F5F9);
  static const Color lightBorder = Color(0xFFCBD5E1);
  static const Color lightBorderStrong = Color(0xFF94A3B8);
  static const Color lightTextPrimary = Color(0xFF070A0F);
  static const Color lightTextSecondary = Color(0xFF334155);
  static const Color lightTextMuted = Color(0xFF475569);

  /// Status Tokens for Dark OLED Theme
  static const HalchalStatusTheme darkStatusTheme = HalchalStatusTheme(
    ok: StatusToken(
      primary: Color(0xFF10B981),
      tint: Color(0x2910B981),
      text: Color(0xFF6EE7B7),
      border: Color(0x7310B981),
      bengaliLabel: 'আছে',
      borderStyle: BorderStyle.solid,
      icon: Icons.check_circle,
    ),
    low: StatusToken(
      primary: Color(0xFFF59E0B),
      tint: Color(0x29F59E0B),
      text: Color(0xFFFCD34D),
      border: Color(0x73F59E0B),
      bengaliLabel: 'কম',
      borderStyle: BorderStyle.solid,
      icon: Icons.warning_amber_rounded,
    ),
    out: StatusToken(
      primary: Color(0xFFEF4444),
      tint: Color(0x2EEF4444),
      text: Color(0xFFFCA5A5),
      border: Color(0x73EF4444),
      bengaliLabel: 'নেই',
      borderStyle: BorderStyle.solid,
      icon: Icons.cancel_outlined,
    ),
    unverified: StatusToken(
      primary: Color(0xFF94A3B8),
      tint: Color(0x2464748B),
      text: Color(0xFFCBD5E1),
      border: Color(0x6694A3B8),
      bengaliLabel: 'অনিশ্চিত',
      borderStyle: BorderStyle.none, // rendered as dashed in custom border painter
      icon: Icons.help_outline_rounded,
    ),
    unknown: StatusToken(
      primary: Color(0xFF64748B),
      tint: Color(0x991E293B),
      text: Color(0xFF94A3B8),
      border: Color(0xFF334155),
      bengaliLabel: 'খবর নেই',
      borderStyle: BorderStyle.none, // rendered as dotted in custom border painter
      icon: Icons.radio_button_unchecked,
    ),
  );

  /// Status Tokens for Light Theme (WCAG >= 4.5:1 verified for bright Dhaka glare)
  static const HalchalStatusTheme lightStatusTheme = HalchalStatusTheme(
    ok: StatusToken(
      primary: Color(0xFF047857),
      tint: Color(0xFFECFDF5),
      text: Color(0xFF065F46),
      border: Color(0xFF6EE7B7),
      bengaliLabel: 'আছে',
      borderStyle: BorderStyle.solid,
      icon: Icons.check_circle,
    ),
    low: StatusToken(
      primary: Color(0xFFB45309),
      tint: Color(0xFFFFFBEB),
      text: Color(0xFF92400E),
      border: Color(0xFFFCD34D),
      bengaliLabel: 'কম',
      borderStyle: BorderStyle.solid,
      icon: Icons.warning_amber_rounded,
    ),
    out: StatusToken(
      primary: Color(0xFFB91C1C),
      tint: Color(0xFFFEF2F2),
      text: Color(0xFF991B1B),
      border: Color(0xFFFCA5A5),
      bengaliLabel: 'নেই',
      borderStyle: BorderStyle.solid,
      icon: Icons.cancel_outlined,
    ),
    unverified: StatusToken(
      primary: Color(0xFF475569),
      tint: Color(0xFFF1F5F9),
      text: Color(0xFF1E293B),
      border: Color(0xFF94A3B8),
      bengaliLabel: 'অনিশ্চিত',
      borderStyle: BorderStyle.none,
      icon: Icons.help_outline_rounded,
    ),
    unknown: StatusToken(
      primary: Color(0xFF475569),
      tint: Color(0xFFE2E8F0),
      text: Color(0xFF334155),
      border: Color(0xFF94A3B8),
      bengaliLabel: 'খবর নেই',
      borderStyle: BorderStyle.none,
      icon: Icons.radio_button_unchecked,
    ),
  );

  /// Dark OLED ThemeData
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      fontFamily: bengaliFontFamily,
      scaffoldBackgroundColor: oledCanvas,
      canvasColor: oledCanvas,
      cardColor: oledSurface,
      dividerColor: oledBorder,
      colorScheme: const ColorScheme.dark(
        surface: oledSurface,
        primary: Color(0xFF10B981),
        onPrimary: Color(0xFF070A0F),
        onSurface: oledTextPrimary,
        outline: oledBorder,
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          height: 1.4,
          color: oledTextPrimary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          height: 1.65, // Mandatory 1.6+ for Bengali conjunct protection
          color: oledTextPrimary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          height: 1.6,
          color: oledTextSecondary,
        ),
        labelLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          height: 1.5,
          color: oledTextPrimary,
        ),
      ),
      extensions: const [darkStatusTheme],
    );
  }

  /// High-Contrast Light ThemeData
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      fontFamily: bengaliFontFamily,
      scaffoldBackgroundColor: lightCanvas,
      canvasColor: lightCanvas,
      cardColor: lightSurface,
      dividerColor: lightBorder,
      colorScheme: const ColorScheme.light(
        surface: lightSurface,
        primary: Color(0xFF047857),
        onPrimary: Colors.white,
        onSurface: lightTextPrimary,
        outline: lightBorder,
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          height: 1.4,
          color: lightTextPrimary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          height: 1.65,
          color: lightTextPrimary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          height: 1.6,
          color: lightTextSecondary,
        ),
        labelLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          height: 1.5,
          color: Colors.white,
        ),
      ),
      extensions: const [lightStatusTheme],
    );
  }
}
