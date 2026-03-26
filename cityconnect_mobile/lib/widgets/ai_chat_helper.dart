import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api_service.dart';

class AIChatHelper extends StatefulWidget {
  const AIChatHelper({super.key});
  @override
  State<AIChatHelper> createState() => _AIChatHelperState();
}

class _AIChatHelperState extends State<AIChatHelper> {
  final List<Map<String, String>> _messages = [
    {'role': 'model', 'content': 'Hi! I am the CityConnect Assistant. I can help answer questions about our service. How can I help you today?'}
  ];
  final _inputController = TextEditingController();
  bool _isTyping = false;

  Future<void> _sendMessage() async {
    if (_inputController.text.trim().isEmpty) return;
    final text = _inputController.text;
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _inputController.clear();
      _isTyping = true;
    });

    try {
      final res = await ApiService.request('/gemini/public', method: 'POST', body: {
        'prompt': 'You are the CityConnect public Assistant. Explain our services concisely. User query: $text',
        'format': 'text'
      });
      setState(() => _messages.add({'role': 'model', 'content': res['response'] ?? 'Sorry, I am offline.'}));
    } catch (e) {
      setState(() => _messages.add({'role': 'model', 'content': 'Connection error.'}));
    } finally {
      setState(() => _isTyping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(color: Color(0xFF000824), borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(color: Color(0xFF00103A), borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(children: [Icon(LucideIcons.messageSquare, color: Color(0xFFC89613)), SizedBox(width: 8), Text('CityConnect AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))]),
                IconButton(icon: const Icon(LucideIcons.x, color: Colors.grey), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length) return const Align(alignment: Alignment.centerLeft, child: Text('AI is typing...', style: TextStyle(color: Colors.grey, fontSize: 12)));
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: isUser ? const Color(0xFFC89613) : Colors.white10, borderRadius: BorderRadius.circular(16)),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    child: Text(msg['content']!, style: const TextStyle(color: Colors.white)),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom + 16, left: 16, right: 16, top: 16),
            color: const Color(0xFF00103A),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Ask about our service...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: Colors.white10,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFFC89613),
                  child: IconButton(icon: const Icon(LucideIcons.send, color: Colors.white, size: 20), onPressed: _sendMessage),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
