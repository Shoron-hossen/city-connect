import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Replace 'YOUR_WINDOWS_IP' with your PC's actual IP (e.g., 192.168.x.x)
  // To find your Windows IP: Run 'ipconfig' in cmd and use the IPv4 Address
  static const String windowsHostIP =
      '192.168.10.111'; // Change this to your Windows PC's IP
  static const String localhost = '127.0.0.1';
  static const int port = 3000; // Correct port - server runs on 3000, not 3001

  static String get baseUrl {
    // For physical device: use the Windows host IP and port 3000
    // For emulator with ADB forwarding: can use localhost
    // Change the IP below to match your Windows machine's IP address
    return 'http://$windowsHostIP:$port/api';
  }

  static Future<dynamic> request(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final uri = Uri.parse('$baseUrl$endpoint');
    http.Response response;

    try {
      if (method == 'POST') {
        response = await http.post(
          uri,
          headers: headers,
          body: jsonEncode(body),
        );
      } else if (method == 'PUT') {
        response = await http.put(
          uri,
          headers: headers,
          body: jsonEncode(body),
        );
      } else if (method == 'DELETE') {
        response = await http.delete(uri, headers: headers);
      } else {
        response = await http.get(uri, headers: headers);
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }

    final String contentType = response.headers['content-type'] ?? '';
    dynamic data;
    if (contentType.contains('application/json')) {
      data = jsonDecode(response.body);
    } else {
      data = {'error': response.body};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorMsg =
          data['error'] ??
          data['message'] ??
          'Request failed with status ${response.statusCode}';
      throw Exception(errorMsg);
    }
    return data;
  }
}
