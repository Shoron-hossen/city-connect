import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../api_service.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String _error = '';

  Future<void> _handleLogin() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final res = await ApiService.request('/auth/login', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
        'password': _passwordController.text,
        'isAdminLogin': true,
      });

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', res['token']);
      await prefs.setString('user', res['user'].toString());
      
      if (mounted) {
        // We will just send admins to the dashboard for now since admin dashboard isn't built in flutter,
        // or we alert them it's web-only. Let's send them to dashboard with their admin role.
        context.go('/admin/dashboard');
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 16,
                left: 16,
                child: IconButton(
                  icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
                  onPressed: () => context.pop(),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(40),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.purple.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.shield, size: 40, color: Colors.purpleAccent),
                        ),
                        const SizedBox(height: 24),
                        const Text('Admin Login', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        const Text('Authorized Personnel Only', style: TextStyle(color: Colors.grey)),
                        const SizedBox(height: 32),
                        if (_error.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 24),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.red.withOpacity(0.5)),
                            ),
                            child: Row(
                              children: [
                                const Icon(LucideIcons.alertCircle, color: Colors.redAccent, size: 20),
                                const SizedBox(width: 8),
                                Expanded(child: Text(_error, style: const TextStyle(color: Colors.redAccent))),
                              ],
                            ),
                          ),
                        TextField(
                          controller: _emailController,
                          decoration: const InputDecoration(labelText: 'ADMIN EMAIL', hintText: 'admin@cityconnect.gov'),
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _passwordController,
                          decoration: const InputDecoration(labelText: 'PASSWORD', hintText: '••••••••'),
                          obscureText: true,
                        ),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
                            child: _loading 
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text('Access Control Panel', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
