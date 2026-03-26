import 'package:flutter/material.dart';

class CityConnectTheme {
  static const Color primaryDark = Color(0xFF00103A); // bg-[#00103a]
  static const Color primaryMid = Color(0xFF1A0B3C); // via-[#1a0b3c]
  static const Color primaryAccent = Color(0xFF600050); // to-[#600050]
  
  static const Color blueAccent = Color(0xFF2563EB); // bg-blue-600
  static const Color redAccent = Color(0xFFDC2626); // bg-red-600
  static const Color textWhite = Colors.white;
  static const Color textGray = Color(0xFF9CA3AF); // text-gray-400

  static final ThemeData themeData = ThemeData(
    primaryColor: primaryDark,
    scaffoldBackgroundColor: primaryDark,
    fontFamily: 'Inter',
    colorScheme: const ColorScheme.dark(
      primary: blueAccent,
      secondary: primaryAccent,
      surface: primaryMid,
      surfaceTint: primaryDark,
      error: redAccent,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Colors.white,
      errorContainer: Colors.redAccent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: blueAccent,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        elevation: 10,
        shadowColor: blueAccent.withOpacity(0.3),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white.withOpacity(0.05),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: blueAccent),
      ),
      labelStyle: const TextStyle(color: textGray, fontSize: 12, letterSpacing: 1.5, fontWeight: FontWeight.bold),
      hintStyle: const TextStyle(color: Colors.grey),
    ),
  );

  static InputDecoration inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: textGray, fontSize: 12, letterSpacing: 1.5, fontWeight: FontWeight.bold),
      prefixIcon: Icon(icon, color: blueAccent, size: 20),
      filled: true,
      fillColor: Colors.white.withOpacity(0.05),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: blueAccent, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Colors.redAccent),
      ),
    );
  }

  static BoxDecoration gradientBackground = const BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [primaryDark, primaryMid, primaryAccent],
    ),
  );
}
