import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme.dart';
import '../api_service.dart';

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _initChat();
  }

  Future<void> _initChat() async {
    // Attempt to load history
    try {
      final historyRes = await ApiService.request('/chat/history');
      final history = historyRes is List ? historyRes : [];
      for (var msg in history) {
        _messages.add({
          'role': msg['role'],
          'content': msg['content']
        });
      }
      
      if (_messages.isEmpty) {
        _addMessage('model', 'Hello! I am CityConnect AI. How can I help you with city services today?');
      }
      if (mounted) setState(() {});
    } catch (e) {
      _addMessage('model', 'Hello! I am CityConnect AI. How can I help you with city services today? (Offline Mode)');
    }
  }

  void _addMessage(String role, String content) {
    setState(() {
      _messages.add({'role': role, 'content': content});
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isTyping) return;

    _messageController.clear();
    _addMessage('user', text);
    setState(() => _isTyping = true);

    // Save user message to backend
    try {
      await ApiService.request('/chat/message', method: 'POST', body: {
        'role': 'user',
        'content': text
      });
    } catch (_) {}

    try {
      String fullPrompt = "You are CityConnect AI, a helpful assistant for urban citizens. Answer questions about city services, how to report issues, and provide general guidance. Keep responses concise and helpful.\n\n";
      for (var msg in _messages) {
        if (msg['role'] == 'user' || msg['role'] == 'model') {
          String prefix = msg['role'] == 'user' ? 'User' : 'Assistant';
          fullPrompt += "$prefix: ${msg['content']}\n";
        }
      }
      fullPrompt += "Assistant:";

      final response = await ApiService.request('/gemini/generate', method: 'POST', body: {
        'prompt': fullPrompt
      });
      
      final responseText = response['response'] ?? 'I could not generate a response.';
      
      _addMessage('model', responseText);
      
      // Save model message to backend
      try {
        await ApiService.request('/chat/message', method: 'POST', body: {
          'role': 'model',
          'content': responseText
        });
      } catch (_) {}
    } catch (e) {
      _addMessage('system', 'Error: Failed to get response. $e');
    } finally {
      setState(() => _isTyping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CityConnect AI'),
        backgroundColor: CityConnectTheme.primaryDark,
        elevation: 1,
      ),
      backgroundColor: CityConnectTheme.primaryDark,
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                final isSystem = msg['role'] == 'system';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSystem ? Colors.red.withOpacity(0.2) : isUser ? Colors.blueAccent : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20).copyWith(
                        bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(20),
                        bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(20),
                      ),
                      border: isSystem ? Border.all(color: Colors.red) : null,
                    ),
                    child: MarkdownBody(
                      data: msg['content']!,
                      styleSheet: MarkdownStyleSheet(
                        p: const TextStyle(color: Colors.white, fontSize: 16),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isTyping)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('AI is typing...', style: TextStyle(color: Colors.grey)),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: CityConnectTheme.primaryMid,
              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Ask CityConnect AI...',
                        fillColor: Colors.white.withOpacity(0.05),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: Colors.blueAccent,
                    radius: 24,
                    child: IconButton(
                      icon: const Icon(LucideIcons.send, color: Colors.white),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
