import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { Phone, Mail, MessageCircle, Github, MapPin, Trash2, Cctv, Zap, Lightbulb, Brain, Camera, CheckCircle, ChevronDown, Loader2, Cpu, MessageSquare, X, Send, Menu, LogOut, User as UserIcon, AlertCircle, AlertTriangle, ArrowLeft, Users, FileText, Activity, Settings, Search, Filter, Shield, ShieldAlert, ShieldCheck, BarChart3, TrendingUp, Calendar, RefreshCw, Fingerprint, Moon, Sun, Car, BellRing } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import RemarkableDatesWidget from './RemarkableDatesWidget';
import TransportationPage from './TransportationPage';
import EnvironmentPage from './EnvironmentPage';

// --- Types ---
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  photo_url?: string;
  profile_photo_url?: string;
  parent_number?: string;
  parent_email?: string;
  relative_number?: string;
  relative_email?: string;
  scheduled_deletion_at?: string;
}

// --- Main App Component ---
// --- Helper for robust API requests ---
async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { error: await res.text() };
  }

  if (!res.ok) {
    const error = new Error(data.error || data.message || `Request failed with status ${res.status}`) as any;
    error.data = data;
    throw error;
  }
  return data;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // (Theme logic removed per user request)

  const fetchUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      request('/api/auth/me')
        .then(data => {
          if (data.user) setUser(data.user);
          else localStorage.removeItem('token');
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#00103a]"><Loader2 className="animate-spin text-white" size={48} /></div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen w-full font-sans bg-gray-50 text-gray-900 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage user={user} setUser={setUser} />} />
          <Route path="/about" element={<AboutUs user={user} setUser={setUser} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
          <Route path="/admin/login" element={user ? <Navigate to="/admin" /> : <AdminLogin setUser={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignUp setUser={setUser} />} />
          <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user}><Profile user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute user={user}><AIChatPage user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/sos" element={<ProtectedRoute user={user}><SOSPage user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/my-reports" element={<ProtectedRoute user={user}><MyReports user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/admin/*" element={<AdminRoute user={user}><AdminDashboard user={user!} setUser={setUser} /></AdminRoute>} />
          <Route path="/report" element={<ProtectedRoute user={user}><ReportIssue user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/transportation" element={<ProtectedRoute user={user}><TransportationPage user={user!} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute user={user}><Success /></ProtectedRoute>} />
          </Routes>
          <FloatingAIAssistant />
          <GlobalFooter />
        </div>
      </BrowserRouter>
    );
  }

function GlobalFooter() {
  const location = useLocation();
  // Only show on Homepage and User Dashboard
  const showRoutes = ['/', '/dashboard'];
  
  if (!showRoutes.includes(location.pathname)) {
    return null;
  }
  
  return (
    <>
      <ContactFooter />
      <Footer />
    </>
  );
}

// --- Protected Route ---
function ProtectedRoute({ user, children }: { user: User | null, children: React.ReactNode }) {
  if (!user) return <Navigate to="/" />;
  if (user.role === 'Super Admin') return <Navigate to="/admin" />;
  return <>{children}</>;
}

function AdminRoute({ user, children }: { user: User | null, children: React.ReactNode }) {
  if (!user) return <Navigate to="/" />;
  if (user.role !== 'Super Admin') return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

// --- Layout Components ---
export function Navbar({ user, setUser }: { user: User | null, setUser: (user: User | null) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/ai-chat') || location.pathname.startsWith('/sos') || location.pathname.startsWith('/my-reports') || location.pathname.startsWith('/transportation');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="bg-[#00103a] text-white py-4 px-6 md:px-12 flex justify-between items-center shadow-md sticky top-0 z-40 backdrop-blur-md bg-opacity-90 border-b border-white/10">
      <Link to={user ? (user.role === 'Super Admin' ? "/admin" : "/dashboard") : "/"} className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <MapPin className="text-blue-400" /> City-Connect
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {!isDashboard && (user?.role !== 'Super Admin') && <Link to="/" className="hover:text-blue-300 transition-colors font-medium">Home</Link>}
        {!isDashboard && (user?.role !== 'Super Admin') && <Link to="/about" className="hover:text-blue-300 transition-colors font-medium">About Us</Link>}
        
        {user && isDashboard && (user.role !== 'Super Admin') && (
          <>
            <Link to="/transportation" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/transportation' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-gray-300 hover:text-indigo-400'}`}>
              <Car size={18} className={location.pathname === '/transportation' ? 'text-indigo-300' : 'text-indigo-400'} /> Transport
            </Link>
            <Link to="/ai-chat" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/ai-chat' ? 'text-purple-400 border-b-2 border-purple-400 pb-1' : 'text-gray-300 hover:text-purple-400'}`}>
              <Brain size={18} className="text-purple-400" /> AI Chat
            </Link>
            <Link to="/my-reports" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/my-reports' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-300 hover:text-blue-400'}`}>
              <FileText size={18} className="text-blue-400" /> My Reports
            </Link>
            <Link to="/sos" className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded-full font-bold transition-all animate-pulse shadow-lg shadow-red-500/20">
              <AlertCircle size={18} /> SOS
            </Link>
          </>
        )}

        {user && !isDashboard && (user.role === 'admin' || user.role === 'Super Admin') && (
          <Link to="/admin" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-full font-bold transition-all shadow-lg shadow-purple-500/20">
            <Shield size={18} /> Admin Panel
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-2 hover:text-blue-300 transition-colors py-2">
                {(user.photo_url || user.profile_photo_url) ? (
                  <img src={(user.photo_url || user.profile_photo_url) as string} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-white/20">
                    <UserIcon size={16} />
                  </div>
                )}
                <span className="font-medium">{user.name}</span>
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1e1b4b] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-50">
                {(user.role !== 'Super Admin') ? (
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors">
                    <Settings size={18} /> Profile Settings
                  </Link>
                ) : (
                  <Link to="/admin" className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors">
                    <Shield size={18} /> Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/20 text-red-400 transition-colors border-t border-white/5">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-blue-300 transition-colors font-medium">Login</Link>
            <Link to="/signup" className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full font-bold transition-all shadow-lg shadow-blue-500/20">Sign Up</Link>
          </div>
        )}
      </div>
      <div className="md:hidden flex items-center gap-4">
        {user && isDashboard && (
          <Link to="/sos" className="bg-red-600 p-2 rounded-full animate-pulse">
            <AlertCircle size={20} />
          </Link>
        )}
        <Menu size={24} />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-[#00103a] text-gray-400 py-8 px-6 md:px-12 text-center text-sm mt-auto">
      <div className="mb-4">
        <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
      </div>
      <p>&copy; {new Date().getFullYear()} City-Connect. A Hub Connecting Citizens with City Services.</p>
    </footer>
  );
}

// --- Pages ---
function LandingPage({ user, setUser }: { user: User | null, setUser: (user: User | null) => void }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} setUser={setUser} />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight max-w-4xl leading-tight">
          Empowering Citizens.<br/>Building Smarter Cities.
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl">
          Report urban issues instantly, track progress, and let our AI-powered system route your concerns to the right city department.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link to="/report" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg shadow-blue-500/30">
            Report an Issue
          </Link>
        </div>
        
        <div className="w-full max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-20 tracking-tight">Our Services</h2>
          <div className="flex flex-wrap justify-center gap-16 md:gap-24">
            <div className="flex flex-col items-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[0_50%_50%_50%] rotate-45 shadow-[0_10px_40px_rgba(59,130,246,0.4)] flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_15px_50px_rgba(59,130,246,0.6)] transition-all duration-300 cursor-pointer">
                <div className="-rotate-45 flex flex-col items-center text-white">
                  <Trash2 size={44} />
                </div>
              </div>
              <span className="mt-8 font-semibold text-xl tracking-wide">Garbage</span>
            </div>
            <div className="flex flex-col items-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-purple-400 to-purple-600 rounded-[0_50%_50%_50%] rotate-45 shadow-[0_10px_40px_rgba(168,85,247,0.4)] flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_15px_50px_rgba(168,85,247,0.6)] transition-all duration-300 cursor-pointer">
                <div className="-rotate-45 flex flex-col items-center text-white">
                  <Cctv size={44} />
                </div>
              </div>
              <span className="mt-8 font-semibold text-xl tracking-wide">Crime</span>
            </div>
            <div className="flex flex-col items-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[0_50%_50%_50%] rotate-45 shadow-[0_10px_40px_rgba(249,115,22,0.4)] flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_15px_50px_rgba(249,115,22,0.6)] transition-all duration-300 cursor-pointer">
                <div className="-rotate-45 flex flex-col items-center text-white">
                  <Zap size={44} />
                </div>
              </div>
              <span className="mt-8 font-semibold text-xl tracking-wide text-center leading-tight">Road<br/>Damage</span>
            </div>
            <div className="flex flex-col items-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-[0_50%_50%_50%] rotate-45 shadow-[0_10px_40px_rgba(234,179,8,0.4)] flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_15px_50px_rgba(234,179,8,0.6)] transition-all duration-300 cursor-pointer">
                <div className="-rotate-45 flex flex-col items-center text-white">
                  <Lightbulb size={44} />
                </div>
              </div>
              <span className="mt-8 font-semibold text-xl tracking-wide text-center leading-tight">Street<br/>Light</span>
            </div>
          </div>
        </div>

        {(!user || user.role === 'Super Admin') && (
          <div className="mt-20 pt-10 border-t border-white/10 w-full max-w-4xl text-center">
            <Link to={user ? "/admin" : "/admin/login"} className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center justify-center gap-2 mx-auto">
              <Shield size={14} /> Administrator Control Panel
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function SignUp({ setUser }: { setUser: (user: User) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(0); // 0: info, 1: email verification, 2: person verification, 3: face recognition
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Person Verification Fields
  const [docType, setDocType] = useState<'nid' | 'birth_cert'>('nid');
  const [docNumber, setDocNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photo, setPhoto] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [livePhoto, setLivePhoto] = useState('');
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState(0);

  const webcamRef = useRef<Webcam>(null);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const data = await request('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, type: 'signup' })
      });
      setStep(1);
      if (data.debugCode) {
        setCode(data.debugCode);
        if (!data.warning) setMessage(`Debug mode: Code is ${data.debugCode}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    try {
      await request('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, code: cleanCode, type: 'signup', checkOnly: true })
      });
      setStep(2);
      setMessage('Email verified. Please complete person verification.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber || !birthDate || !photo || !profilePhoto) {
      setError('Please fill all fields and upload both document and profile photos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await request('/api/auth/check-document', {
        method: 'POST',
        body: JSON.stringify({ 
          nid_number: docType === 'nid' ? docNumber : null,
          birth_certificate_number: docType === 'birth_cert' ? docNumber : null
        })
      });
      if (data.exists) {
        setError(data.message);
      } else {
        setStep(3);
        setMessage('Document validated. Proceed to face recognition.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startFaceRecognition = async () => {
    if (!webcamRef.current) return;
    
    setFaceScanning(true);
    setError('');
    
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) throw new Error('Camera not ready or failed to capture photo. Please ensure your camera is enabled and visible.');
      
      setLivePhoto(imageSrc);
      
      // Use server Gemini endpoint to compare the three photos
      const livePhotoData = imageSrc.split(',')[1];
      const docPhotoData = photo.split(',')[1];
      const profilePhotoData = profilePhoto.split(',')[1];
      
      const prompt = "Compare these three images. The first is a live capture from a webcam. The second is a photo from an NID card or Birth Certificate (which might be blurry). The third is a clear profile photo provided by the user. Determine if the person in the live capture is the same person as in the document and profile photos. The profile photo should be used to help if the document photo is blurry. Return a JSON object with 'match' (boolean) and 'confidence' (number between 0 and 1) and 'reason' (string).";
      
      const response = await request('/api/gemini/public', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          images: [
            { data: livePhotoData, mimeType: 'image/jpeg' },
            { data: docPhotoData, mimeType: 'image/jpeg' },
            { data: profilePhotoData, mimeType: 'image/jpeg' }
          ]
        })
      });
      
      const result = JSON.parse(response.response || '{}');
      
      if (result.match && result.confidence > 0.75) {
        setIsFaceVerified(true);
        setFaceConfidence(result.confidence);
        setMessage(`Face matched successfully! Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        setError(`Face verification failed: ${result.reason || 'Identity mismatch'}. Please try again with better lighting.`);
      }
    } catch (err: any) {
      console.error('Face verification error:', err);
      setError(err.message || 'AI Verification failed. Please ensure your face is clearly visible.');
    } finally {
      setFaceScanning(false);
    }
  };

  const handleFinalSignUp = async () => {
    if (!isFaceVerified) {
      setError('Please complete face recognition first.');
      return;
    }
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    try {
      await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          name, email: cleanEmail, password, code: cleanCode,
          nid_number: docType === 'nid' ? docNumber : null,
          birth_certificate_number: docType === 'birth_cert' ? docNumber : null,
          photo_url: photo,
          profile_photo_url: profilePhoto,
          live_photo_url: livePhoto,
          face_confidence: faceConfidence,
          location: 'Bangladesh', // Default for now
          phone: '' // Will be updated in profile
        })
      });
      
      navigate('/login', { state: { message: 'Signup successful! Your identity has been verified. Please login.' } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Max dimension 1600px to ensure full high quality image details while keeping size ~500kb
          const MAX_SIZE = 1600;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // highly quality JPEG (0.85) to retain text details without crashing
            setter(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setter(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] flex items-center justify-center p-6 relative">
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 text-white flex items-center gap-2 hover:text-blue-300 transition-colors bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-8 md:p-12 text-white shadow-2xl mt-12 overflow-hidden relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-6">
            {step === 0 && <UserIcon size={32} className="text-blue-400" />}
            {step === 1 && <MessageSquare size={32} className="text-blue-400" />}
            {step === 2 && <Shield size={32} className="text-blue-400" />}
            {step === 3 && <Camera size={32} className="text-blue-400" />}
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            {step === 0 && 'Create Account'}
            {step === 1 && 'Verify Email'}
            {step === 2 && 'Person Verification'}
            {step === 3 && 'Face Recognition'}
          </h1>
          <p className="text-gray-400">
            {step === 0 && 'Sign up to join the City-Connect network.'}
            {step === 1 && `Enter the 6-digit code sent to ${email}`}
            {step === 2 && 'Verify your identity with official documents.'}
            {step === 3 && 'Complete biometric scan to secure your identity.'}
          </p>
        </div>
        
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" /> {error}
        </div>}
        {message && <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
          <CheckCircle size={18} className="shrink-0" /> {message}
        </div>}
        
        {step === 0 && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Avijit" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="avijit@example.com" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            
            <button disabled={loading} type="submit" className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-2xl py-5 font-bold text-xl transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center shadow-xl shadow-blue-600/20">
              {loading ? <Loader2 className="animate-spin" /> : 'Continue to Verification'}
            </button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleVerifyEmail} className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Verification Code</label>
              <input type="text" required value={code} onChange={e => setCode(e.target.value)} placeholder="123456" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-center text-3xl tracking-[1em] placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" maxLength={6} />
            </div>
            
            <button disabled={loading} type="submit" className="w-full mt-8 bg-green-600 hover:bg-green-500 rounded-2xl py-5 font-bold text-xl transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center shadow-xl shadow-green-600/20">
              {loading ? <Loader2 className="animate-spin" /> : 'Verify Email'}
            </button>
            
            <button type="button" onClick={handleSendCode} className="w-full text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Resend verification code
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleDocumentCheck} className="space-y-6">
            <div className="flex gap-4 p-1 bg-white/5 rounded-2xl mb-6">
              <button 
                type="button"
                onClick={() => setDocType('nid')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${docType === 'nid' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                NID Card
              </button>
              <button 
                type="button"
                onClick={() => setDocType('birth_cert')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${docType === 'birth_cert' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Birth Certificate
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">
                  {docType === 'nid' ? 'NID Number' : 'Smart Birth Certificate Number'}
                </label>
                <input type="text" required value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder={docType === 'nid' ? '1234567890' : '20001234567890123'} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Date of Birth</label>
                <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Upload Document Photo</label>
                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setPhoto)} className="hidden" id="doc-photo" />
                    <label htmlFor="doc-photo" className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all overflow-hidden relative">
                      {photo ? (
                        <img src={photo} alt="Document" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={32} className="text-gray-500 mb-2 group-hover:text-blue-400 transition-colors" />
                          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">NID/Birth Cert Photo</span>
                        </>
                      )}
                    </label>
                    {!photo && (
                      <div className="absolute bottom-2 inset-x-2 flex gap-2 sm:hidden z-10 opacity-80 backdrop-blur-sm p-1 rounded-xl bg-black/40">
                         <label className="flex-1 text-center py-2 bg-blue-500 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer border border-blue-400">
                           <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(e, setPhoto)} className="hidden" />
                           <Camera size={14} className="inline mr-1"/> Camera
                         </label>
                         <label className="flex-1 text-center py-2 bg-purple-500 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer border border-purple-400">
                           <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setPhoto)} className="hidden" />
                           Gallery
                         </label>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Upload Clear Profile Photo</label>
                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setProfilePhoto)} className="hidden" id="profile-photo" />
                    <label htmlFor="profile-photo" className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all overflow-hidden relative">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <UserIcon size={32} className="text-gray-500 mb-2 group-hover:text-blue-400 transition-colors" />
                          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Clear Selfie/Photo</span>
                        </>
                      )}
                    </label>
                    {!profilePhoto && (
                      <div className="absolute bottom-2 inset-x-2 flex gap-2 sm:hidden z-10 opacity-80 backdrop-blur-sm p-1 rounded-xl bg-black/40">
                         <label className="flex-1 text-center py-2 bg-blue-500 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer border border-blue-400">
                           <input type="file" accept="image/*" capture="user" onChange={(e) => handlePhotoUpload(e, setProfilePhoto)} className="hidden" />
                           <Camera size={14} className="inline mr-1"/> Camera
                         </label>
                         <label className="flex-1 text-center py-2 bg-purple-500 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer border border-purple-400">
                           <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setProfilePhoto)} className="hidden" />
                           Gallery
                         </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <button disabled={loading} type="submit" className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-2xl py-5 font-bold text-xl transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center shadow-xl shadow-blue-600/20">
              {loading ? <Loader2 className="animate-spin" /> : 'Validate Document'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="relative w-full max-w-sm mx-auto aspect-square rounded-[40px] overflow-hidden bg-black/40 border-2 border-white/10 shadow-2xl">
              {isFaceVerified ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 backdrop-blur-sm z-20">
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-bounce">
                    <CheckCircle size={48} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-green-400">Identity Verified</span>
                  <span className="text-sm text-green-400/70 mt-1">Confidence: ${(faceConfidence * 100).toFixed(1)}%</span>
                </div>
              ) : null}

              {!isFaceVerified && (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                  onUserMediaError={() => setError("Camera access denied or not found. Please check your browser settings.")}
                />
              )}

              {faceScanning && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-scan"></div>
                  <div className="absolute inset-0 border-[40px] border-black/20"></div>
                  <div className="absolute inset-[40px] border-2 border-blue-500/50 rounded-3xl"></div>
                </div>
              )}

              {isFaceVerified && livePhoto && (
                <img src={livePhoto} alt="Captured" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="text-center">
              {!isFaceVerified ? (
                <button 
                  onClick={startFaceRecognition}
                  disabled={faceScanning}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-4 mx-auto shadow-xl shadow-blue-600/20"
                >
                  {faceScanning ? <Loader2 className="animate-spin" /> : <Fingerprint size={28} />}
                  {faceScanning ? 'Analyzing Face...' : 'Verify Identity'}
                </button>
              ) : (
                <button 
                  onClick={handleFinalSignUp}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-bold text-xl transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center shadow-xl shadow-green-600/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Complete Registration'}
                </button>
              )}
            </div>

            <p className="text-xs text-center text-gray-500 max-w-xs mx-auto">
              Your biometric data is encrypted and used only for identity verification against your provided document.
            </p>
          </div>
        )}

        <div className="mt-10 text-center border-t border-white/10 pt-8">
          <p className="text-sm text-gray-400">
            Already have an account? <span className="text-blue-400 cursor-pointer hover:text-blue-300 font-bold transition-colors" onClick={() => navigate('/login')}>Log in here</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

function Login({ setUser }: { setUser: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(0); // 0: email, 1: code & new pass
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletionData, setDeletionData] = useState<{ isScheduled: boolean, date: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password, isAdminLogin: false })
      });
      
      localStorage.setItem('token', data.token);
      if (data.user.role === 'Super Admin') {
        setUser(data.user);
        navigate('/admin');
      } else {
        setUser(data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.data?.isScheduledForDeletion) {
        setDeletionData({ isScheduled: true, date: err.data.deletionDate });
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // We need a way to authenticate this request.
      // Since the user can't login, we might need a special endpoint or use the password again.
      // For simplicity, let's assume they can login if we provide the password to a cancel endpoint.
      const data = await request('/api/auth/cancel-deletion-unauthenticated', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      setMessage('Account deletion cancelled! You can now login.');
      setDeletionData(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const data = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail })
      });
      if (data.warning) {
        setError(data.warning + (data.debugCode ? ` (Debug Code: ${data.debugCode})` : ''));
      } else {
        setMessage('Recovery code sent to your email.');
      }
      setRecoveryStep(1);
      if (data.debugCode) {
        setCode(data.debugCode);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    try {
      await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, code: cleanCode, newPassword })
      });
      
      setMessage('Password reset successful! You can now login.');
      setShowRecovery(false);
      setRecoveryStep(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] flex items-center justify-center p-6 relative">
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 text-white flex items-center gap-2 hover:text-blue-300 transition-colors bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
        <ArrowLeft size={20} /> Back
      </button>
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-white shadow-2xl mt-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3 tracking-tight">{showRecovery ? 'Recovery' : 'Login'}</h1>
          <p className="text-sm text-gray-300">
            {showRecovery ? 'Reset your account password.' : 'Sign in to continue.'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-xl mb-6 text-sm">
            {error}
            {deletionData?.isScheduled && (
              <div className="mt-3 pt-3 border-t border-red-500/30">
                <p className="mb-2">Scheduled for deletion on {new Date(deletionData.date).toLocaleDateString()}</p>
                <button 
                  onClick={handleCancelDeletion}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs transition-all"
                >
                  Cancel Deletion & Login
                </button>
              </div>
            )}
          </div>
        )}
        {message && <div className="bg-green-500/20 border border-green-500 text-green-200 p-3 rounded-xl mb-6 text-sm">{message}</div>}
        
        {!showRecovery ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="avijit@example.com" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold tracking-wider uppercase text-gray-200">Password</label>
                <button type="button" onClick={() => setShowRecovery(true)} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">Forgot Password?</button>
              </div>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="******" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            
            <button disabled={loading} type="submit" className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-full py-4 font-semibold text-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center">
              {loading ? <Loader2 className="animate-spin" /> : 'Login'}
            </button>
          </form>
        ) : (
          recoveryStep === 0 ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="avijit@example.com" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <button disabled={loading} type="submit" className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-full py-4 font-semibold text-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Code'}
              </button>
              <button type="button" onClick={() => setShowRecovery(false)} className="w-full text-sm text-gray-300 hover:underline">
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Recovery Code</label>
                <input type="text" required value={code} onChange={e => setCode(e.target.value)} placeholder="123456" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">New Password</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="******" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <button disabled={loading} type="submit" className="w-full mt-8 bg-green-600 hover:bg-green-500 rounded-full py-4 font-semibold text-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setRecoveryStep(0)} className="w-full text-sm text-gray-300 hover:underline">
                Back
              </button>
            </form>
          )
        )}

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-sm text-gray-300">
            Don't have an account? <span className="text-blue-400 cursor-pointer hover:underline font-medium" onClick={() => navigate('/signup')}>Sign up here</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ setUser }: { setUser: (user: User | null) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password, isAdminLogin: true })
      });
      
      if (data.user.role !== 'Super Admin') {
        throw new Error('Unauthorized access. This login is for administrators only.');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 text-white shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <Shield className="text-blue-500" size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-400">Restricted access for authorized personnel only.</p>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>}
        
        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-400">Admin Email</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@City-Connect.com" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-400">Security Key</label>
            <div className="relative">
              <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
          
          <button disabled={loading} type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20">
            {loading ? <Loader2 className="animate-spin" /> : <><Shield size={20} /> Authenticate</>}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            System Security Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
}

function HomepageChatBox({ isEmbedded }: { isEmbedded?: boolean }) {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hi! Ask me anything about City-Connect services.' }
  ]);
  const [userMsg, setUserMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmed = userMsg.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setUserMsg('');
    setLoading(true);

    try {
      const data = await fetch('/api/gemini/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `You are the City-Connect public Assistant. Be concise. User query: ${trimmed}` })
      });
      const json = await data.json();
      let aiText = 'Sorry, I could not get a response.';

      if (!data.ok) {
        const detail = json.details ? (typeof json.details === 'string' ? json.details : JSON.stringify(json.details)) : null;
        aiText = json.error || `AI API error: ${data.status} ${data.statusText}`;
        if (detail) aiText += ` (${detail})`;
      } else {
        aiText = json.response || json.text || aiText;
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Connection error: ${err.message || err}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '340px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm text-white leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#c89613] rounded-br-sm'
                : 'bg-white/10 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={userMsg}
          onChange={e => setUserMsg(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#c89613] outline-none"
          disabled={loading}
          onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !userMsg.trim()}
          className="bg-[#c89613] hover:bg-[#a67c0f] disabled:opacity-50 rounded-xl px-3 py-2 text-white transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}


function Dashboard({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState('Detecting location...');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const logs = await request('/api/activity');
        setActivities(logs);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 5000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const address = data.address;
            const shortAddress = address ? `${address.road || ''}, ${address.city || address.town || address.village || ''}`.replace(/^, |, $/g, '') : data.display_name;
            setLocation(shortAddress || `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`);
          } catch (error) {
            setLocation(`Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`);
          }
        },
        () => setLocation('Location access denied')
      );
    }
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* Mobile-like container for the core dashboard actions, centered on desktop */}
        <div className="w-full md:w-1/2 max-w-md mx-auto md:mx-0 flex flex-col">
          <div className="text-center md:text-left mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">City-Connect</h1>
            <div className="flex items-center justify-center md:justify-start text-gray-300 gap-1">
              <MapPin size={18} />
              <span>{location}</span>
            </div>
          </div>
          
          <button onClick={() => navigate('/report')} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] rounded-full py-4 font-semibold text-xl mb-8 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            Report an Issue
          </button>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div onClick={() => navigate('/report')} className="bg-[#1e1b4b]/60 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <Trash2 size={40} className="text-blue-400" />
              <span className="font-medium text-lg">Garbage</span>
            </div>
            <div onClick={() => navigate('/report')} className="bg-[#1e1b4b]/60 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <Cctv size={40} className="text-blue-400" />
              <span className="font-medium text-lg">Crime</span>
            </div>
            <div onClick={() => navigate('/report')} className="bg-[#1e1b4b]/60 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <Zap size={40} className="text-blue-400" />
              <span className="font-medium text-lg text-center leading-tight">Road<br/>Damage</span>
            </div>
            <div onClick={() => navigate('/report')} className="bg-[#1e1b4b]/60 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <Lightbulb size={40} className="text-blue-400" />
              <span className="font-medium text-lg text-center leading-tight">Street<br/>Light</span>
            </div>
          </div>
          

        </div>

        <div className="hidden md:flex w-full md:w-1/2 flex-col">
          <RemarkableDatesWidget />
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full overflow-y-auto max-h-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recent Activity</h2>
              <button onClick={() => navigate('/my-reports')} className="text-blue-400 hover:text-blue-300 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-blue-400" size={32} />
                </div>
              ) : activities.length > 0 ? (
                activities.map((log) => (
                  <div key={log.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-blue-300 font-medium capitalize">{log.action.replace('_', ' ')}</span>
                      <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{log.details}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Activity size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AboutUs({ user, setUser }: { user: User | null, setUser: (user: User | null) => void }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <button onClick={() => navigate(-1)} className="mb-8 text-white flex items-center gap-2 hover:text-blue-300 transition-colors bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
          <ArrowLeft size={20} /> Back
        </button>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
          <h1 className="text-5xl font-bold mb-8 tracking-tight text-center">About City-Connect</h1>
          
          <div className="space-y-8 text-lg text-gray-200 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">Our Mission</h2>
              <p>
                City-Connect is a smart city management platform designed to bridge the gap between citizens and local authorities. 
                Our mission is to empower residents to take an active role in improving their urban environment through technology and transparency.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">How It Works</h2>
              <p>
                Using advanced AI and real-time data processing, City-Connect allows users to report infrastructure issues, 
                public safety concerns, and environmental problems instantly. Our AI analysis categorizes and prioritizes 
                reports, ensuring that the right city departments can respond efficiently.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">Our Vision</h2>
              <p>
                We envision a future where every city is a "Smart City" – where data-driven decisions lead to safer streets, 
                cleaner neighborhoods, and more responsive governance. City-Connect is the first step towards that future.
              </p>
            </section>
            
            <div className="pt-8 border-t border-white/10 flex flex-col items-center">
              <p className="text-sm text-gray-400 mb-4 italic text-center">
                "Connecting citizens, building better cities."
              </p>
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                    <Users size={32} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest">Community</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                    <Shield size={32} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest">Security</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                    <Zap size={32} className="text-green-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest">Efficiency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MyReports({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchReports = () => {
    request('/api/reports')
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const fetchHistory = async (reportId: string) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const data = await request(`/api/reports/${reportId}/history`);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReportClick = (report: any) => {
    setSelectedReport(report);
    fetchHistory(report.id || report.reportId);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-400', label: 'Pending Review', icon: '⏳' };
      case 'pending_manual': return { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', dot: 'bg-orange-400', label: 'Under Review', icon: '👁️' };
      case 'pending_ai': return { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', dot: 'bg-purple-400', label: 'AI Analyzing', icon: '🤖' };
      case 'approved': return { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', dot: 'bg-blue-400', label: 'Approved', icon: '✅' };
      case 'initiated': return { color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400', label: 'Action Initiated', icon: '🚀' };
      case 'completed': return { color: 'bg-green-500/20 text-green-300 border-green-500/30', dot: 'bg-green-400', label: 'Completed', icon: '🎉' };
      case 'rejected': return { color: 'bg-red-500/20 text-red-300 border-red-500/30', dot: 'bg-red-400', label: 'Rejected', icon: '❌' };
      default: return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', dot: 'bg-gray-400', label: status || 'Submitted', icon: '📋' };
    }
  };

  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val.toDate === 'function') return val.toDate();
    return null;
  };

  const statusCounts = {
    total: reports.length,
    pending: reports.filter(r => ['pending', 'pending_manual', 'pending_ai'].includes(r.status)).length,
    approved: reports.filter(r => ['approved', 'initiated', 'completed'].includes(r.status)).length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />

      {/* Image Lightbox */}
      {imageModal && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6" onClick={() => setImageModal(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 rounded-full p-3 hover:bg-white/30 z-10" onClick={() => setImageModal(null)}>
            <X size={28} />
          </button>
          <img src={imageModal} alt="Report" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" referrerPolicy="no-referrer" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 hover:bg-white/10 rounded-full transition-colors border border-white/10">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Reports</h1>
            <p className="text-gray-400 text-sm mt-1">Track all your submitted city issue reports</p>
          </div>
          <button onClick={fetchReports} className="ml-auto p-2.5 hover:bg-white/10 rounded-full transition-colors border border-white/10">
            <RefreshCw size={20} />
          </button>
          <button onClick={() => navigate('/report')} className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-2xl font-bold transition-all text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Camera size={18} /> New Report
          </button>
        </div>

        {/* Stats Strip */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total', value: statusCounts.total, color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
              { label: 'Pending', value: statusCounts.pending, color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
              { label: 'Approved', value: statusCounts.approved, color: 'bg-green-500/20 border-green-500/30 text-green-300' },
              { label: 'Rejected', value: statusCounts.rejected, color: 'bg-red-500/20 border-red-500/30 text-red-300' },
            ].map(s => (
              <div key={s.label} className={`${s.color} border rounded-2xl p-4 text-center`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Your Reports</h2>
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-400" size={40} />
              </div>
            ) : reports.length > 0 ? (
              reports.map((report) => {
                const reportDate = toDate(report.created_at || report.createdAt);
                const cfg = getStatusConfig(report.status);
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => handleReportClick(report)}
                    className={`rounded-2xl border transition-all cursor-pointer overflow-hidden group ${isSelected ? 'bg-white/15 border-blue-500/60 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                  >
                    <div className="flex gap-0">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 shrink-0 bg-white/5 relative overflow-hidden">
                        {report.image_url ? (
                          <img src={report.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera size={24} className="text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="text-[9px] text-gray-500 shrink-0 ml-1">{reportDate ? reportDate.toLocaleDateString() : '-'}</span>
                        </div>
                        <h3 className="font-bold text-sm mb-0.5 truncate">{report.title}</h3>
                        <p className="text-gray-400 text-[11px] flex items-center gap-1 truncate">
                          <MapPin size={10} /> {(report.location || '').split(',')[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-gray-400 mb-2">No reports submitted yet</p>
                <button onClick={() => navigate('/report')} className="mt-2 bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all">
                  Submit First Report
                </button>
              </div>
            )}
          </div>

          {/* Report Detail + Timeline */}
          <div className="lg:col-span-3">
            {selectedReport ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden sticky top-24">
                {/* Report Image Header */}
                {selectedReport.image_url && (
                  <div className="relative h-52 overflow-hidden group cursor-pointer" onClick={() => setImageModal(selectedReport.image_url)}>
                    <img src={selectedReport.image_url} alt="Report" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00103a]/90 via-transparent to-transparent" />
                    <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to zoom ↗
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${getStatusConfig(selectedReport.status).color}`}>
                        {getStatusConfig(selectedReport.status).icon} {getStatusConfig(selectedReport.status).label}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-7">
                  {/* Status badges */}
                  {!selectedReport.image_url && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusConfig(selectedReport.status).color}`}>
                        {getStatusConfig(selectedReport.status).icon} {getStatusConfig(selectedReport.status).label}
                      </span>
                      <span className="bg-white/10 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium">{selectedReport.category}</span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-2 leading-tight">{selectedReport.title}</h2>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{selectedReport.description}</p>

                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <MapPin size={14} className="text-blue-400 shrink-0" />
                    <span className="truncate">{selectedReport.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-6">
                    <Calendar size={12} />
                    <span>Submitted: {(() => { const d = toDate(selectedReport.created_at || selectedReport.createdAt); return d ? d.toLocaleString() : '—'; })()}</span>
                  </div>

                  {/* Admin Notes (if any) */}
                  {selectedReport.admin_notes && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Admin Note</p>
                      <p className="text-sm text-blue-200">{selectedReport.admin_notes}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                      <Activity size={16} className="text-blue-400" /> Progress Timeline
                    </h3>

                    {historyLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-blue-400" size={28} />
                      </div>
                    ) : history.length > 0 ? (
                      <div className="relative space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                        {history.map((step, idx) => {
                          const stepCfg = getStatusConfig(step.status);
                          const isLatest = idx === history.length - 1;
                          const stepDate = toDate(step.created_at || step.timestamp);
                          return (
                            <div key={step.id || idx} className="relative pl-9">
                              <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-4 border-[#0a0a1f] z-10 flex items-center justify-center ${isLatest ? stepCfg.dot + ' shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-gray-600'}`}>
                                {isLatest && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <div className={`${isLatest ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'} border rounded-2xl p-4`}>
                                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold capitalize">{stepCfg.icon} {stepCfg.label}</span>
                                    {isLatest && <span className="bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">CURRENT</span>}
                                  </div>
                                  <span className="text-[11px] text-gray-500">{stepDate ? stepDate.toLocaleString() : '—'}</span>
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed">{step.notes || step.details || 'Status updated.'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10">
                        <Activity size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-gray-500 text-sm">No timeline events yet</p>
                        <p className="text-gray-600 text-xs mt-1">Your report is being processed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[32px] text-center p-10">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                  <Activity size={40} className="text-blue-400/50" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Select a Report</h2>
                <p className="text-gray-400 max-w-xs text-sm leading-relaxed">Choose a report from the left panel to view details, photo, and real-time progress timeline.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ReportIssue({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [issueType, setIssueType] = useState('Garbage');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latLng, setLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatLng({ lat, lng });
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            setLocation(data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          } catch (error) {
            setLocation(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          }
        }
      );
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1600px to strictly limit the base64 size well below 1MB while preserving deep details
          const MAX_SIZE = 1600;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // highly compressed JPEG (0.85 quality) to ensure crisp texts and edges ~500kb
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            setImage(compressedBase64);
          } else {
            // Fallback if canvas fails
            setImage(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image || !description || !location) {
      alert("Please fill all fields and upload an image.");
      return;
    }

    setAnalyzing(true);

    try {
      // 1. INTELLIGENT AI Validation: Check if photo + description together make a valid report
      const base64Data = image.split(',')[1];
      const validationResponse = await request('/api/gemini/public', {
        method: 'POST',
        body: JSON.stringify({
          prompt: `You are an intelligent validator for city issue reports. Your job is to analyze BOTH the image AND the user's description together to determine if this is a valid report.

IMPORTANT: The user's description provides CONTEXT for what to look for in the image. Do not reject just because you see a person - the person might be pointing at the issue, or the issue might be near the person.

User Selected Category: "${issueType}"
User Description: "${description}"

Your Analysis Process:
1. Carefully examine the ENTIRE image - look at background, corners, edges, all areas
2. Read the user's description carefully - they may indicate WHERE to look (e.g., "left side", "behind the person", "near the building")
3. Check if the described issue exists in the image, even if other objects (people, cars, etc.) are also present
4. Determine if the combination of photo + description constitutes a valid report

Validation Guidelines:
- If user says "look at left side" or mentions specific location → Check that location carefully
- If image shows a person AND garbage → VALID if reporting garbage (person provides scale/context)
- If image shows a person AND crime scene → VALID if reporting crime
- If image shows road AND damage/potholes → VALID for road damage (even if cars/people present)
- If user describes specific details → Those details MUST be visible in the image
- Reject ONLY if: The described issue is clearly NOT in the image, or description completely contradicts the image

Examples of VALID reports:
- Category: Crime, Description: "Theft happening at left side", Image: shows people and suspicious activity on left
- Category: Garbage, Description: "Pile of trash behind the person", Image: shows person with garbage visible behind them
- Category: Road Damage, Description: "Big pothole near the red car", Image: shows road with pothole and red car

Examples of INVALID reports:
- Category: Crime, Description: "Robbery in progress", Image: shows only empty street with no people
- Category: Garbage, Description: "Trash everywhere", Image: shows only a clean park with no garbage
- Category: Street Light, Description: "Broken light pole", Image: shows only a building with no street light

Return a JSON object with exactly these keys:
{
  "is_valid": boolean (true if photo+description together show the reported issue),
  "actual_content": string (describe everything you see in the image in detail),
  "detected_issue": string (what issue did you find that matches the report, or "none"),
  "issue_location": string (where in the image is the issue: left, right, center, background, foreground, etc.),
  "category_match": boolean (does the detected issue match the selected category?),
  "description_match": boolean (does the image support the specific details in the description?),
  "confidence": number (0-1, how confident are you),
  "reasoning": string (explain your decision: what did you see, where, and how it matches or doesn't match the description),
  "suggested_action": string (if valid, confirm; if invalid, explain what's wrong)
}`,
          images: [{ data: base64Data, mimeType: 'image/jpeg' }]
        })
      });

      let validationResult;
      try {
        validationResult = JSON.parse(validationResponse.response || "{}");
      } catch (e) {
        validationResult = { 
          is_valid: false, 
          reasoning: "AI validation failed. Please try again with a clearer photo that matches your selected category." 
        };
      }

      // 2. REJECT if validation fails
      if (!validationResult.is_valid) {
        setAnalyzing(false);
        alert(`⚠️ Report Rejected\n\nReason: ${validationResult.reasoning}\n\nWhat we detected in your photo:\n${validationResult.actual_content || 'Could not analyze image'}\n\nYour report:\n• Category: ${issueType}\n• Description: "${description}"\n\n💡 Tips for a valid report:\n1. Make sure the ${issueType.toLowerCase()} is clearly visible in your photo\n2. Your description should match what is in the image\n3. If describing a location (e.g., "left side"), make sure it's visible\n4. The main focus should be the ${issueType.toLowerCase()}, not other objects\n\nPlease try again with a more accurate photo and description.`);
        return;
      }

      // 3. If valid, proceed with categorization
      const categoryResponse = await request('/api/gemini/public', {
        method: 'POST',
        body: JSON.stringify({
          prompt: `Analyze this image for urban issues. Categorize it as one of: Garbage, Crime, Road Damage, Street Light, Other. Return a JSON object with exactly these keys: "category" (string matching the enum), "confidence" (number between 0 and 1), "description" (brief description of what is seen).`,
          images: [{ data: base64Data, mimeType: 'image/jpeg' }]
        })
      });

      let aiResult;
      try {
        aiResult = JSON.parse(categoryResponse.response || "{}");
      } catch (e) {
        aiResult = { category: issueType, confidence: 0.8, description: description };
      }

      // 4. Save to Backend
      await request('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          title: issueType,
          description: description,
          category: aiResult.category || issueType,
          location: location,
          image_url: image,
          ai_analysis: JSON.stringify({
            ...aiResult,
            validation: validationResult
          })
        })
      });

      // 5. Navigate to success
      navigate('/success', { state: { issueType: aiResult.category || issueType, location } });

    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 border-[3px] border-[#3b82f6]/30 rounded-full"></div>
          <div className="absolute inset-0 border-[3px] border-[#3b82f6] rounded-full border-t-transparent animate-spin"></div>
          <div className="flex flex-col items-center justify-center bg-[#00103a]/50 rounded-full w-32 h-32 backdrop-blur-sm">
            <Cpu size={40} className="text-[#3b82f6] mb-1" />
            <span className="text-[#3b82f6] font-bold text-xl">AI</span>
          </div>
          <Loader2 size={24} className="absolute bottom-6 text-[#3b82f6] animate-spin" />
        </div>
        <h2 className="text-3xl font-bold mb-3 tracking-tight">AI is analyzing<br/>your report</h2>
        <p className="text-gray-300 text-lg">Please wait...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-12 flex flex-col relative">
        <button onClick={() => navigate(-1)} className="self-start text-white flex items-center gap-2 hover:text-blue-300 transition-colors mb-6 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-4xl font-bold text-center mb-8 tracking-tight">Report an Issue</h1>
        
        <div className="relative group w-full mb-8">
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="report-photo" />
          <label 
            htmlFor="report-photo" 
            className="w-full bg-white/5 border border-white/20 rounded-[2rem] aspect-[4/3] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative"
          >
            {image ? (
              <img src={image} alt="Upload preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera size={48} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                <span className="text-gray-200 font-medium group-hover:text-white transition-colors">Upload Image</span>
              </>
            )}
          </label>
          
          {!image && (
            <div className="absolute bottom-4 inset-x-4 flex gap-2 sm:hidden z-10 opacity-90 backdrop-blur-sm p-1.5 rounded-xl bg-black/40">
               <label className="flex-1 text-center py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer border border-blue-400/50 hover:bg-blue-500 active:scale-95 transition-all">
                 <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                 <Camera size={16} className="inline mr-2"/>Camera
               </label>
               <label className="flex-1 text-center py-2.5 bg-purple-600 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer border border-purple-400/50 hover:bg-purple-500 active:scale-95 transition-all">
                 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                 Gallery
               </label>
            </div>
          )}
        </div>
        
        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Issue Type</label>
            <div className="relative">
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option className="text-black">Garbage</option>
                <option className="text-black">Crime</option>
                <option className="text-black">Road Damage</option>
                <option className="text-black">Street Light</option>
                <option className="text-black">Other</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={20} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold tracking-wider mb-2 uppercase text-gray-200">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Fetching location..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
        </div>
        
        <button onClick={handleSubmit} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-full py-4 font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-blue-500/30">
          Submit
        </button>
      </main>
    </div>
  );
}

function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { issueType?: string, location?: string } || {};

  return (
    <div className="flex-1 flex flex-col px-8 py-16 bg-[#f8fafc] text-gray-900 min-h-screen">
      <div className="max-w-md mx-auto w-full flex flex-col h-full">
        <div className="flex flex-col items-center text-center mb-12 mt-8">
          <div className="bg-[#16a34a] rounded-full p-5 mb-6 shadow-lg shadow-green-500/20">
            <CheckCircle size={64} className="text-white" strokeWidth={3} />
          </div>
          <h1 className="text-4xl font-bold text-[#16a34a] leading-tight tracking-tight">Report Submitted<br/>Successfully</h1>
        </div>
        
        <div className="space-y-6 flex-1 px-2">
          <div className="border-b border-gray-200 pb-4">
            <p className="text-gray-500 text-lg mb-1">Issue Type</p>
            <p className="text-2xl font-medium">{state.issueType || 'Garbage'}</p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <p className="text-gray-500 text-lg mb-1">Location</p>
            <p className="text-2xl font-medium">{state.location || 'Chattogram'}</p>
          </div>
          
          <div className="pb-4">
            <p className="text-gray-500 text-lg mb-1">AI Status</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-medium">Verified</p>
              <CheckCircle size={24} className="text-[#16a34a]" strokeWidth={3} />
            </div>
          </div>
        </div>
        
        <button onClick={() => navigate('/dashboard')} className="w-full mt-8 bg-[#16a34a] text-white rounded-full py-4 font-semibold text-lg hover:bg-[#15803d] transition-all active:scale-95 shadow-lg shadow-green-500/20">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// --- Admin Panel Components ---
function AdminDashboard({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 bg-[#00103a] text-white flex flex-col shadow-xl z-20 absolute md:relative h-full transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
          </div>
          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <BarChart3 size={20} /> Overview
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Users size={20} /> User Management
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <FileText size={20} /> All Reports
          </button>
          <button onClick={() => setActiveTab('ai-analyzer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'ai-analyzer' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Brain size={20} /> AI Analyzer
          </button>
          <button onClick={() => setActiveTab('manual-reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative ${activeTab === 'manual-reports' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <ShieldCheck size={20} /> Manual Review
            <span className="ml-auto text-[10px] font-bold bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">PENDING</span>
          </button>
          <button onClick={() => setActiveTab('activity')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'activity' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Activity size={20} /> Activity Logs
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Settings size={20} /> Settings
          </button>
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-blue-300 truncate">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 py-2 rounded-lg transition-colors text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        {/* Top Header (Mobile & Desktop) */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500 hover:text-gray-900" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
          </div>
        </header>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'reports' && <AdminReports />}
          {activeTab === 'ai-analyzer' && <AdminAIAnalyzer />}
          {activeTab === 'manual-reports' && <AdminManualReports />}
          {activeTab === 'activity' && <AdminActivity />}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </main>
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/api/admin/stats')
    .then(data => setStats(data))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 text-green-600 p-4 rounded-xl"><Activity size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-xl"><FileText size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Reports</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalReports || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-100 text-purple-600 p-4 rounded-xl"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Reviews</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalReviews || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> User Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.growth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-orange-500"/> Reports Overview</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.growth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="reports" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = () => {
    request('/api/admin/users')
    .then(data => setUsers(data))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, role: string, status: string) => {
    try {
      await request(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role, status })
      });
      fetchUsers();
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
    }
  };

  const confirmDeleteUser = (user: any) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await request(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' });
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nid_number?.includes(searchTerm)
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete User?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                {(userToDelete.photo_url || userToDelete.profile_photo_url) ? (
                  <img src={userToDelete.photo_url || userToDelete.profile_photo_url} alt={userToDelete.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {userToDelete.name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{userToDelete.name}</p>
                  <p className="text-sm text-gray-500">{userToDelete.email}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-6">
                {(selectedUser.photo_url || selectedUser.profile_photo_url) ? (
                  <img 
                    src={selectedUser.photo_url || selectedUser.profile_photo_url} 
                    alt={selectedUser.name} 
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                    {selectedUser.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-500">{selectedUser.email}</p>
                  {selectedUser.phone && <p className="text-gray-500">{selectedUser.phone}</p>}
                  <div className="flex gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedUser.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : 
                      selectedUser.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedUser.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 
                      selectedUser.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedUser.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* NID Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="text-blue-600" size={20} />
                  Identity Verification
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.nid_number && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">NID Number</p>
                      <p className="font-mono font-medium text-gray-900">{selectedUser.nid_number}</p>
                    </div>
                  )}
                  {selectedUser.birth_certificate_number && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Birth Certificate</p>
                      <p className="font-mono font-medium text-gray-900">{selectedUser.birth_certificate_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Face Match Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedUser.face_confidence > 0.8 ? 'bg-green-500' : selectedUser.face_confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium">{((selectedUser.face_confidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Verified</p>
                    <p className="font-medium">{selectedUser.is_verified ? 'Yes' : 'Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedUser.nid_photo_url && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">NID Document Photo</p>
                    <img 
                      src={selectedUser.nid_photo_url} 
                      alt="NID" 
                      className="w-full h-48 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedUser.nid_photo_url, '_blank')}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {selectedUser.selfie_photo_url && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Selfie Photo</p>
                    <img 
                      src={selectedUser.selfie_photo_url} 
                      alt="Selfie" 
                      className="w-full h-48 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedUser.selfie_photo_url, '_blank')}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {(selectedUser.photo_url || selectedUser.profile_photo_url) && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Profile Photo</p>
                    <img 
                      src={selectedUser.photo_url || selectedUser.profile_photo_url} 
                      alt="Profile" 
                      className="w-full h-48 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedUser.photo_url || selectedUser.profile_photo_url, '_blank')}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h5 className="font-bold text-gray-800 mb-4">Account Information</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Joined</p>
                    <p className="font-medium">{new Date(selectedUser.join_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{selectedUser.location || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User ID</p>
                    <p className="font-medium text-xs">{selectedUser.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-7xl mx-auto">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">User Management</h3>
            <p className="text-sm text-gray-500">{users.length} total users</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" 
              />
            </div>
            <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><Filter size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">NID/Document</th>
                <th className="px-6 py-4 font-semibold">Face Match</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      {(u.photo_url || u.profile_photo_url) ? (
                        <img src={u.photo_url || u.profile_photo_url} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {u.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      {u.fraud_alert === 1 && (
                        <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div>
                      {u.nid_number ? (
                        <p className="font-mono text-sm">NID: {u.nid_number}</p>
                      ) : u.birth_certificate_number ? (
                        <p className="font-mono text-sm">BC: {u.birth_certificate_number}</p>
                      ) : (
                        <p className="text-xs text-gray-400">No document</p>
                      )}
                      {u.nid_photo_url && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle size={12} /> Photo available
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.face_confidence > 0.8 ? 'bg-green-500' : u.face_confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium">{((u.face_confidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.role} 
                      onChange={(e) => handleUpdateRole(u.id, e.target.value, u.status)}
                      className={`text-sm rounded-full px-3 py-1 font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                        u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}
                      disabled={u.role === 'Super Admin'}
                    >
                      <option value="citizen">Citizen</option>
                      <option value="admin">Admin</option>
                      {u.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.status || 'active'} 
                      onChange={(e) => handleUpdateRole(u.id, u.role, e.target.value)}
                      className={`text-sm rounded-full px-3 py-1 font-medium border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' : 
                        u.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}
                      disabled={u.role === 'Super Admin'}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedUser(u)} 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => confirmDeleteUser(u)} 
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors" 
                        disabled={u.role === 'Super Admin'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminAIAnalyzer() {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'reports' | 'fraud' | 'fault_history'>('queue');
  const [reportQueue, setReportQueue] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [faultHistory, setFaultHistory] = useState<any[]>([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | number | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'queue') {
        const data = await request('/api/admin/report-queue');
        setReportQueue(data);
      } else if (activeSubTab === 'reports') {
        const data = await request('/api/admin/reports');
        setPendingReports(data.filter((r: any) => r.status === 'pending'));
      } else if (activeSubTab === 'fault_history') {
        const data = await request('/api/admin/fault-history');
        setFaultHistory(data);
      } else {
        const data = await request('/api/admin/users');
        setSuspiciousUsers(data.filter((u: any) => u.face_confidence < 0.8 || u.fraud_alert === 1));
      }
    } catch (err) {
      console.error('Fetch data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const analyzeUser = async (user: any) => {
    setAnalyzing(user.id);
    try {
      const prompt = `Analyze this user's identity verification data and determine if it's a "fraud" or "legitimate" account.
      User Name: ${user.name}
      Email: ${user.email}
      Face Recognition Confidence: ${user.face_confidence}
      Document Photo: ${user.doc_photo_url ? 'Provided' : 'Not Provided'}
      Live Photo: ${user.live_photo_url ? 'Provided' : 'Not Provided'}
      
      Provide the response in JSON format:
      {
        "is_fraud": boolean,
        "reasoning": "string",
        "confidence_score": number (0-1),
        "recommended_action": "block" | "verify_manually" | "approve",
        "fraud_type": "identity_theft" | "fake_document" | "low_match" | "none"
      }`;

      const response = await request('/api/gemini/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      const analysis = JSON.parse(response.response);
      setResults(prev => ({ ...prev, [user.id]: analysis }));
    } catch (err) {
      console.error('AI User Analysis failed:', err);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleUserAction = async (user: any, action: string) => {
    try {
      await request(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: action === 'block' ? 'blocked' : 'active',
          fraud_alert: action === 'block' ? 1 : 0
        })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to take user action:', err);
    }
  };

  const analyzeReport = async (report: any) => {
    setAnalyzing(report.id);
    try {
      const hasImage = !!(report.image_url);
      const prompt = `You are an expert city infrastructure analyst. Analyze this citizen-submitted city issue report.

Report Details:
- Title: ${report.title}
- Category: ${report.category}
- Description: ${report.description}
- Location: ${report.location}
- Photo Provided: ${hasImage ? 'Yes' : 'No'}
- Submitted by: ${report.user_name || report.user_email || 'Citizen'}

${hasImage ? 'An image has been provided with this report. Please analyze the image content as context.' : ''}

Determine if this report is legitimate and what action should be taken.

Provide your response ONLY as valid JSON:
{
  "is_correct": boolean,
  "reasoning": "detailed reason for your decision based on the report details",
  "recommended_action": "police" | "rescue" | "cleaner" | "none",
  "urgency": "low" | "medium" | "high",
  "sms_message": "short dispatch message for the response team"
}`;

      const requestBody: any = { prompt };

      // Send photo to AI - supports both base64 and HTTP URLs (convert HTTP to fetched base64)
      if (report.image_url) {
        if (report.image_url.startsWith('data:')) {
          // Already base64
          const base64Data = report.image_url.split(',')[1];
          const mimeType = report.image_url.split(';')[0].split(':')[1] || 'image/jpeg';
          requestBody.images = [{ data: base64Data, mimeType }];
        } else if (report.image_url.startsWith('http')) {
          // HTTP URL from Firebase Storage — fetch and convert to base64 for AI
          try {
            const imgRes = await fetch(report.image_url);
            const blob = await imgRes.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const base64Data = base64.split(',')[1];
            const mimeType = blob.type || 'image/jpeg';
            requestBody.images = [{ data: base64Data, mimeType }];
          } catch (fetchErr) {
            console.warn('Could not fetch image for AI analysis, proceeding without image:', fetchErr);
          }
        }
      }

      const response = await request('/api/gemini/generate', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      let analysis: any = {};
      try {
        const cleanJson = (response.response || '{}').replace(/```json|```/g, '').trim();
        analysis = JSON.parse(cleanJson);
      } catch (parseErr) {
        analysis = { is_correct: true, reasoning: response.response || 'Analysis complete', recommended_action: 'none', urgency: 'low' };
      }

      setResults(prev => ({ ...prev, [report.id]: analysis }));

      // Save analysis to database
      await request(`/api/admin/reports/${report.id}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ analysis: JSON.stringify(analysis) })
      });
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      alert('AI Analysis failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAnalyzing(null);
    }
  };

  const takeAction = async (report: any) => {
    const analysis = results[report.id];
    if (!analysis) return;

    try {
      // Move to pending_manual so it appears in Manual Review tab
      await request(`/api/admin/reports/${report.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'pending_manual',
          admin_notes: `AI Analysis: ${analysis.reasoning}. Recommended: ${analysis.is_correct ? 'APPROVE' : 'REJECT'} (${analysis.recommended_action})`,
          ai_analysis: JSON.stringify(analysis)
        })
      });
      alert(`✅ Report sent to Manual Review queue!\n\nAI Recommendation: ${analysis.is_correct ? 'APPROVE ✓' : 'REJECT ✗'}\n\nReasoning: ${analysis.reasoning}\n\nAdmin can now review the full report with photo in Manual Review section.`);
      fetchData();
    } catch (err) {
      console.error('Failed to process report:', err);
      alert('Failed to send to manual review. Please try again.');
    }
  };

  const handleManualApprove = async (reportId: string | number) => {
    try {
      await request(`/api/admin/fault-history/${reportId}/approve`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Manual approve failed:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-[#00103a] rounded-3xl p-8 text-white shadow-xl shadow-blue-900/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI System Analyzer</h2>
          <p className="text-blue-200 max-w-md">Advanced AI-powered analysis for city reports and user identity verification to prevent fraud and automate response.</p>
        </div>
        <div className="flex bg-white/10 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveSubTab('queue')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeSubTab === 'queue' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
          >
            AI Queue
          </button>
          <button 
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeSubTab === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
          >
            All Reports
          </button>
          <button 
            onClick={() => setActiveSubTab('fault_history')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeSubTab === 'fault_history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
          >
            Fault History
          </button>
          <button 
            onClick={() => setActiveSubTab('fraud')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeSubTab === 'fraud' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
          >
            Fraud Alerts
          </button>
        </div>
        <button onClick={fetchData} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2">
          <RefreshCw size={20} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : activeSubTab === 'queue' ? (
          reportQueue.length > 0 ? (
            reportQueue.map((report) => {
              const qDate = (() => { const v = report.created_at || report.createdAt; if (!v) return null; if (typeof v === 'string') return new Date(v); if (v._seconds) return new Date(v._seconds * 1000); if (v.seconds) return new Date(v.seconds * 1000); return null; })();
              return (
              <div key={report.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">AI Queue</span>
                    {report.user_name && <span className="text-gray-500 text-xs font-medium">by {report.user_name}</span>}
                    <span className="text-gray-400 text-xs">{qDate ? qDate.toLocaleString() : '—'}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{report.title}</h3>
                  <p className="text-gray-600 mb-4">{report.description}</p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={16} /> {report.location}
                  </div>
                  {report.image_url && (report.image_url.startsWith('http') || report.image_url.startsWith('data:')) && (
                    <img src={report.image_url} alt="Report" className="mt-3 w-full max-h-48 object-cover rounded-2xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div className="w-full md:w-80 flex flex-col gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  {!results[report.id] ? (
                    <button 
                      onClick={() => analyzeReport(report)}
                      disabled={analyzing === report.id}
                      className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {analyzing === report.id ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
                      {analyzing === report.id ? 'Analyze' : 'Analyze with AI'}
                    </button>
                  ) : (
                    <div className={`p-4 rounded-2xl border ${results[report.id].is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {results[report.id].is_correct ? <CheckCircle className="text-green-600" size={20} /> : <AlertCircle className="text-red-600" size={20} />}
                        <span className={`font-bold ${results[report.id].is_correct ? 'text-green-800' : 'text-red-800'}`}>
                          {results[report.id].is_correct ? 'Verified Correct' : 'Fault Report'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{results[report.id].reasoning}</p>
                      <button 
                        onClick={() => takeAction(report)}
                        className="w-full py-2 rounded-lg font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Send to Manual Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
              <h3 className="text-xl font-bold text-gray-800">Queue is Empty</h3>
              <p className="text-gray-500">No new reports waiting for AI analysis.</p>
            </div>
          )
        ) : activeSubTab === 'fault_history' ? (
          faultHistory.length > 0 ? (
            faultHistory.map((report) => (
              <div key={report.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 border-l-4 border-l-red-500">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Fault</span>
                    <span className="text-gray-400 text-xs">Rejected on {new Date(report.processed_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{report.title}</h3>
                  <p className="text-gray-600 mb-4">{report.description}</p>
                  {report.image_url && (report.image_url.startsWith('http') || report.image_url.startsWith('data:')) && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Report Photo</p>
                      <img 
                        src={report.image_url} 
                        alt="Report" 
                        className="w-full max-h-48 object-cover rounded-2xl border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(report.image_url, '_blank')}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}
                  <p className="text-sm text-red-800 bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
                    <strong>AI Reasoning:</strong> {typeof report.ai_analysis === 'string' ? report.ai_analysis : JSON.parse(JSON.stringify(report.ai_analysis)).reasoning}
                  </p>
                </div>
                <div className="w-full md:w-64 flex flex-col justify-center gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  <button 
                    onClick={() => handleManualApprove(report.id)}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> Manual Approve
                  </button>
                  <button className="text-gray-400 text-xs hover:text-red-600 transition-colors">Permanently Delete</button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShieldCheck size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
              <h3 className="text-xl font-bold text-gray-800">No Fault History</h3>
              <p className="text-gray-500">All reports in this category have been processed or cleared.</p>
            </div>
          )
        ) : activeSubTab === 'reports' ? (
          pendingReports.length > 0 ? (
            pendingReports.map((report) => (
              <div key={report.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{report.category}</span>
                    <span className="text-gray-400 text-xs">{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{report.title}</h3>
                  <p className="text-gray-600 mb-4">{report.description}</p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={16} /> {report.location}
                  </div>
                  {report.image_url && (report.image_url.startsWith('http') || report.image_url.startsWith('data:')) && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Report Photo</p>
                      <img 
                        src={report.image_url} 
                        alt="Report" 
                        className="w-full max-h-48 object-cover rounded-2xl border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(report.image_url, '_blank')}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}
                </div>
                <div className="w-full md:w-80 flex flex-col gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  {!results[report.id] ? (
                    <button 
                      onClick={() => analyzeReport(report)}
                      disabled={analyzing === report.id}
                      className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {analyzing === report.id ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
                      {analyzing === report.id ? 'Analyzing...' : 'Analyze with AI'}
                    </button>
                  ) : (
                    <div className={`p-4 rounded-2xl border ${results[report.id].is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {results[report.id].is_correct ? <CheckCircle className="text-green-600" size={20} /> : <AlertCircle className="text-red-600" size={20} />}
                        <span className={`font-bold ${results[report.id].is_correct ? 'text-green-800' : 'text-red-800'}`}>
                          {results[report.id].is_correct ? 'Verified Correct' : 'Fault Report'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{results[report.id].reasoning}</p>
                      <button 
                        onClick={() => takeAction(report)}
                        className="w-full py-2 rounded-lg font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Send to Manual Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
              <h3 className="text-xl font-bold text-gray-800">All Clear!</h3>
              <p className="text-gray-500">No pending reports to analyze at this time.</p>
            </div>
          )
        ) : (
          suspiciousUsers.length > 0 ? (
            suspiciousUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.fraud_alert ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      {u.fraud_alert ? 'Fraud Flagged' : 'Low Confidence'}
                    </span>
                    <span className="text-gray-400 text-xs">Joined {new Date(u.join_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{u.name}</h3>
                  <p className="text-gray-500 mb-4">{u.email}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Face Match Score</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${u.face_confidence > 0.8 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-lg font-bold">{(u.face_confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Identity Status</p>
                      <span className={`text-sm font-bold ${u.status === 'blocked' ? 'text-red-600' : 'text-green-600'}`}>
                        {u.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 flex flex-col gap-4 border-l border-gray-100 pl-0 md:pl-6">
                  {!results[u.id] ? (
                    <button 
                      onClick={() => analyzeUser(u)}
                      disabled={analyzing === u.id}
                      className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {analyzing === u.id ? <Loader2 className="animate-spin" size={20} /> : <Fingerprint size={20} />}
                      {analyzing === u.id ? 'Analyzing...' : 'Analyze Identity'}
                    </button>
                  ) : (
                    <div className={`p-4 rounded-2xl border ${!results[u.id].is_fraud ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {!results[u.id].is_fraud ? <CheckCircle className="text-green-600" size={20} /> : <AlertTriangle className="text-red-600" size={20} />}
                        <span className={`font-bold ${!results[u.id].is_fraud ? 'text-green-800' : 'text-red-800'}`}>
                          {!results[u.id].is_fraud ? 'Legitimate' : 'Fraud Detected'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{results[u.id].reasoning}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUserAction(u, results[u.id].is_fraud ? 'block' : 'active')}
                          className={`flex-1 py-2 rounded-lg font-bold transition-colors ${!results[u.id].is_fraud ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                        >
                          {!results[u.id].is_fraud ? 'Approve' : 'Block User'}
                        </button>
                        {results[u.id].is_fraud && (
                          <button 
                            onClick={() => handleUserAction(u, 'active')}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                          >
                            Ignore
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShieldCheck size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
              <h3 className="text-xl font-bold text-gray-800">No Fraud Detected</h3>
              <p className="text-gray-500">All users have passed identity verification successfully.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN MANUAL REPORTS - Full review panel with photo + approve/reject
// ============================================================
function AdminManualReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'pending_manual'>('all');
  const [imageModal, setImageModal] = useState<string | null>(null);

  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val.toDate === 'function') return val.toDate();
    return null;
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await request('/api/admin/manual-reports');
      setReports(data);
    } catch (err: any) {
      console.error('Failed to fetch manual reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleApprove = async (report: any) => {
    setActionLoading(report.id + '_approve');
    try {
      await request(`/api/admin/manual-reports/${report.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes || `Approved by administrator on ${new Date().toLocaleString()}` })
      });
      setSelectedReport(null);
      setAdminNotes('');
      await fetchReports();
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (report: any) => {
    setActionLoading(report.id + '_reject');
    try {
      await request(`/api/admin/manual-reports/${report.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes || `Rejected by administrator on ${new Date().toLocaleString()}` })
      });
      setSelectedReport(null);
      setAdminNotes('');
      await fetchReports();
    } catch (err: any) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'medium') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <ShieldCheck size={32} /> Manual Review Queue
            </h2>
            <p className="text-orange-100 max-w-md">
              Reports processed by AI awaiting your manual decision. View the photo, read the AI analysis, then Approve or Reject.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-2xl px-5 py-3 text-center">
              <p className="text-3xl font-bold">{reports.length}</p>
              <p className="text-sm text-orange-100">Pending Reports</p>
            </div>
            <button onClick={fetchReports} className="bg-white text-orange-600 p-3 rounded-xl hover:bg-orange-50 transition-colors">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 mt-6">
          {(['all', 'pending', 'pending_manual'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filter === f ? 'bg-white text-orange-600' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {f === 'all' ? 'All' : f === 'pending' ? 'New (Pending)' : 'AI Reviewed'}
            </button>
          ))}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {imageModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6" onClick={() => setImageModal(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 rounded-full p-2 hover:bg-white/30" onClick={() => setImageModal(null)}>
            <X size={28} />
          </button>
          <img src={imageModal} alt="Report Photo" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" referrerPolicy="no-referrer" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center z-10 rounded-t-3xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report Review</h3>
                <p className="text-sm text-gray-500 font-mono">ID: {selectedReport.id}</p>
              </div>
              <button onClick={() => { setSelectedReport(null); setAdminNotes(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Report Photo - ALWAYS SHOWN PROMINENTLY */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Report Photo</h4>
                {selectedReport.image_url ? (
                  <div className="relative group">
                    <img
                      src={selectedReport.image_url}
                      alt="Report Photo"
                      className="w-full max-h-72 object-cover rounded-2xl border-2 border-gray-100 cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm"
                      referrerPolicy="no-referrer"
                      onClick={() => setImageModal(selectedReport.image_url)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 text-white px-4 py-2 rounded-xl font-medium text-sm backdrop-blur-sm">
                        Click to enlarge
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(selectedReport.image_url, '_blank')}
                      className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors backdrop-blur-sm"
                    >
                      Open Full Size ↗
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No photo attached to this report</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Category</p>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">{selectedReport.category}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedReport.status === 'pending_manual' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedReport.status === 'pending_manual' ? '🤖 AI Reviewed' : '🆕 New Report'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Submitted By</p>
                  <div className="flex items-center gap-3">
                    {selectedReport.user_photo ? (
                      <img src={selectedReport.user_photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer"/>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {(selectedReport.user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{selectedReport.user_name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{selectedReport.user_email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Title</p>
                  <p className="text-xl font-bold text-gray-900">{selectedReport.title}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Description</p>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">{selectedReport.description}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Location</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={16} className="text-blue-500 shrink-0" />
                    <p className="text-sm">{selectedReport.location}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Submitted</p>
                  <p className="text-gray-700">{(() => { const d = toDate(selectedReport.created_at || selectedReport.createdAt); return d ? d.toLocaleString() : '—'; })()}</p>
                </div>
              </div>

              {/* AI Analysis Panel */}
              {selectedReport.ai_analysis && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                  <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                    <Brain size={20} className="text-purple-600" /> AI Analysis Results
                  </h4>
                  {(() => {
                    try {
                      const ai = typeof selectedReport.ai_analysis === 'string'
                        ? JSON.parse(selectedReport.ai_analysis)
                        : selectedReport.ai_analysis;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${ai.is_correct ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                              {ai.is_correct ? '✅ AI Recommends: APPROVE' : '❌ AI Recommends: REJECT'}
                            </span>
                            {ai.urgency && (
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getUrgencyColor(ai.urgency)}`}>
                                {ai.urgency?.toUpperCase()} urgency
                              </span>
                            )}
                          </div>
                          {ai.reasoning && <p className="text-sm text-gray-700 leading-relaxed"><strong>Reasoning:</strong> {ai.reasoning}</p>}
                          {ai.recommended_action && ai.recommended_action !== 'none' && (
                            <p className="text-sm text-gray-700"><strong>Dispatch:</strong> {ai.recommended_action}</p>
                          )}
                          {ai.sms_message && (
                            <div className="bg-white rounded-xl p-3 border border-purple-100">
                              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Suggested Dispatch Message</p>
                              <p className="text-sm text-gray-700 italic">"{ai.sms_message}"</p>
                            </div>
                          )}
                        </div>
                      );
                    } catch {
                      return <p className="text-sm text-gray-600">{String(selectedReport.ai_analysis)}</p>;
                    }
                  })()}
                </div>
              )}

              {selectedReport.admin_notes && (
                <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 mb-1">Previous Admin Notes</p>
                  <p className="text-sm text-yellow-800">{selectedReport.admin_notes}</p>
                </div>
              )}

              {/* Admin Decision */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold text-gray-800 mb-3">Your Decision & Notes</h4>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add notes for this decision (optional)..."
                  className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 bg-gray-50"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(selectedReport)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60 shadow-lg shadow-green-500/20"
                  >
                    {actionLoading === selectedReport.id + '_approve' ? <Loader2 className="animate-spin" size={22} /> : <CheckCircle size={22} />}
                    Approve Report
                  </button>
                  <button
                    onClick={() => handleReject(selectedReport)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60 shadow-lg shadow-red-500/20"
                  >
                    {actionLoading === selectedReport.id + '_reject' ? <Loader2 className="animate-spin" size={22} /> : <X size={22} />}
                    Reject Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={48} /></div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
          <ShieldCheck size={64} className="mx-auto mb-4 text-green-400 opacity-40" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">All Clear!</h3>
          <p className="text-gray-400">No reports pending manual review at this time.</p>
          <button onClick={fetchReports} className="mt-6 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => {
            const rDate = toDate(report.created_at || report.createdAt);
            let aiRec: any = null;
            if (report.ai_analysis) {
              try { aiRec = typeof report.ai_analysis === 'string' ? JSON.parse(report.ai_analysis) : report.ai_analysis; } catch {}
            }
            return (
              <div key={report.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Photo thumbnail */}
                  <div className="w-full md:w-48 shrink-0 h-48 md:h-auto bg-gray-100 relative overflow-hidden">
                    {report.image_url ? (
                      <img
                        src={report.image_url}
                        alt="Report"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => setImageModal(report.image_url)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Camera size={32} className="text-gray-300" />
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${report.status === 'pending_manual' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'}`}>
                      {report.status === 'pending_manual' ? '🤖 AI Done' : '🆕 New'}
                    </div>
                  </div>

                  {/* Report Content */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start gap-4 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{report.category}</span>
                          {aiRec && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${aiRec.is_correct ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                              AI: {aiRec.is_correct ? '✅ Approve' : '❌ Reject'}
                            </span>
                          )}
                          {aiRec?.urgency && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(aiRec.urgency)}`}>
                              {aiRec.urgency.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{report.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2 max-w-lg">{report.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{rDate ? rDate.toLocaleDateString() : '—'}</p>
                        <p className="text-xs text-gray-400">{rDate ? rDate.toLocaleTimeString() : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate max-w-sm">{report.location}</span>
                    </div>

                    {aiRec?.reasoning && (
                      <div className="bg-purple-50 rounded-xl p-3 mb-4 border border-purple-100">
                        <p className="text-xs text-purple-600 font-bold mb-1">AI REASONING</p>
                        <p className="text-xs text-purple-800 line-clamp-2">{aiRec.reasoning}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">By: <strong>{report.user_name || report.user_email || 'Unknown'}</strong></span>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => { setSelectedReport(report); setAdminNotes(''); }}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20"
                        >
                          <FileText size={16} /> View & Decide
                        </button>
                        <button
                          onClick={() => handleApprove(report)}
                          disabled={!!actionLoading}
                          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(report)}
                          disabled={!!actionLoading}
                          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Helper to safely convert Firestore timestamp or date string
  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val.toDate === 'function') return val.toDate();
    return null;
  };

  const fetchReports = () => {
    request('/api/admin/reports')
    .then(data => setReports(data))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    await request(`/api/admin/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    fetchReports();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-7xl mx-auto">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-800">Report Management</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search reports..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><Filter size={18} /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">ID</th>
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Location</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-gray-500">#{r.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{r.user_name || r.user_email || r.userId || '—'}</td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">{r.category}</span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate" title={r.location}>{r.location}</td>
                <td className="px-6 py-4">
                  <select 
                    value={r.status} 
                    onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                    className={`text-sm rounded-full px-3 py-1 font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                      r.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      r.status === 'initiated' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="initiated">Initiated</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{(() => { const d = toDate(r.created_at || r.createdAt); return d ? d.toLocaleDateString() : '—'; })()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setSelectedReport(r)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">Report Details #{selectedReport.id}</h3>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">User</label>
                  <p className="text-gray-900 font-medium">{selectedReport.user_name || selectedReport.user_email || selectedReport.userId || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Category</label>
                  <p className="text-gray-900 font-medium">{selectedReport.category}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</label>
                  <p className="text-gray-900 font-medium">{selectedReport.status}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Date</label>
                  <p className="text-gray-900 font-medium">{(() => { const d = toDate(selectedReport.created_at || selectedReport.createdAt); return d ? d.toLocaleString() : '—'; })()}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Location</label>
                <p className="text-gray-900">{selectedReport.location}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Description</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
              </div>

              {selectedReport.ai_analysis && (
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-blue-600" size={20} />
                    <h4 className="font-bold text-blue-900">AI Analysis</h4>
                  </div>
                  <div className="text-sm text-blue-800">
                    {(() => {
                      try {
                        const analysis = typeof selectedReport.ai_analysis === 'string' 
                          ? JSON.parse(selectedReport.ai_analysis) 
                          : selectedReport.ai_analysis;
                          
                        if (!analysis || typeof analysis !== 'object') {
                          return <p className="font-mono bg-blue-100 p-3 rounded-xl">{String(selectedReport.ai_analysis)}</p>;
                        }

                        return (
                          <div className="space-y-2">
                            {analysis.is_correct !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {analysis.is_correct ? 'AI Recommends: APPROVE' : 'AI Recommends: REJECT'}
                                </span>
                                <span className="text-xs text-gray-500">Confidence: {Math.round((analysis.confidence || 0) * 100)}%</span>
                              </div>
                            )}
                            {analysis.reasoning && <p><strong>Reasoning:</strong> {analysis.reasoning}</p>}
                            {analysis.recommended_action && analysis.recommended_action !== 'none' && (
                              <p><strong>Recommended Action:</strong> {analysis.recommended_action}</p>
                            )}
                            {analysis.urgency && <p><strong>Urgency:</strong> {analysis.urgency}</p>}
                          </div>
                        );
                      } catch (e) {
                         // Fallback for completely malformed analysis strings so React doesn't crash
                         const safeString = typeof selectedReport.ai_analysis === 'object' 
                           ? JSON.stringify(selectedReport.ai_analysis) 
                           : String(selectedReport.ai_analysis);
                         return <p className="font-mono whitespace-pre-wrap bg-blue-100/50 p-3 rounded-xl">{safeString}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {selectedReport.image_url && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Attached Image</label>
                  <img src={selectedReport.image_url} alt="Report" className="w-full rounded-2xl border border-gray-200 shadow-sm" />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-3xl">
              <div className="flex gap-2">
                {selectedReport.status === 'approved' && (
                  <button 
                    onClick={async () => {
                      await request(`/api/admin/reports/${selectedReport.id}/initiate`, { method: 'POST' });
                      fetchReports();
                      setSelectedReport(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <Send size={18} /> Initiate Action
                  </button>
                )}
                {selectedReport.status === 'initiated' && (
                  <button 
                    onClick={async () => {
                      await handleUpdateStatus(selectedReport.id, 'completed');
                      setSelectedReport(null);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> Mark Completed
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedReport(null)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminActivity() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/api/admin/logs')
    .then(data => setLogs(data))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-7xl mx-auto">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-800">System Activity Logs</h3>
        <button className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"><Calendar size={16}/> Filter by Date</button>
      </div>
      <div className="p-0">
        <ul className="divide-y divide-gray-100">
          {logs.map(log => (
            <li key={log.id} className="p-6 hover:bg-gray-50/50 transition-colors flex gap-4">
              <div className="mt-1">
                {log.action.includes('login') ? <LogOut size={20} className="text-blue-500 rotate-180" /> :
                 log.action.includes('report') ? <FileText size={20} className="text-orange-500" /> :
                 log.action.includes('user') ? <UserIcon size={20} className="text-green-500" /> :
                 <Activity size={20} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-900">{log.action.replace(/_/g, ' ').replace(/\b\w/g, (l:string) => l.toUpperCase())}</p>
                  <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                <p className="text-xs text-gray-400 font-mono">User: {log.user_name || `ID ${log.user_id}`}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <ShieldAlert className="text-red-500" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Security Settings</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Require Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Force all admins to use 2FA</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Session Timeout</p>
              <p className="text-sm text-gray-500">Automatically log out inactive admins</p>
            </div>
            <select className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <Settings className="text-gray-500" size={24} />
          <h3 className="text-xl font-bold text-gray-800">System Configuration</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email Address</label>
            <input type="email" defaultValue="support@City-Connect.com" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Image Upload Size (MB)</label>
            <input type="number" defaultValue="5" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" />
          </div>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Profile Component ---
function Profile({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [photoUrl, setPhotoUrl] = useState(user.photo_url || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user.profile_photo_url || '');
  const [parentNumber, setParentNumber] = useState(user.parent_number || '');
  const [parentEmail, setParentEmail] = useState(user.parent_email || '');
  const [relativeNumber, setRelativeNumber] = useState(user.relative_number || '');
  const [relativeEmail, setRelativeEmail] = useState(user.relative_email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ 
          name, 
          phone, 
          location, 
          photo_url: photoUrl, 
          profile_photo_url: profilePhotoUrl,
          parent_number: parentNumber, 
          parent_email: parentEmail,
          relative_number: relativeNumber,
          relative_email: relativeEmail 
        }),
      });
      if (data.user) {
        // Update the global user state with fresh data from server
        setUser(data.user);
        // Sync local state fields to avoid stale UI
        setName(data.user.name || name);
        setPhone(data.user.phone || phone);
        setLocation(data.user.location || location);
        setPhotoUrl(data.user.photo_url || data.user.profile_photo_url || photoUrl);
        setProfilePhotoUrl(data.user.profile_photo_url || data.user.photo_url || profilePhotoUrl);
        setParentNumber(data.user.parent_number || parentNumber);
        setParentEmail(data.user.parent_email || parentEmail);
        setRelativeNumber(data.user.relative_number || relativeNumber);
        setRelativeEmail(data.user.relative_email || relativeEmail);
      }
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await request('/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword })
      });
      setShowDeleteModal(false);
      setMessage(`Account permanently deleted. You will be logged out now.`);
      setTimeout(() => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      await request('/api/auth/cancel-deletion', { method: 'POST' });
      const data = await request('/api/auth/me');
      if (data.user) setUser(data.user);
      setMessage('Account deletion cancelled.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Maintain a 1080p-like resolution ceiling 
          const MAX_SIZE = 1600;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // highly quality JPEG (0.85) to retain details around 500kb max
            setProfilePhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setProfilePhotoUrl(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 flex flex-col items-center gap-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl h-fit">
            <div className="relative group">
              {profilePhotoUrl || photoUrl ? (
                <img src={profilePhotoUrl || photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-2xl" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center border-4 border-blue-500/30 shadow-2xl">
                  <UserIcon size={48} />
                </div>
              )}
              <label htmlFor="profile-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={24} />
                <input type="file" id="profile-upload" accept="image/*" onChange={handleManualPhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">{user.role}</span>
              
              {user.scheduled_deletion_at && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-xs text-red-200 mb-2">Scheduled for deletion on {new Date(user.scheduled_deletion_at).toLocaleDateString()}</p>
                  <button onClick={handleCancelDeletion} className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-lg hover:bg-red-500 transition-colors">Cancel Deletion</button>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
            {message && <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-xl mb-6 flex items-center gap-3"><CheckCircle size={20} /> {message}</div>}
            {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl mb-6 flex items-center gap-3"><AlertCircle size={20} /> {error}</div>}

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="City, Country" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Profile Photo URL</label>
                  <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="https://example.com/photo.jpg" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400"><ShieldAlert size={20} /> Emergency Contacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Parent's Phone Number</label>
                    <input type="text" value={parentNumber} onChange={(e) => setParentNumber(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="+1 234 567 890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Parent's Email Address</label>
                    <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="parent@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Relative's Phone Number</label>
                    <input type="text" value={relativeNumber} onChange={(e) => setRelativeNumber(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="+1 234 567 890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Relative's Email Address</label>
                    <input type="email" value={relativeEmail} onChange={(e) => setRelativeEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="relative@example.com" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400"><ShieldAlert size={20} /> Danger Zone</h3>
                <p className="text-sm text-gray-400 mb-4">Once you delete your account, there is no going back. Please be certain. Your account will be permanently removed after 30 days.</p>
                <button 
                  type="button" 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-red-600/20 border border-red-600 text-red-400 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all"
                >
                  Delete My Account
                </button>
              </div>

              {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <div className="bg-[#1a0b3c] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-400"><AlertTriangle size={24} /> Delete Account</h2>
                    <p className="text-gray-300 mb-6">This action will schedule your account for permanent deletion in 30 days. Please enter your password to confirm.</p>
                    
                    <form onSubmit={handleDeleteAccount} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Your Password</label>
                        <input 
                          type="password" 
                          required 
                          value={deletePassword} 
                          onChange={e => setDeletePassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                          type="button" 
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading}
                          className="flex-1 px-6 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" /> : 'Confirm Delete'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-xl py-4 font-bold text-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- AI Chat Page ---
function AIChatPage({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [messages, setMessages] = useState<{role: 'user'|'model', content: string, file_url?: string, file_type?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const history = await request('/api/chat/history');
      if (history.length === 0) {
        setMessages([{ role: 'model', content: `Hello ${user.name}! I am your personalized City-Connect AI. I can help you analyze reports, answer questions about city issues, or just chat. How can I assist you today?` }]);
      } else {
        setMessages(history);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (fileData?: { url: string, type: string }) => {
    if (!input.trim() && !fileData) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user' as const, content: userMsg, ...fileData }]);
    setInput('');
    setIsTyping(true);

    // Save user message (non-blocking)
    request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: userMsg, ...fileData })
    }).catch(() => {});

    try {
      const prompt = `You are a personalized AI assistant for City-Connect user ${user.name}. 
             Context: You help with city reports, safety, and general inquiries.
             User query: ${userMsg || (fileData ? '[File attached]' : '')}`;
             
      const data = await request('/api/gemini/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      
      const aiContent = data.response || 'I am sorry, I could not process that request.';
      setMessages(prev => [...prev, { role: 'model', content: aiContent }]);
      
      // Save AI message (non-blocking)
      request('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ role: 'model', content: aiContent })
      }).catch(() => {});
    } catch (error: any) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Error connecting to AI service. Please try again later.' }]);
    } finally {
      setIsTyping(false);
    }
  };


  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear your chat history?')) {
      await request('/api/chat/history', { method: 'DELETE' });
      setMessages([{ role: 'model', content: 'Chat history cleared. How can I help you now?' }]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, we'd upload to a bucket. Here we mock it.
      const mockUrl = URL.createObjectURL(file);
      handleSend({ url: mockUrl, type: file.type });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#00103a] text-white">
      <Navbar user={user} setUser={setUser} />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - History (Desktop) */}
        <div className="hidden md:flex w-64 bg-[#1e1b4b]/50 border-r border-white/10 flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg flex items-center gap-2"><Activity size={18} /> History</h2>
            <button onClick={clearHistory} className="text-gray-400 hover:text-red-400 transition-colors" title="Clear History">
              <Trash2 size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {messages.filter(m => m.role === 'user').map((m, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-xl text-sm truncate cursor-pointer hover:bg-white/10 transition-colors">
                {m.content || 'File Attachment'}
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 backdrop-blur-md border border-white/10 rounded-tl-none'}`}>
                    {msg.file_url && (
                      <div className="mb-3">
                        {msg.file_type?.startsWith('image/') ? (
                          <img src={msg.file_url} alt="Attachment" className="max-w-full rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                            <FileText size={20} /> <span className="text-xs truncate">Attachment</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-[#00103a] border-t border-white/10">
            <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                <Camera size={24} />
              </button>
              <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors">
                <Activity size={24} /> {/* Mock Voice */}
              </button>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything about your city..."
                className="flex-1 bg-transparent outline-none px-2 py-2"
              />
              <button onClick={() => handleSend()} className="bg-blue-600 p-3 rounded-xl hover:bg-blue-500 transition-all">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SOS Page ---
function SOSPage({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('');
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const startCountdown = () => {
    setCountdown(5);
    setIsActive(true);
    setStatus('Emergency Alert Initiated...');
  };

  const cancelSOS = () => {
    setCountdown(null);
    setIsActive(false);
    setStatus('');
  };

  const triggerSOS = async () => {
    setCountdown(null);
    setStatus('ESTABLISHING LIVE TRACKING & SENDING ALERTS...');
    
    let dynamicLink = 'Unknown Location';
    
    if (navigator.geolocation) {
       // Start tracking position continuously
       navigator.geolocation.watchPosition(
          (pos) => {
            console.log('Location Ping updated: ', pos.coords.latitude, pos.coords.longitude);
            // Example of dynamic tracking URL schema sent to contacts
            dynamicLink = `https://cityconnect.live/track?uuid=${user.id}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
          },
          (err) => console.warn(err),
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
       );

       // Initial grab to ensure the first ping is sent out immediately via Twilio
       try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject);
         });
         dynamicLink = `https://cityconnect.live/track?uuid=${user.id}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
       } catch(e) {}
    }

    try {
      await request('/api/sos/trigger', {
        method: 'POST',
        body: JSON.stringify({ 
          emergencyType: 'General Emergency',
          userLocation: dynamicLink,
          contactPhone: user.parent_number || user.relative_number,
          userName: user.name
        })
      });
      setStatus('TWILIO ALERTS SENT SUCCESSFULLY!');
    } catch (err: any) {
      setStatus('TWILIO DISPATCH FAILED: ' + err.message);
    }
    
    // Simulate finding nearby police stations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          setNearbyStations([
            { name: 'Central Police Station', distance: '0.8 km', phone: '911' },
            { name: 'District 4 Precinct', distance: '1.5 km', phone: '911' },
          ]);
        } catch (e) {}
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="min-h-screen bg-[#00103a] text-white">
      <Navbar user={user} setUser={setUser} />
      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        <div className="mb-12">
          <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-red-600 animate-ping' : 'bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)]'}`}>
            <ShieldAlert size={80} />
          </div>
        </div>

        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-red-500">EMERGENCY SOS</h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl">
          Pressing the button below will immediately notify your emergency contacts and local authorities with your real-time location.
        </p>

        {!isActive ? (
          <button 
            onClick={startCountdown}
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 rounded-full text-3xl font-black shadow-2xl shadow-red-600/40 transition-all active:scale-90"
          >
            TRIGGER SOS
          </button>
        ) : (
          <div className="space-y-8">
            {countdown !== null && (
              <div className="text-8xl font-black text-white animate-pulse">
                {countdown}
              </div>
            )}
            <button 
              onClick={cancelSOS}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full text-xl font-bold border border-white/20 transition-all"
            >
              CANCEL ALERT
            </button>
          </div>
        )}

        {status && (
          <div className={`mt-12 p-6 rounded-3xl border ${status.includes('SUCCESS') ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-red-500/20 border-red-500 text-red-300'} text-2xl font-bold animate-bounce`}>
            {status}
          </div>
        )}

        {nearbyStations.length > 0 && (
          <div className="mt-12 w-full text-left bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-blue-400" /> Nearby Emergency Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyStations.map((s, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="text-sm text-gray-400">{s.distance} away</p>
                  </div>
                  <a href={`tel:${s.phone}`} className="bg-blue-600 p-3 rounded-full hover:bg-blue-500 transition-colors">
                    <Zap size={20} />
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a 
                href={`https://www.google.com/maps/search/police+station+near+me`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center justify-center gap-2"
              >
                View all on Google Maps <ArrowLeft className="rotate-180" size={16} />
              </a>
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Parent Contact</p>
            <input 
               type="text" 
               defaultValue={user.parent_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ parent_number: e.target.value }) }).then(() => setUser({...user, parent_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Relative Contact</p>
            <input 
               type="text" 
               defaultValue={user.relative_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ relative_number: e.target.value }) }).then(() => setUser({...user, relative_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>
          </div>
        </div>
      </main>
    </motion.div>
  );
}

// --- Contact Footer Component ---
function ContactFooter() {
  return (
    <div className="w-full bg-[#000824] py-12 px-6 md:px-12 lg:px-20 border-t border-white/5 border-b border-white/5">
      <div className="max-w-5xl mx-auto text-center mb-8">
        <h2 className="text-3xl font-extrabold text-[#c89613] mb-2">Contact Me</h2>
        <p className="text-gray-400 text-sm">Have a project in mind or want to collaborate? Feel free to reach out!</p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side */}
        <div className="space-y-6 text-left">
          <h3 className="text-xl font-bold text-white mb-4">Get in Touch</h3>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#c89613]/20 flex items-center justify-center text-[#c89613] shrink-0">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Phone / WhatsApp</p>
              <p className="text-white font-medium text-base">+880 1888-668396</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#c89613]/20 flex items-center justify-center text-[#c89613] shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Email</p>
              <p className="text-white font-medium text-base">meshoron53@gmail.com</p>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-gray-400 text-xs mb-3">Connect on Social</p>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-[#25d366] hover:bg-[#1fa14d] text-white px-4 py-2 text-sm rounded-md font-medium transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button className="flex items-center gap-2 bg-[#1f2328] hover:bg-[#161a1d] text-white px-4 py-2 text-sm rounded-md font-medium transition-colors border border-gray-700">
                <Github size={16} /> GitHub
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="bg-[#00103a] p-6 rounded-2xl border border-white/10 shadow-lg">
          <form className="space-y-4 flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Full Name" className="w-full bg-[#000824] border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#c89613] transition-colors text-sm" />
            <input type="email" placeholder="Email Address" className="w-full bg-[#000824] border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#c89613] transition-colors text-sm" />
            <textarea placeholder="Your Message" rows={3} className="w-full bg-[#000824] border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#c89613] transition-colors resize-none text-sm"></textarea>
            <button className="w-full bg-[#c89613] hover:bg-[#a67c0f] text-white font-bold py-3 text-sm rounded-md transition-colors flex items-center justify-center gap-2">
              SEND MESSAGE <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // Only show on the main homepage
  if (location.pathname !== '/') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[350px] md:w-[400px] shadow-2xl rounded-2xl overflow-hidden border border-white/10 backdrop-blur-2xl bg-[#00103a]/95">
          <div className="bg-[#c89613] text-white p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Brain size={20} />
              <h3 className="font-bold">City-Connect AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-4">
            <HomepageChatBox isEmbedded={true} />
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#c89613] hover:bg-[#a67c0f] text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(200,150,19,0.4)] transition-all hover:scale-110 active:scale-95 border-2 border-white/20"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
