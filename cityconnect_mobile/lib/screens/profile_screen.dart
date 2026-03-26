import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_service.dart';
import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic>? initialUser;
  const ProfileScreen({super.key, this.initialUser});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _locationCtrl;
  late TextEditingController _photoUrlCtrl;
  late TextEditingController _parentNumCtrl;
  late TextEditingController _parentEmailCtrl;
  late TextEditingController _relativeNumCtrl;
  late TextEditingController _relativeEmailCtrl;
  final ImagePicker _picker = ImagePicker();
  File? _localPhoto;

  @override
  void initState() {
    super.initState();
    final u = widget.initialUser ?? {};
    _nameCtrl = TextEditingController(text: u['name'] ?? '');
    _phoneCtrl = TextEditingController(text: u['phone'] ?? '');
    _locationCtrl = TextEditingController(text: u['location'] ?? '');
    _photoUrlCtrl = TextEditingController(text: u['photo_url'] ?? u['profile_photo_url'] ?? '');
    _parentNumCtrl = TextEditingController(text: u['parent_number'] ?? '');
    _parentEmailCtrl = TextEditingController(text: u['parent_email'] ?? '');
    _relativeNumCtrl = TextEditingController(text: u['relative_number'] ?? '');
    _relativeEmailCtrl = TextEditingController(text: u['relative_email'] ?? '');
  }

  Future<void> _updateProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      String? photoUrl = _photoUrlCtrl.text;
      if (_localPhoto != null) {
        // Simulated upload: convert to base64 or upload to storage
        final bytes = await _localPhoto!.readAsBytes();
        photoUrl = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      }

      final res = await ApiService.request('/auth/profile', method: 'PUT', body: {
        'name': _nameCtrl.text,
        'phone': _phoneCtrl.text,
        'location': _locationCtrl.text,
        'photo_url': photoUrl,
        'parent_number': _parentNumCtrl.text,
        'parent_email': _parentEmailCtrl.text,
        'relative_number': _relativeNumCtrl.text,
        'relative_email': _relativeEmailCtrl.text,
      });

      if (mounted) {
        final prefs = await SharedPreferences.getInstance();
        if (res['user'] != null) {
          await prefs.setString('user', jsonEncode(res['user']));
          setState(() {
            _photoUrlCtrl.text = res['user']['photo_url'] ?? res['user']['profile_photo_url'] ?? _photoUrlCtrl.text;
            _localPhoto = null; // Clear local photo path after successful upload
          });
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Profile updated successfully!'),
            backgroundColor: Colors.green,
          )
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(source: source, maxWidth: 512, maxHeight: 512, imageQuality: 75);
      if (picked != null) {
        setState(() => _localPhoto = File(picked.path));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error picking photo: $e')));
    }
  }

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: CityConnectTheme.primaryMid,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Update Profile Photo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildPickerOption(LucideIcons.camera, 'Camera', () {
                    context.pop();
                    _pickPhoto(ImageSource.camera);
                  }),
                  _buildPickerOption(LucideIcons.image, 'Gallery', () {
                    context.pop();
                    _pickPhoto(ImageSource.gallery);
                  }),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPickerOption(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          CircleAvatar(radius: 30, backgroundColor: Colors.white.withOpacity(0.05), child: Icon(icon, color: Colors.blueAccent)),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: CityConnectTheme.primaryDark,
        title: const Text('Delete Account?', style: TextStyle(color: Colors.white)),
        content: const Text('This action is permanent and cannot be undone.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('DELETE', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _loading = true);
      try {
        await ApiService.request('/auth/profile', method: 'DELETE');
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        if (mounted) context.go('/');
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Stack(
                            children: [
                              GestureDetector(
                                onTap: _showPhotoOptions,
                                child: CircleAvatar(
                                  radius: 60,
                                  backgroundColor: Colors.blueAccent.withOpacity(0.1),
                                  backgroundImage: _localPhoto != null 
                                      ? FileImage(_localPhoto!) 
                                      : _getProfileImage(_photoUrlCtrl.text),
                                  child: (_localPhoto == null && _photoUrlCtrl.text.isEmpty) 
                                      ? const Icon(LucideIcons.user, size: 60, color: Colors.blueAccent) 
                                      : null,
                                ),
                              ),
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: CircleAvatar(
                                  backgroundColor: Colors.blueAccent,
                                  radius: 18,
                                  child: IconButton(
                                    icon: const Icon(LucideIcons.camera, size: 18, color: Colors.white),
                                    onPressed: _showPhotoOptions,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 40),
                        const Text('PERSONAL INFORMATION', style: TextStyle(fontSize: 12, letterSpacing: 1.5, color: Colors.white30, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 24),
                        _buildStyledField('Full Name', _nameCtrl, LucideIcons.user),
                        const SizedBox(height: 16),
                        _buildStyledField('Phone Number', _phoneCtrl, LucideIcons.phone),
                        const SizedBox(height: 16),
                        _buildStyledField('Location', _locationCtrl, LucideIcons.mapPin),
                        
                        const SizedBox(height: 40),
                        const Text('EMERGENCY CONTACTS', style: TextStyle(fontSize: 12, letterSpacing: 1.5, color: Colors.white30, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 24),
                        _buildStyledField('Parent Phone', _parentNumCtrl, LucideIcons.phoneCall),
                        const SizedBox(height: 16),
                        _buildStyledField('Parent Email', _parentEmailCtrl, LucideIcons.mail),
                        const SizedBox(height: 16),
                        _buildStyledField('Relative Phone', _relativeNumCtrl, LucideIcons.phoneCall),
                        const SizedBox(height: 16),
                        _buildStyledField('Relative Email', _relativeEmailCtrl, LucideIcons.mail),
                        
                        const SizedBox(height: 48),
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: _updateProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blueAccent,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: const Text('Save Profile Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: TextButton.icon(
                            onPressed: _deleteAccount,
                            icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 20),
                            label: const Text('Delete Account', style: TextStyle(color: Colors.redAccent, fontSize: 16, fontWeight: FontWeight.bold)),
                            style: TextButton.styleFrom(
                              backgroundColor: Colors.redAccent.withOpacity(0.1),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildStyledField(String label, TextEditingController ctrl, IconData icon) {
    return TextFormField(
      controller: ctrl,
      style: const TextStyle(color: Colors.white),
      decoration: CityConnectTheme.inputDecoration(label.toUpperCase(), icon),
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
