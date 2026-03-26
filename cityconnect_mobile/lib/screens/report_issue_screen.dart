import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../theme.dart';

class ReportIssueScreen extends StatefulWidget {
  final Map<String, dynamic>? initialReport;
  const ReportIssueScreen({super.key, this.initialReport});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  String _category = 'Garbage';
  File? _image;
  final ImagePicker _picker = ImagePicker();
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialReport != null) {
      _titleController.text = widget.initialReport!['title'] ?? '';
      _descController.text = widget.initialReport!['description'] ?? '';
      _locationController.text = widget.initialReport!['location'] ?? '';
      _category = widget.initialReport!['category'] ?? 'Garbage';
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (pickedFile != null) {
        setState(() => _image = File(pickedFile.path));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error picking image: $e')));
    }
  }

  void _showPickerOptions() {
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
              const Text('Select Evidence Source', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildPickerItem(LucideIcons.camera, 'Camera', () {
                    context.pop();
                    _pickImage(ImageSource.camera);
                  }),
                  _buildPickerItem(LucideIcons.image, 'Gallery', () {
                    context.pop();
                    _pickImage(ImageSource.gallery);
                  }),
                  _buildPickerItem(LucideIcons.file, 'Files', () {
                    context.pop();
                    _pickImage(ImageSource.gallery); // Fallback to gallery for files on mobile
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

  Widget _buildPickerItem(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.blueAccent.withOpacity(0.1),
            child: Icon(icon, color: Colors.blueAccent, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  void _handleSubmit() {
    if (_formKey.currentState!.validate()) {
      // Pass data to AI Analyzer Screen
      context.push('/ai-analyzer', extra: {
        'title': _titleController.text,
        'description': _descController.text,
        'category': _category,
        'location': _locationController.text,
        'image': _image,
        'is_resubmit': widget.initialReport != null,
        'original_id': widget.initialReport?['id'],
      });
    }
  }

  Future<void> _detectLocation() async {
    setState(() => _locating = true);
    try {
      // Simulated GPS detection for now, would use geolocator in production
      await Future.delayed(const Duration(seconds: 1));
      _locationController.text = "Lat: 23.8103, Lng: 90.4125 (Dhaka)";
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to detect location')));
    } finally {
      setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report an Issue', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Report Details', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Provide as much information as possible for faster resolution.', style: TextStyle(color: Colors.white60)),
                  const SizedBox(height: 32),
                  
                  TextFormField(
                    controller: _titleController,
                    style: const TextStyle(color: Colors.white),
                    decoration: CityConnectTheme.inputDecoration('ISSUE TITLE', LucideIcons.type),
                    validator: (val) => (val == null || val.isEmpty) ? 'Please enter a title' : null,
                  ),
                  const SizedBox(height: 20),
                  
                  TextFormField(
                    controller: _locationController,
                    style: const TextStyle(color: Colors.white),
                    decoration: CityConnectTheme.inputDecoration('LOCATION', LucideIcons.mapPin).copyWith(
                      suffixIcon: IconButton(
                        icon: _locating ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(LucideIcons.locateFixed, color: Colors.blueAccent),
                        onPressed: _detectLocation,
                      ),
                    ),
                    validator: (val) => (val == null || val.isEmpty) ? 'Please provide a location' : null,
                  ),
                  const SizedBox(height: 20),
                  
                  DropdownButtonFormField<String>(
                    value: _category,
                    decoration: CityConnectTheme.inputDecoration('CATEGORY', LucideIcons.tag),
                    dropdownColor: CityConnectTheme.primaryMid,
                    items: ['Garbage', 'Crime', 'Road Damage', 'Street Light'].map((e) {
                      return DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(color: Colors.white)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _category = val);
                    },
                  ),
                  const SizedBox(height: 20),
                  
                  TextFormField(
                    controller: _descController,
                    style: const TextStyle(color: Colors.white),
                    maxLines: 4,
                    decoration: CityConnectTheme.inputDecoration('DESCRIPTION', LucideIcons.alignLeft),
                    validator: (val) => (val == null || val.isEmpty) ? 'Please describe the issue' : null,
                  ),
                  const SizedBox(height: 32),
                  
                  const Text('Evidence (Optional)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  
                  _buildPhotoSection(),
                  
                  const SizedBox(height: 48),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueAccent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      icon: const Icon(LucideIcons.brain, color: Colors.white),
                      label: const Text('Analyze & Submit', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSection() {
    return InkWell(
      onTap: _showPickerOptions,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          image: _image != null ? DecorationImage(image: FileImage(_image!), fit: BoxFit.cover) : null,
        ),
        child: _image == null 
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.camera, size: 48, color: Colors.white.withOpacity(0.3)),
                  const SizedBox(height: 12),
                  Text('Tap to add photo evidence', style: TextStyle(color: Colors.white.withOpacity(0.5))),
                ],
              )
            : Align(
                alignment: Alignment.topRight,
                child: IconButton(
                  onPressed: () => setState(() => _image = null),
                  icon: const CircleAvatar(backgroundColor: Colors.red, radius: 14, child: Icon(LucideIcons.x, size: 16, color: Colors.white)),
                ),
              ),
      ),
    );
  }
}
