import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme.dart';
import '../api_service.dart';

class AIAnalyzerScreen extends StatefulWidget {
  final Map<String, dynamic> reportData;
  const AIAnalyzerScreen({super.key, required this.reportData});

  @override
  State<AIAnalyzerScreen> createState() => _AIAnalyzerScreenState();
}

class _AIAnalyzerScreenState extends State<AIAnalyzerScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isAnalyzing = true;
  String? _error;
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    _runAnalysis();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _runAnalysis() async {
    final title = widget.reportData['title'];
    final desc = widget.reportData['description'];
    final category = widget.reportData['category'];
    final File? image = widget.reportData['image'];

    String? base64Image;
    String? mimeType;
    if (image != null) {
      final bytes = await image.readAsBytes();
      base64Image = base64.encode(bytes);
      mimeType = 'image/jpeg'; // Assuming JPEG from camera/gallery
    }

    try {
      final prompt = """
        ACT AS A PROFESSIONAL CITY CONNECT REPORT VALIDATOR.
        ANALYZE THIS REPORT:
        TITLE: $title
        DESCRIPTION: $desc
        CATEGORY: $category
        
        TASK:
        1. Determine if this report is a 'FAKE' or 'INTERNET COLLECTED' photo/issue.
        2. If it is likely a fake photo or a generic image from the internet, respond with exactly 'REJECT' on the first line, followed by the reason why.
        3. If it looks like a legitimate citizen-captured photo of a real urban issue, respond with exactly 'PASS' on the first line, followed by detailed professional feedback about the issue and how the city will address it.
        
        RESPONSE FORMAT:
        LINE 1: [PASS or REJECT]
        LINE 2+: [Detailed Feedback or Reason]
      """;

      final response = await ApiService.request('/gemini/generate', method: 'POST', body: {
        'prompt': prompt,
        if (base64Image != null) 'images': [
          {'inlineData': {'mimeType': mimeType, 'data': base64Image}}
        ]
      });

      final fullResponse = response['response'] as String;
      final lines = fullResponse.split('\n');
      final status = lines[0].trim().toUpperCase();
      final feedback = lines.skip(1).join('\n').trim();

      if (status == 'PASS') {
        // Save or Update Database
        final isResubmit = widget.reportData['is_resubmit'] == true;
        final reportId = widget.reportData['original_id'];
        final location = widget.reportData['location'] ?? 'Unknown Location';

        await ApiService.request(
          isResubmit ? '/reports/$reportId' : '/reports',
          method: isResubmit ? 'PUT' : 'POST',
          body: {
            'title': title,
            'description': desc,
            'category': category,
            'location': location,
            'image_url': base64Image != null ? 'data:$mimeType;base64,$base64Image' : null,
            'ai_analysis': feedback,
            if (isResubmit) 'status': 'pending', // Reset status on resubmit
          },
        );
        
        if (mounted) {
          setState(() {
            _isAnalyzing = false;
            _result = {'status': 'PASS', 'feedback': feedback};
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isAnalyzing = false;
            _result = {'status': 'REJECT', 'feedback': feedback};
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _error = 'Analysis Failed: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isAnalyzing) _buildAnalyzingView(),
                if (!_isAnalyzing && _error != null) _buildErrorView(),
                if (!_isAnalyzing && _result != null) _buildResultView(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyzingView() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 150,
              height: 150,
              child: CircularProgressIndicator(
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.blueAccent),
                strokeWidth: 8,
                backgroundColor: Colors.white.withOpacity(0.1),
              ),
            ),
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Opacity(
                  opacity: _controller.value,
                  child: const Icon(LucideIcons.brain, size: 60, color: Colors.blueAccent),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 40),
        const Text(
          'CityConnect AI Analysis',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        const Text(
          'Validating your report for authenticity and quality...',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white60, fontSize: 16),
        ),
        const SizedBox(height: 40),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.shieldCheck, color: Colors.greenAccent, size: 20),
              SizedBox(width: 12),
              Text('Multi-Source Verification Active'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildErrorView() {
    return Column(
      children: [
        const Icon(LucideIcons.alertTriangle, size: 80, color: Colors.redAccent),
        const SizedBox(height: 24),
        const Text('System Error', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
        const SizedBox(height: 40),
        ElevatedButton(
          onPressed: () => context.pop(),
          child: const Text('Try Again'),
        ),
      ],
    );
  }

  Widget _buildResultView() {
    final isPass = _result!['status'] == 'PASS';
    return Column(
      children: [
        Icon(
          isPass ? LucideIcons.checkCircle : LucideIcons.xCircle,
          size: 80,
          color: isPass ? Colors.greenAccent : Colors.redAccent,
        ),
        const SizedBox(height: 24),
        Text(
          isPass ? 'Report Verified!' : 'Report Denied',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Container(
          constraints: const BoxConstraints(maxHeight: 200),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: (isPass ? Colors.greenAccent : Colors.redAccent).withOpacity(0.3)),
          ),
          child: SingleChildScrollView(
            child: Text(
              _result!['feedback'],
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, height: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 48),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              if (isPass) {
                context.go('/dashboard');
              } else {
                context.pop();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isPass ? Colors.greenAccent.shade700 : Colors.blueAccent,
            ),
            child: Text(
              isPass ? 'Back to Dashboard' : 'Edit Report',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }
}
