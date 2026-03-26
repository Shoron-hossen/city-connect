import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _selectedIndex = 0;
  bool _loading = true;
  Map<String, dynamic> _stats = {
    'totalUsers': 0,
    'activeUsers': 0,
    'totalReports': 0,
    'totalReviews': 0,
  };
  List<dynamic> _reports = [];
  List<dynamic> _users = [];
  List<dynamic> _logs = [];

  // AI Analyzer State
  bool _aiAnalyzing = false;
  final Map<int, dynamic> _aiResults = {};

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _loading = true);
    try {
      final statsRes = await ApiService.request('/admin/stats');
      final reportsRes = await ApiService.request('/admin/reports');
      final usersRes = await ApiService.request('/admin/users');
      final logsRes = await ApiService.request('/admin/logs');

      setState(() {
        _stats = statsRes;
        _reports = (reportsRes is List) ? reportsRes : [];
        _users = (usersRes is List) ? usersRes : [];
        _logs = (logsRes is List) ? logsRes : [];
      });
    } catch (e) {
      debugPrint('Admin fetch error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateUserRole(int id, String role, String status) async {
    try {
      await ApiService.request(
        '/admin/users/$id',
        method: 'PUT',
        body: {'role': role, 'status': status},
      );
      _fetchData();
    } catch (e) {
      debugPrint('Failed to update user: $e');
    }
  }

  Future<void> _deleteUser(int id) async {
    try {
      await ApiService.request('/admin/users/$id', method: 'DELETE');
      _fetchData();
    } catch (e) {
      debugPrint('Failed to delete user: $e');
    }
  }

  Future<void> _updateReportStatus(int id, String status) async {
    try {
      await ApiService.request(
        '/admin/reports/$id',
        method: 'PUT',
        body: {'status': status, 'admin_notes': 'Updated via mobile'},
      );
      _fetchData();
    } catch (e) {
      debugPrint('Failed to update report: $e');
    }
  }

  Future<void> _analyzeReport(dynamic report) async {
    setState(() => _aiAnalyzing = true);
    try {
      final prompt =
          """Analyze this city report and determine if it's a "correct" or "fault" (fake/incorrect) report. 
Report Title: ${report['title']}
Category: ${report['category']}
Description: ${report['description']}
Location: ${report['location']}

Return JSON format strictly:
{ "is_correct": boolean, "reasoning": "string", "recommended_action": "police|rescue|cleaner|none" }""";

      final res = await ApiService.request(
        '/gemini/generate',
        method: 'POST',
        body: {'prompt': prompt, 'format': 'json'},
      );

      final analysis = jsonDecode(res['response']);
      setState(() {
        _aiResults[report['id']] = analysis;
      });
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('AI Analysis failed: $e')));
    } finally {
      setState(() => _aiAnalyzing = false);
    }
  }

  Widget _buildStatCard(
    String title,
    dynamic value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const Spacer(),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value.toString(),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOverview() {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _fetchData,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const Text(
                  'Overview',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 24),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 0.9,
                  children: [
                    _buildStatCard(
                      'Total Users',
                      _stats['totalUsers'],
                      LucideIcons.users,
                      Colors.blue,
                    ),
                    _buildStatCard(
                      'Active Users',
                      _stats['activeUsers'],
                      LucideIcons.activity,
                      Colors.green,
                    ),
                    _buildStatCard(
                      'Total Reports',
                      _stats['totalReports'],
                      LucideIcons.fileText,
                      Colors.orange,
                    ),
                    _buildStatCard(
                      'Total Reviews',
                      _stats['totalReviews'],
                      LucideIcons.checkCircle,
                      Colors.purple,
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(LucideIcons.trendingUp, color: Colors.blue),
                          SizedBox(width: 8),
                          Text(
                            'User Growth Analytics',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _buildBarMock(40, 'Jan'),
                          _buildBarMock(70, 'Feb'),
                          _buildBarMock(50, 'Mar'),
                          _buildBarMock(90, 'Apr'),
                          _buildBarMock(120, 'May'),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
  }

  Widget _buildBarMock(double height, String label) {
    return Column(
      children: [
        Container(
          height: height,
          width: 30,
          decoration: BoxDecoration(
            color: Colors.blue,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }

  Widget _buildUsersList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _users.length,
      itemBuilder: (context, i) {
        final u = _users[i];
        final bool isSuperAdmin = u['role'] == 'Super Admin';
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: ExpansionTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue.withOpacity(0.2),
              child: Text(
                u['name'][0].toUpperCase(),
                style: const TextStyle(color: Colors.blue),
              ),
            ),
            title: Text(
              u['name'] ?? 'Unknown',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text('${u['email']}'),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: u['status'] == 'active'
                    ? Colors.green.withOpacity(0.1)
                    : Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                u['status'] ?? 'active',
                style: TextStyle(
                  color: u['status'] == 'active' ? Colors.green : Colors.red,
                  fontSize: 12,
                ),
              ),
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Role:'),
                        DropdownButton<String>(
                          value: u['role'],
                          items: const [
                            DropdownMenuItem(
                              value: 'citizen',
                              child: Text('Citizen'),
                            ),
                            DropdownMenuItem(
                              value: 'admin',
                              child: Text('Admin'),
                            ),
                            DropdownMenuItem(
                              value: 'Super Admin',
                              child: Text('Super Admin'),
                            ),
                          ],
                          onChanged: isSuperAdmin
                              ? null
                              : (v) =>
                                    _updateUserRole(u['id'], v!, u['status']),
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Status:'),
                        DropdownButton<String>(
                          value: u['status'],
                          items: const [
                            DropdownMenuItem(
                              value: 'active',
                              child: Text('Active'),
                            ),
                            DropdownMenuItem(
                              value: 'blocked',
                              child: Text('Blocked'),
                            ),
                          ],
                          onChanged: isSuperAdmin
                              ? null
                              : (v) => _updateUserRole(u['id'], u['role'], v!),
                        ),
                      ],
                    ),
                    if (!isSuperAdmin)
                      TextButton.icon(
                        icon: const Icon(LucideIcons.trash2, color: Colors.red),
                        label: const Text(
                          'Delete User',
                          style: TextStyle(color: Colors.red),
                        ),
                        onPressed: () => _deleteUser(u['id']),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReportsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _reports.length,
      itemBuilder: (context, i) {
        final r = _reports[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: ExpansionTile(
            leading: const Icon(LucideIcons.fileText, color: Colors.orange),
            title: Text(
              r['title'] ?? 'Report',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text('${r['category']} • ${r['location']}'),
            trailing: Text(
              r['status'] ?? 'pending',
              style: const TextStyle(color: Colors.blue),
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text('Citizen: ${r['user_name']}'),
                    const SizedBox(height: 8),
                    Text(r['description']),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Update Status:'),
                        DropdownButton<String>(
                          value: r['status'],
                          items: const [
                            DropdownMenuItem(
                              value: 'pending',
                              child: Text('Pending'),
                            ),
                            DropdownMenuItem(
                              value: 'approved',
                              child: Text('Approved'),
                            ),
                            DropdownMenuItem(
                              value: 'initiated',
                              child: Text('Initiated'),
                            ),
                            DropdownMenuItem(
                              value: 'completed',
                              child: Text('Completed'),
                            ),
                            DropdownMenuItem(
                              value: 'rejected',
                              child: Text('Rejected'),
                            ),
                          ],
                          onChanged: (v) => _updateReportStatus(r['id'], v!),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActivityLogs() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _logs.length,
      itemBuilder: (context, i) {
        final l = _logs[i];
        return ListTile(
          leading: const Icon(LucideIcons.activity, color: Colors.grey),
          title: Text(
            l['action'].replaceAll('_', ' ').toUpperCase(),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          subtitle: Text(l['details']),
          trailing: Text(
            l['created_at'].split('T')[0],
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        );
      },
    );
  }

  Widget _buildAIAnalyzer() {
    final pendingReports = _reports
        .where((r) => r['status'] == 'pending')
        .toList();
    if (pendingReports.isEmpty) {
      return const Center(
        child: Text('No pending reports to analyze. All clear!'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pendingReports.length,
      itemBuilder: (context, i) {
        final r = pendingReports[i];
        final analysis = _aiResults[r['id']];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  r['title'],
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  r['description'],
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 16),
                if (analysis == null)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: _aiAnalyzing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(LucideIcons.brain),
                      label: Text(
                        _aiAnalyzing ? 'Analyzing...' : 'Analyze with AI',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.purple,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: _aiAnalyzing ? null : () => _analyzeReport(r),
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: analysis['is_correct'] == true
                          ? Colors.green.withOpacity(0.1)
                          : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: analysis['is_correct'] == true
                            ? Colors.green
                            : Colors.red,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          analysis['is_correct'] == true
                              ? 'Verified Correct'
                              : 'Fault Report Detected',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: analysis['is_correct'] == true
                                ? Colors.green
                                : Colors.red,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text('Reasoning: ${analysis['reasoning']}'),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            if (analysis['is_correct'] == true)
                              ElevatedButton(
                                onPressed: () =>
                                    _updateReportStatus(r['id'], 'approved'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green,
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Approve'),
                              )
                            else
                              ElevatedButton(
                                onPressed: () =>
                                    _updateReportStatus(r['id'], 'rejected'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Reject'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSettings() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'System Settings',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        SwitchListTile(
          title: const Text('Require 2FA for Admins'),
          subtitle: const Text('Force all admins to use 2FA'),
          value: false,
          onChanged: (v) {},
        ),
        const Divider(),
        ListTile(
          title: const Text('Session Timeout'),
          subtitle: const Text('Regularly log out inactive users'),
          trailing: const Text('1 Hour'),
          onTap: () {},
        ),
        const Divider(),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
          child: const Text(
            'Save Settings',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text(
          'Admin Console',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF00103A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw),
            onPressed: _fetchData,
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF00103A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Color(0xFF000824)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(
                    LucideIcons.shieldAlert,
                    color: Colors.blueAccent,
                    size: 40,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Admin Panel',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            _buildDrawerItem(0, LucideIcons.barChart3, 'Overview'),
            _buildDrawerItem(1, LucideIcons.users, 'User Management'),
            _buildDrawerItem(2, LucideIcons.fileText, 'Reports'),
            _buildDrawerItem(3, LucideIcons.brain, 'AI Analyzer'),
            _buildDrawerItem(4, LucideIcons.activity, 'Activity Logs'),
            _buildDrawerItem(5, LucideIcons.settings, 'Settings'),
            const Divider(color: Colors.white24, height: 32),
            ListTile(
              leading: const Icon(LucideIcons.logOut, color: Colors.redAccent),
              title: const Text(
                'Logout',
                style: TextStyle(color: Colors.redAccent),
              ),
              onTap: () async {
                final prefs = await SharedPreferences.getInstance();
                await prefs.clear();
                if (mounted) context.go('/');
              },
            ),
          ],
        ),
      ),
      body: _selectedIndex == 0
          ? _buildOverview()
          : _selectedIndex == 1
          ? _buildUsersList()
          : _selectedIndex == 2
          ? _buildReportsList()
          : _selectedIndex == 3
          ? _buildAIAnalyzer()
          : _selectedIndex == 4
          ? _buildActivityLogs()
          : _buildSettings(),
    );
  }

  Widget _buildDrawerItem(int index, IconData icon, String title) {
    return ListTile(
      leading: Icon(icon, color: Colors.white70),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      selected: _selectedIndex == index,
      selectedTileColor: Colors.blue.withOpacity(0.2),
      onTap: () {
        setState(() => _selectedIndex = index);
        Navigator.pop(context);
      },
    );
  }
}
