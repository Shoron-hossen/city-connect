import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme.dart';
import '../api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  // Recovery Fields
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _showRecovery = false;
  int _recoveryStep = 0; // 0: enter email, 1: enter code and new pass

  bool _loading = false;
  String _error = '';
  String _message = '';

  Future<void> _handleLogin() async {
    setState(() { _loading = true; _error = ''; _message = ''; });

    try {
      final res = await ApiService.request('/auth/login', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
        'password': _passwordController.text,
        'isAdminLogin': false,
      });

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', res['token']);
      await prefs.setString('user', res['user'].toString());
      
      if (mounted) context.go('/dashboard');
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleForgotPassword() async {
    if (_emailController.text.trim().isEmpty) {
      setState(() => _error = 'Please enter your email address first.');
      return;
    }
    setState(() { _loading = true; _error = ''; _message = ''; });
    try {
      final res = await ApiService.request('/auth/forgot-password', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
      });
      setState(() {
        _recoveryStep = 1;
        _message = 'Recovery code sent! Check your email inbox.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleResetPassword() async {
    if (_codeController.text.isEmpty || _newPasswordController.text.isEmpty) {
      setState(() => _error = 'Please fill all fields.');
      return;
    }
    setState(() { _loading = true; _error = ''; _message = ''; });
    try {
      await ApiService.request('/auth/reset-password', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
        'code': _codeController.text.trim(),
        'newPassword': _newPasswordController.text,
      });
      setState(() {
        _showRecovery = false;
        _recoveryStep = 0;
        _passwordController.clear();
        _message = 'Password reset successfully! You can now log in.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
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
                top: 16, left: 16,
                child: IconButton(icon: const Icon(LucideIcons.arrowLeft, color: Colors.white), onPressed: () => context.pop()),
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
                            color: Colors.blue.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(_showRecovery ? LucideIcons.key : LucideIcons.user, size: 40, color: Colors.blueAccent),
                        ),
                        const SizedBox(height: 24),
                        Text(_showRecovery ? 'Reset Password' : 'Welcome Back', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text(_showRecovery ? 'Recover your CityConnect account' : 'Log in to continue to CityConnect', style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 32),
                        
                        if (_error.isNotEmpty) ...[
                          Text(_error, style: const TextStyle(color: Colors.redAccent)),
                          const SizedBox(height: 16),
                        ],
                        if (_message.isNotEmpty) ...[
                          Text(_message, style: const TextStyle(color: Colors.greenAccent)),
                          const SizedBox(height: 16),
                        ],

                        if (!_showRecovery) ...[
                          // LOGIN FORM
                          TextField(
                            controller: _emailController,
                            decoration: const InputDecoration(labelText: 'EMAIL ADDRESS', hintText: 'citizen@example.com'),
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _passwordController,
                            decoration: const InputDecoration(labelText: 'PASSWORD', hintText: '••••••••'),
                            obscureText: true,
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => setState(() { _showRecovery = true; _error = ''; _message = ''; }),
                              child: const Text('Forgot Password?', style: TextStyle(color: Colors.blueAccent)),
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _loading ? null : _handleLogin,
                              child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Log In', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ] else ...[
                          // RECOVERY FORM
                          TextField(
                            controller: _emailController,
                            decoration: const InputDecoration(labelText: 'EMAIL ADDRESS'),
                            keyboardType: TextInputType.emailAddress,
                            enabled: _recoveryStep == 0,
                          ),
                          const SizedBox(height: 16),
                          if (_recoveryStep == 1) ...[
                            TextField(
                              controller: _codeController,
                              decoration: const InputDecoration(labelText: 'VERIFICATION CODE', hintText: '123456'),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _newPasswordController,
                              decoration: const InputDecoration(labelText: 'NEW PASSWORD'),
                              obscureText: true,
                            ),
                            const SizedBox(height: 32),
                          ],
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _loading ? null : (_recoveryStep == 0 ? _handleForgotPassword : _handleResetPassword),
                              child: _loading ? const CircularProgressIndicator(color: Colors.white) : Text(_recoveryStep == 0 ? 'Send Recovery Code' : 'Reset Password', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () => setState(() { _showRecovery = false; _recoveryStep = 0; _error = ''; _message = ''; }),
                            child: const Text('Back to Log In', style: TextStyle(color: Colors.grey)),
                          ),
                        ],

                        if (!_showRecovery) ...[
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text('Don\'t have an account?', style: TextStyle(color: Colors.grey)),
                              TextButton(
                                onPressed: () => context.go('/signup'),
                                child: const Text('Sign up', style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          )
                        ],
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
