import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'theme.dart';
import 'screens/landing_screen.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/admin_login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/ai_chat_screen.dart';
import 'screens/report_issue_screen.dart';
import 'screens/sos_screen.dart';
import 'screens/admin_dashboard_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/ai_analyzer_screen.dart';
import 'screens/history_screen.dart';

void main() {
  runApp(const CityConnectApp());
}

class CityConnectApp extends StatelessWidget {
  const CityConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    final GoRouter router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const LandingScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/signup',
          builder: (context, state) => const SignUpScreen(),
        ),
        GoRoute(
          path: '/admin/login',
          builder: (context, state) => const AdminLoginScreen(),
        ),
        GoRoute(
          path: '/admin/dashboard',
          builder: (context, state) => const AdminDashboardScreen(),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/ai-chat',
          builder: (context, state) => const AIChatScreen(),
        ),
        GoRoute(
          path: '/report',
          builder: (context, state) => ReportIssueScreen(initialReport: state.extra as Map<String, dynamic>?),
        ),
        GoRoute(
          path: '/history',
          builder: (context, state) => const HistoryScreen(),
        ),
        GoRoute(
          path: '/sos',
          builder: (context, state) => const SOSScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => ProfileScreen(initialUser: state.extra as Map<String, dynamic>?),
        ),
        GoRoute(
          path: '/ai-analyzer',
          builder: (context, state) {
            final data = state.extra as Map<String, dynamic>;
            return AIAnalyzerScreen(reportData: data);
          },
        ),
      ],
    );

    return MaterialApp.router(
      title: 'CityConnect',
      theme: CityConnectTheme.themeData,
      routerConfig: router,
    );
  }
}
