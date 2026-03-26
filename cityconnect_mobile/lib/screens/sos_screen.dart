import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api_service.dart';

class SOSScreen extends StatefulWidget {
  const SOSScreen({super.key});

  @override
  State<SOSScreen> createState() => _SOSScreenState();
}

class _SOSScreenState extends State<SOSScreen> {
  int _countdown = 5;
  Timer? _timer;
  bool _isTriggered = false;
  bool _isSent = false;

  void _startSOS() {
    setState(() {
      _isTriggered = true;
      _countdown = 5;
      _isSent = false;
    });

    _timer?.cancel(); // Cancel any existing timer
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 1) {
        if (mounted) setState(() => _countdown--);
      } else {
        _timer?.cancel();
        if (mounted) _sendSOS();
      }
    });
  }

  void _cancelSOS() {
    _timer?.cancel();
    _timer = null;
    if (mounted) {
      setState(() {
        _isTriggered = false;
        _isSent = false;
        _countdown = 5;
      });
    }
  }

  Future<void> _sendSOS() async {
    if (!mounted) return;
    setState(() {
      _isSent = true;
      _isTriggered = false;
    });
    try {
      await ApiService.request('/sos/alert', method: 'POST', body: {
        'timestamp': DateTime.now().toIso8601String(),
        'location': 'Current GPS Location (Simulated)',
        'message': 'Emergency SOS Alert triggered by user.'
      });
    } catch (e) {
      debugPrint('SOS Send Error: $e');
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('EMERGENCY SOS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () {
            _cancelSOS();
            context.pop();
          },
        ),
      ),
      body: Stack(
        children: [
          if (_isTriggered) Positioned.fill(child: _PulseBackground()),
          
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Map Preview Placeholder
                          Column(
                            children: [
                              Container(
                                height: 220,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(color: Colors.white10),
                                  image: const DecorationImage(
                                    image: NetworkImage('https://maps.googleapis.com/maps/api/staticmap?center=23.81,90.41&zoom=14&size=600x400&maptype=roadmap&key=YOUR_KEY_HERE'),
                                    fit: BoxFit.cover,
                                    opacity: 0.3,
                                  ),
                                ),
                                child: Stack(
                                  children: [
                                    Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(LucideIcons.mapPin, size: 40, color: Colors.blueAccent.withOpacity(0.8)),
                                          const SizedBox(height: 8),
                                          Text('Scanning Location...', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 16,
                                      right: 16,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(color: Colors.blueAccent, borderRadius: BorderRadius.circular(12)),
                                        child: const Row(
                                          children: [
                                            Icon(LucideIcons.maximize2, size: 14, color: Colors.white),
                                            SizedBox(width: 8),
                                            Text('SEE MAP', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 32),
                          
                          if (!_isTriggered && !_isSent) _buildInitialState(),
                          if (_isTriggered) _buildCountdownState(),
                          if (_isSent) _buildSentState(),
                          
                          const SizedBox(height: 32),
                          
                          if (!_isTriggered)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: TextButton(
                                onPressed: () {
                                  _cancelSOS();
                                  context.pop();
                                },
                                child: const Text('GO BACK', style: TextStyle(color: Colors.white30, letterSpacing: 1.5)),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitialState() {
    return Column(
      children: [
        const Text(
          'ARE YOU IN DANGER?',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 16),
        const Text(
          'Triggering SOS will instantly notify emergency services and your parents.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white60, height: 1.5),
        ),
        const SizedBox(height: 48),
        GestureDetector(
          onTap: _startSOS,
          child: Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              color: Colors.redAccent,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Colors.redAccent.withOpacity(0.4), blurRadius: 40, spreadRadius: 10),
              ],
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.shieldAlert, size: 60, color: Colors.white),
                  SizedBox(height: 12),
                  Text('TRIGGER SOS', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCountdownState() {
    return Column(
      children: [
        Text(
          'SENDING IN $_countdown SECONDS',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.redAccent),
        ),
        const SizedBox(height: 48),
        SizedBox(
          width: 200,
          height: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CircularProgressIndicator(
                value: _countdown / 5,
                strokeWidth: 10,
                color: Colors.redAccent,
                backgroundColor: Colors.white10,
              ),
              Text(
                '$_countdown',
                style: const TextStyle(fontSize: 80, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
        ),
        const SizedBox(height: 60),
        ElevatedButton(
          onPressed: _cancelSOS,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(40)),
          ),
          child: const Text('CANCEL SOS', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildSentState() {
    return Column(
      children: [
        const Icon(LucideIcons.checkCircle2, size: 100, color: Colors.greenAccent),
        const SizedBox(height: 32),
        const Text(
          'SOS ALERT SENT',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 16),
        const Text(
          'Your emergency contacts and the nearest authority\nhave been notified of your coordinates.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white70, height: 1.5),
        ),
        const SizedBox(height: 48),
        ElevatedButton(
          onPressed: () => context.pop(),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blueAccent,
            padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(40)),
          ),
          child: const Text('I AM SAFE NOW', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

class _PulseBackground extends StatefulWidget {
  @override
  State<_PulseBackground> createState() => _PulseBackgroundState();
}

class _PulseBackgroundState extends State<_PulseBackground> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.redAccent.withOpacity(0.2 * _controller.value),
              blurRadius: 100,
              spreadRadius: 50 * _controller.value,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
