import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Signature Palette from STYLE-OBSERVATIONS.md & CitizenPortal.css
  static const Color ink = Color(0xFF18332D); // Deep forest charcoal
  static const Color muted = Color(0xFF52645D); // Subtle slate-green
  static const Color paper = Color(0xFFF4F2E9); // Warm cream paper
  static const Color paperLight = Color(0xFFFAF9F5); // Ultra-light paper
  static const Color cardBg = Color(0xFFFFFFFF); // Clean white card surface
  static const Color cardSubtle = Color(0xFFEBE8DC); // Inset paper container
  static const Color line = Color(0x2818332D); // 16% opacity ink border
  static const Color lineStrong = Color(0x4018332D); // 25% opacity ink border

  // Accent & Semantic Signals
  static const Color green = Color(0xFF2F7F56); // Land, validation & confidence
  static const Color teal = Color(0xFF348C8B); // Spatial intelligence & active states
  static const Color yellow = Color(0xFFEFC84A); // Signal / CTA highlight
  static const Color terracotta = Color(0xFFC85D49); // Map pin & alerts
  static const Color danger = Color(0xFFB91C1C);

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.dmSansTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: paper,
      primaryColor: ink,
      colorScheme: const ColorScheme.light(
        primary: ink,
        secondary: green,
        tertiary: teal,
        surface: paper,
        error: danger,
        onPrimary: paper,
        onSecondary: Colors.white,
        onSurface: ink,
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.spaceGrotesk(
          fontSize: 32,
          fontWeight: FontWeight.w600,
          color: ink,
          letterSpacing: -0.8,
        ),
        displayMedium: GoogleFonts.spaceGrotesk(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: ink,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.spaceGrotesk(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: ink,
        ),
        titleMedium: GoogleFonts.spaceGrotesk(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: ink,
        ),
        bodyLarge: GoogleFonts.dmSans(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: ink,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.dmSans(
          fontSize: 13,
          fontWeight: FontWeight.w400,
          color: muted,
          height: 1.5,
        ),
        labelSmall: GoogleFonts.dmSans(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: muted,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: paper,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: ink),
        titleTextStyle: GoogleFonts.spaceGrotesk(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: ink,
        ),
        shape: const Border(bottom: BorderSide(color: line, width: 1)),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: const BorderSide(color: line, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x66FFFFFF),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: GoogleFonts.dmSans(color: muted, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: teal, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ink,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
          textStyle: GoogleFonts.dmSans(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: paper,
        selectedItemColor: green,
        unselectedItemColor: muted,
        selectedLabelStyle: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w500),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
