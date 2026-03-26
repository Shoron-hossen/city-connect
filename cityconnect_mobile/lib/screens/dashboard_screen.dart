import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _user;
  List<dynamic> _reports = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      // Very basic parsing since we stringified the map simply. It's better to fetch fresh
      try {
        final res = await ApiService.request('/auth/me');
        setState(() {
          _user = res['user'];
        });
        
        final reportsRes = await ApiService.request('/reports');
        setState(() {
          _reports = reportsRes is List ? reportsRes : [];
        });
      } catch (e) {
        // If token invalid, logout
        prefs.remove('token');
        if (mounted) context.go('/login');
      }
    } else {
      if (mounted) context.go('/login');
    }
    setState(() => _loading = false);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    if (mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _user == null) {
      return Scaffold(
        body: Container(
          decoration: CityConnectTheme.gradientBackground,
          child: const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('CityConnect', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'profile') {
                context.push('/profile', extra: _user).then((_) {
                  if (mounted) _loadData();
                });
              } else if (value == 'logout') {
                _logout();
              }
            },
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: Colors.blueAccent,
              backgroundImage: _getProfileImage(_user!['photo_url'] ?? _user!['profile_photo_url']),
              child: (_user!['photo_url'] == null && _user!['profile_photo_url'] == null)
                  ? const Icon(LucideIcons.user, size: 16, color: Colors.white)
                  : null,
            ),
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(
                value: 'profile',
                child: ListTile(
                  leading: Icon(LucideIcons.user),
                  title: Text('Profile Settings'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem<String>(
                value: 'logout',
                child: ListTile(
                  leading: Icon(LucideIcons.logOut, color: Colors.red),
                  title: Text('Logout', style: TextStyle(color: Colors.red)),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.blueAccent,
                      backgroundImage: _getProfileImage(_user!['photo_url'] ?? _user!['profile_photo_url']),
                      child: (_user!['photo_url'] == null && _user!['profile_photo_url'] == null)
                          ? const Icon(LucideIcons.user, size: 30, color: Colors.white)
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Welcome, ${_user!['name']}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                          const Text('Citizen Dashboard', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                const Text('Quick Actions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _ActionCard(
                        icon: LucideIcons.brain,
                        title: 'AI Chat',
                        color: Colors.purple,
                        onTap: () => context.push('/ai-chat'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _ActionCard(
                        icon: LucideIcons.plusCircle,
                        title: 'Report',
                        color: Colors.blue,
                        onTap: () => context.push('/report'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _ActionCard(
                  icon: LucideIcons.alertCircle,
                  title: 'Emergency SOS',
                  color: Colors.red,
                  isFullWidth: true,
                  onTap: () => context.push('/sos'),
                ),
                const SizedBox(height: 40),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Recent Reports', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    if (_reports.isNotEmpty)
                      TextButton(
                        onPressed: () => context.push('/history'),
                        child: const Text('See All', style: TextStyle(color: Colors.blueAccent)),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: _reports.isEmpty
                      ? Center(child: Text('No reports submitted yet.', style: TextStyle(color: Colors.white.withOpacity(0.5))))
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _reports.length > 3 ? 3 : _reports.length,
                          itemBuilder: (context, index) {
                            final report = _reports[index];
                            return Card(
                              color: Colors.white.withOpacity(0.1),
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              child: ListTile(
                                leading: const Icon(LucideIcons.fileText, color: Colors.blueAccent),
                                title: Text(report['title'] ?? 'Report'),
                                subtitle: Text(report['status'] ?? 'pending', style: const TextStyle(color: Colors.grey)),
                                trailing: const Icon(LucideIcons.chevronRight, color: Colors.white54),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  ImageProvider? _getProfileImage(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('data:image')) {
      try {
        final base64String = url.split(',').last;
        return MemoryImage(base64Decode(base64String));
      } catch (e) {
        debugPrint('Error decoding base64 image: $e');
        return null;
      }
    }
    return NetworkImage(url);
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final MaterialColor color;
  final VoidCallback onTap;
  final bool isFullWidth;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.onTap,
    this.isFullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.shade400, color.shade700],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.4),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: isFullWidth
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 32, color: Colors.white),
                  const SizedBox(width: 12),
                  Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              )
            : Column(
                children: [
                  Icon(icon, size: 40, color: Colors.white),
                  const SizedBox(height: 12),
                  Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
      ),
    );
  }
}
