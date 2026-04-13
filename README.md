<<<<<<< HEAD
# City-Connect 🏙️

City-Connect is a comprehensive citizen engagement and emergency response platform. It bridges the gap between citizens and local authorities through AI-powered report verification, real-time tracking, and a robust emergency SOS system.

## 🌟 Key Features

### 👤 Citizen Features
- **Smart Dashboard**: Instantly track the status of your reported issues (Pending, Approved, Initiated, Completed).
- **AI-Powered Reporting**: Submit issues with photos. Our integrated Gemini AI analyzes images to verify authenticity and prevent fraudulent reports.
- **Emergency SOS**: A life-saving 5-second countdown alert system. Automatically sends your GPS coordinates and emergency message to authorities and your designated contacts.
- **Professional Profile**: Manage your identity, upload profile photos from Camera/Gallery, and secure your account with built-in SOS contact management.

### 🛡️ Admin Features
- **AI Analyzer Console**: Review citizen reports with AI-generated reasoning. Approve or reject with a single click.
- **User Management**: Monitor citizen status, adjust roles (Citizen, Admin, Super Admin), and manage security.
- **Activity Logs**: Complete audit trail of system actions for transparency and security.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Flutter SDK](https://docs.flutter.dev/get-started/install)
- [Firebase Account](https://firebase.google.com/) (for Firestore synchronization)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd cityconnect
   ```

2. **Backend & Web Setup**:
   ```bash
   npm install
   ```

3. **Mobile App Setup**:
   ```bash
   cd cityconnect_mobile
   flutter pub get
   ```

4. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   PORT=42129
   ```

### Running the Application

#### 🌐 Web Application (React + Node Server)
Run the following command from the project root:
```bash
npm run dev
```
The website will be available at `http://localhost:5173`.

#### 📱 Mobile Application (Flutter)
Run the following command from the `cityconnect_mobile` directory:
```bash
flutter run
```

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons
- **Mobile**: Flutter, GoRouter, SQLite (Local Persistence)
- **Backend**: Node.js, Express, Better-SQLite3
- **AI**: Google Gemini Pro (Multimodal)
- **Database**: SQLite (Local Source of Truth) + Firebase Firestore (Cloud Sync)

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
Built with ❤️ for a safer and more connected city.
=======

>>>>>>> 8cb2b468976ce6061284f0c72a3e56c2e9dd38ea
