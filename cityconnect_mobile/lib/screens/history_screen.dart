import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme.dart';
import '../api_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _reports = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    try {
      final res = await ApiService.request('/reports');
      if (mounted) {
        setState(() {
          _reports = (res is List) ? res : [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reports', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _reports.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.all(24),
                      itemCount: _reports.length,
                      itemBuilder: (context, index) {
                        final report = _reports[index];
                        return _buildReportCard(report);
                      },
                    ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.fileX, size: 80, color: Colors.white.withOpacity(0.2)),
          const SizedBox(height: 24),
          const Text('No reports yet', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Your reported issues will appear here.', style: TextStyle(color: Colors.white60)),
        ],
      ),
    );
  }

  Widget _buildReportCard(dynamic report) {
    final status = (report['status'] ?? 'pending').toString().toLowerCase();
    Color statusColor;
    IconData statusIcon;

    switch (status) {
      case 'completed':
      case 'done':
        statusColor = Colors.greenAccent;
        statusIcon = LucideIcons.checkCircle;
        break;
      case 'rejected':
      case 'fault':
        statusColor = Colors.redAccent;
        statusIcon = LucideIcons.xCircle;
        break;
      case 'initiated':
      case 'approved':
        statusColor = Colors.blueAccent;
        statusIcon = LucideIcons.clock;
        break;
      default:
        statusColor = Colors.orangeAccent;
        statusIcon = LucideIcons.alertCircle;
    }

    return Card(
      color: Colors.white.withOpacity(0.05),
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      child: InkWell(
        onTap: () => _showReportDetails(report),
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(statusIcon, color: statusColor, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report['title'] ?? 'Untitled Report',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      report['category'] ?? 'General',
                      style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    status.toUpperCase(),
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  const Icon(LucideIcons.chevronRight, size: 16, color: Colors.white30),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReportDetails(dynamic report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReportDetailSheet(report: report),
    );
  }
}

class _ReportDetailSheet extends StatelessWidget {
  final dynamic report;
  const _ReportDetailSheet({required this.report});

  @override
  Widget build(BuildContext context) {
    final status = (report['status'] ?? 'pending').toString().toLowerCase();
    final isRejected = status == 'rejected' || status == 'fault';

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: CityConnectTheme.primaryDark,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 20)],
        ),
        child: SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(report['title'], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text(report['category'], style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
              const SizedBox(height: 32),
              const Text('REPORT TRACKING', style: TextStyle(fontSize: 12, letterSpacing: 1.5, color: Colors.white30, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              _buildStepper(status),
              const SizedBox(height: 32),
              const Text('DESCRIPTION', style: TextStyle(fontSize: 12, letterSpacing: 1.5, color: Colors.white30, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(report['description'], style: const TextStyle(fontSize: 16, height: 1.5)),
              const SizedBox(height: 32),
              if (report['image_url'] != null) ...[
                const Text('EVIDENCE', style: TextStyle(fontSize: 12, letterSpacing: 1.5, color: Colors.white30, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    report['image_url'],
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 100,
                      color: Colors.white.withOpacity(0.05),
                      child: const Center(child: Icon(LucideIcons.image, color: Colors.white30)),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
              if (isRejected) _buildRejectedAlert(context, report),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.blueAccent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blueAccent.withOpacity(0.3)),
      ),
      child: Text(status.toUpperCase(), style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold, fontSize: 12)),
    );
  }

  Widget _buildStepper(String status) {
    final stages = ['pending', 'approved', 'initiated', 'completed'];
    int currentIdx = stages.indexOf(status);
    if (currentIdx == -1 && (status == 'done')) currentIdx = 3;
    if (status == 'rejected' || status == 'fault') currentIdx = -2;

    return Column(
      children: [
        for (int i = 0; i < stages.length; i++) ...[
          _buildStepItem(
            stages[i].toUpperCase(),
            i <= currentIdx,
            i == currentIdx,
            i == stages.length - 1,
          ),
          if (i < stages.length - 1)
            Container(
              margin: const EdgeInsets.only(left: 11),
              height: 20,
              width: 2,
              color: i < currentIdx ? Colors.blueAccent : Colors.white10,
            ),
        ],
      ],
    );
  }

  Widget _buildStepItem(String label, bool isDone, bool isCurrent, bool isLast) {
    return Row(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isDone ? Colors.blueAccent : Colors.transparent,
            shape: BoxShape.circle,
            border: Border.all(color: isDone ? Colors.blueAccent : Colors.white24, width: 2),
            boxShadow: isCurrent ? [BoxShadow(color: Colors.blueAccent.withOpacity(0.4), blurRadius: 8)] : null,
          ),
          child: isDone ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
        ),
        const SizedBox(width: 16),
        Text(
          label,
          style: TextStyle(
            color: isDone ? Colors.white : Colors.white30,
            fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildRejectedAlert(BuildContext context, dynamic report) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.redAccent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.alertCircle, color: Colors.redAccent, size: 20),
              SizedBox(width: 12),
              Text('Report Rejected', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 12),
          const Text('The admin has flagged this report. You can edit the details and resubmit it for review.', style: TextStyle(color: Colors.white70, height: 1.4)),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                context.pop(); // Close sheet
                context.push('/report', extra: report); // Navigate to report with data
              },
              icon: const Icon(LucideIcons.edit3, size: 18),
              label: const Text('Edit & Resend'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            ),
          ),
        ],
      ),
    );
  }
}
