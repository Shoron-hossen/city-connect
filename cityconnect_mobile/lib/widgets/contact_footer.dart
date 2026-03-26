import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ContactFooter extends StatelessWidget {
  const ContactFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF000824),
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      margin: const EdgeInsets.only(top: 48),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text('Contact Me', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFFC89613))),
          const SizedBox(height: 8),
          const Text('Have a project in mind or want to collaborate? Feel free to reach out!', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 14)),
          const SizedBox(height: 32),
          
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(backgroundColor: Color(0x33C89613), child: Icon(LucideIcons.phone, color: Color(0xFFC89613))),
            title: const Text('Phone / WhatsApp', style: TextStyle(color: Colors.grey, fontSize: 12)),
            subtitle: const Text('+880 1888-668396', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(backgroundColor: Color(0x33C89613), child: Icon(LucideIcons.mail, color: Color(0xFFC89613))),
            title: const Text('Email', style: TextStyle(color: Colors.grey, fontSize: 12)),
            subtitle: const Text('meshoron53@gmail.com', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          
          const SizedBox(height: 32),
          const Align(alignment: Alignment.centerLeft, child: Text('Connect on Social', style: TextStyle(color: Colors.grey, fontSize: 14))),
          const SizedBox(height: 16),
          
          ElevatedButton.icon(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25D366), padding: const EdgeInsets.symmetric(vertical: 16), minimumSize: const Size(double.infinity, 50)),
            icon: const Icon(LucideIcons.messageCircle, color: Colors.white),
            label: const Text('WhatsApp', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F2328), padding: const EdgeInsets.symmetric(vertical: 16), minimumSize: const Size(double.infinity, 50), side: const BorderSide(color: Colors.white24)),
            icon: const Icon(LucideIcons.github, color: Colors.white),
            label: const Text('GitHub', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
        ],
      ),
    );
  }
}
