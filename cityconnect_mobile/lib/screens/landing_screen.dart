import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme.dart';
import '../widgets/contact_footer.dart';
import '../widgets/ai_chat_helper.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFC89613),
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => const AIChatHelper(),
        ),
        child: const Icon(LucideIcons.messageSquare, color: Colors.white),
      ),
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: Column(
            children: [
              _buildNavbar(context),
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'Empowering Citizens.\nBuilding Smarter Cities.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 36,
                            height: 1.2,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Report urban issues instantly, track progress, and let our AI-powered system route your concerns to the right city department.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ),
                        const SizedBox(height: 40),
                        ElevatedButton(
                          onPressed: () {
                            context.push('/login');
                          },
                          child: const Text('Report an Issue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(height: 60),
                        const Text(
                          'Our Services',
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 48),
                        Wrap(
                          spacing: 32,
                          runSpacing: 48,
                          alignment: WrapAlignment.center,
                          children: [
                            _buildServiceItem(LucideIcons.trash2, 'Garbage', [Colors.blue.shade400, Colors.blue.shade600]),
                            _buildServiceItem(LucideIcons.video, 'Crime', [Colors.purple.shade400, Colors.purple.shade600]),
                            _buildServiceItem(LucideIcons.zap, 'Road\nDamage', [Colors.orange.shade400, Colors.orange.shade600]),
                            _buildServiceItem(LucideIcons.lightbulb, 'Street\nLight', [Colors.yellow.shade400, Colors.yellow.shade600]),
                          ],
                        ),
                        const SizedBox(height: 60),
                        Container(
                          margin: const EdgeInsets.only(top: 20, bottom: 20),
                          padding: const EdgeInsets.only(top: 40),
                          decoration: BoxDecoration(
                            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
                          ),
                          child: TextButton.icon(
                            onPressed: () => context.push('/admin/login'),
                            icon: const Icon(LucideIcons.shield, size: 14, color: Colors.grey),
                            label: const Text('Administrator Control Panel', style: TextStyle(color: Colors.grey, fontSize: 14)),
                          ),
                        ),
                        // Global Public Footer
                        const ContactFooter(),
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

  Widget _buildNavbar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(LucideIcons.mapPin, color: Colors.blue.shade400),
              const SizedBox(width: 8),
              const Text('CityConnect', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),
          Row(
            children: [
              TextButton(
                onPressed: () => context.push('/login'),
                child: const Text('Login', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => context.push('/signup'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                child: const Text('Sign Up', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildServiceItem(IconData icon, String title, List<Color> gradientColors) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradientColors,
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(50),
              topRight: Radius.circular(50),
              bottomLeft: Radius.circular(50),
              bottomRight: Radius.circular(0), // Mirror React css: 0 50% 50% 50% ? Actually it was 0 50% 50% 50% and rotate-45.
              // CSS border-radius: 0 50% 50% 50% => top-left is sharp.
            ),
            boxShadow: [
              BoxShadow(
                color: gradientColors.last.withOpacity(0.4),
                blurRadius: 20,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Transform.rotate(
            angle: 0.785398, // roughly 45 degrees
            child: Icon(icon, color: Colors.white, size: 40),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.1),
        ),
      ],
    );
  }
}
