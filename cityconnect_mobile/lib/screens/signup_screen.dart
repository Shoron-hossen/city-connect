import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import '../theme.dart';
import '../api_service.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  int _step = 0; // 0: info, 1: verify email, 2: person verification, 3: face recognition
  
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();
  
  String _docType = 'nid';
  final _docNumberController = TextEditingController();
  final _birthDateController = TextEditingController();

  XFile? _docPhoto;
  XFile? _profilePhoto;
  XFile? _livePhoto;

  bool _loading = false;
  String _error = '';
  String _message = '';

  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isFaceVerified = false;
  double _faceConfidence = 0.0;
  bool _faceScanning = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    _cameras = await availableCameras();
    if (_cameras != null && _cameras!.isNotEmpty) {
      final frontCamera = _cameras!.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras!.first,
      );
      _cameraController = CameraController(frontCamera, ResolutionPreset.medium);
      await _cameraController!.initialize();
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  // Add dummy Base64 utility for image upload mimicry
  Future<String?> _fileToBase64(XFile? file) async {
    if (file == null) return null;
    final bytes = await File(file.path).readAsBytes();
    return "data:image/jpeg;base64,${base64Encode(bytes)}";
  }

  Future<void> _handleSendCode() async {
    if (_nameController.text.isEmpty || _emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill all basic info fields.');
      return;
    }
    setState(() { _loading = true; _error = ''; _message = ''; });
    try {
      final res = await ApiService.request('/auth/send-code', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
        'type': 'signup'
      });
      setState(() {
        _step = 1;
        _message = res['warning'] ?? 'Secure OTP code requested! Please check your email.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleVerifyEmail() async {
    if (_codeController.text.isEmpty) {
      setState(() => _error = 'Please enter the code.');
      return;
    }
    setState(() { _loading = true; _error = ''; _message = ''; });
    try {
      await ApiService.request('/auth/verify-code', method: 'POST', body: {
        'email': _emailController.text.trim().toLowerCase(),
        'code': _codeController.text.trim(),
        'type': 'signup',
        'checkOnly': true
      });
      setState(() {
        _step = 2; // Jump to Document Verification
        _message = 'Email verified. Please upload identity documents.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleDocumentCheck() async {
    if (_docNumberController.text.isEmpty || _birthDateController.text.isEmpty || _docPhoto == null || _profilePhoto == null) {
      setState(() => _error = 'Please fill all fields and upload both document and profile photos.');
      return;
    }
    setState(() { _loading = true; _error = ''; _message = ''; });
    try {
      final data = await ApiService.request('/auth/check-document', method: 'POST', body: {
        'nid_number': _docType == 'nid' ? _docNumberController.text : null,
        'birth_certificate_number': _docType == 'birth_cert' ? _docNumberController.text : null,
      });
      if (data['exists'] == true) {
        setState(() => _error = data['message']);
      } else {
        setState(() {
          _step = 3;
          _message = 'Document validated. Proceed to face recognition.';
        });
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _startFaceRecognition() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    setState(() { _faceScanning = true; _error = ''; _message = ''; });

    try {
      final image = await _cameraController!.takePicture();
      _livePhoto = image;

      final liveBase64 = await _fileToBase64(image);
      final docBase64 = await _fileToBase64(_docPhoto);
      final profileBase64 = await _fileToBase64(_profilePhoto);

      final response = await ApiService.request('/auth/verify-face', method: 'POST', body: {
        'live_photo': liveBase64,
        'doc_photo': docBase64,
        'profile_photo': profileBase64
      });

      if (response['match'] == true && (response['confidence'] as num) > 0.7) {
        setState(() {
          _isFaceVerified = true;
          _faceConfidence = (response['confidence'] as num).toDouble();
          _message = 'Face matched successfully! Confidence: ${(_faceConfidence * 100).toStringAsFixed(1)}%';
        });
      } else {
        setState(() => _error = 'Verification failed: ${response['reason'] ?? 'Identity mismatch'}.');
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _faceScanning = false);
    }
  }

  Future<void> _handleFinalSignUp() async {
    setState(() { _loading = true; _error = ''; });
    try {
      await ApiService.request('/auth/signup', method: 'POST', body: {
        'name': _nameController.text,
        'email': _emailController.text.trim().toLowerCase(),
        'password': _passwordController.text,
        'code': _codeController.text.trim(),
        'nid_number': _docType == 'nid' ? _docNumberController.text : null,
        'birth_certificate_number': _docType == 'birth_cert' ? _docNumberController.text : null,
        'photo_url': await _fileToBase64(_docPhoto),
        'profile_photo_url': await _fileToBase64(_profilePhoto),
        'live_photo_url': await _fileToBase64(_livePhoto),
        'face_confidence': _faceConfidence,
        'location': 'Bangladesh',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Registration successful! Please login.')));
        context.go('/login');
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickImage(bool isDoc) async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 50);
    if (image != null) {
      setState(() {
        if (isDoc) {
          _docPhoto = image;
        } else {
          _profilePhoto = image;
        }
      });
    }
  }

  Widget _buildStep0() {
    return Column(
      children: [
        TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'FULL NAME')),
        const SizedBox(height: 16),
        TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'EMAIL ADDRESS')),
        const SizedBox(height: 16),
        TextField(controller: _passwordController, decoration: const InputDecoration(labelText: 'PASSWORD'), obscureText: true),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _loading ? null : _handleSendCode,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Continue to Verification', style: TextStyle(fontSize: 18)),
          ),
        ),
      ],
    );
  }

  Widget _buildStep1() {
    return Column(
      children: [
        TextField(
          controller: _codeController, 
          decoration: const InputDecoration(labelText: 'VERIFICATION CODE'),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, letterSpacing: 8),
          maxLength: 6,
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _loading ? null : _handleVerifyEmail,
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Verify Email', style: TextStyle(fontSize: 18)),
          ),
        ),
        TextButton(
          onPressed: _loading ? null : _handleSendCode,
          child: const Text('Resend verification code', style: TextStyle(color: Colors.blueAccent)),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: _docType == 'nid' ? Colors.blue : Colors.grey.shade800),
                onPressed: () => setState(() => _docType = 'nid'),
                child: const Text('NID Card'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: _docType == 'birth_cert' ? Colors.blue : Colors.grey.shade800),
                onPressed: () => setState(() => _docType = 'birth_cert'),
                child: const Text('Birth Certificate'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _docNumberController, 
          decoration: InputDecoration(labelText: _docType == 'nid' ? 'NID NUMBER' : 'BIRTH CERTIFICATE NUMBER'),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _birthDateController,
          decoration: const InputDecoration(labelText: 'DATE OF BIRTH', hintText: 'YYYY-MM-DD'),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => _pickImage(true),
                child: Container(
                  height: 100, color: Colors.white10,
                  child: _docPhoto != null ? Image.file(File(_docPhoto!.path), fit: BoxFit.cover) : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(LucideIcons.camera, color: Colors.grey), Text('Doc Photo', style: TextStyle(color: Colors.grey))]),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: GestureDetector(
                onTap: () => _pickImage(false),
                child: Container(
                  height: 100, color: Colors.white10,
                  child: _profilePhoto != null ? Image.file(File(_profilePhoto!.path), fit: BoxFit.cover) : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(LucideIcons.user, color: Colors.grey), Text('Profile Photo', style: TextStyle(color: Colors.grey))]),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _loading ? null : _handleDocumentCheck,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Validate Document', style: TextStyle(fontSize: 18)),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      children: [
        Container(
          height: 250, width: 250,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(40), border: Border.all(color: Colors.white24, width: 2)),
          clipBehavior: Clip.hardEdge,
          child: _isFaceVerified && _livePhoto != null
              ? Image.file(File(_livePhoto!.path), fit: BoxFit.cover)
              : (_cameraController?.value.isInitialized ?? false)
                  ? CameraPreview(_cameraController!)
                  : const Center(child: CircularProgressIndicator()),
        ),
        const SizedBox(height: 32),
        if (!_isFaceVerified)
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton.icon(
              onPressed: _faceScanning ? null : _startFaceRecognition,
              icon: _faceScanning ? const CircularProgressIndicator(color: Colors.white) : const Icon(LucideIcons.fingerprint),
              label: Text(_faceScanning ? 'Analyzing Face...' : 'Verify Identity', style: const TextStyle(fontSize: 18)),
            ),
          )
        else
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: _loading ? null : _handleFinalSignUp,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Complete Registration', style: TextStyle(fontSize: 18)),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: CityConnectTheme.gradientBackground,
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 16, left: 16,
                child: IconButton(icon: const Icon(LucideIcons.arrowLeft, color: Colors.white), onPressed: () => context.pop()),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(40),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Create Account', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text('Step ${_step + 1} of 4', style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 24),
                        if (_error.isNotEmpty) ...[
                          Text(_error, style: const TextStyle(color: Colors.redAccent)),
                          const SizedBox(height: 16),
                        ],
                        if (_message.isNotEmpty) ...[
                          Text(_message, style: const TextStyle(color: Colors.greenAccent)),
                          const SizedBox(height: 16),
                        ],
                        if (_step == 0) _buildStep0(),
                        if (_step == 1) _buildStep1(),
                        if (_step == 2) _buildStep2(),
                        if (_step == 3) _buildStep3(),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('Already have an account?', style: TextStyle(color: Colors.grey)),
                            TextButton(
                              onPressed: () => context.go('/login'),
                              child: const Text('Log in', style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        )
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
}
