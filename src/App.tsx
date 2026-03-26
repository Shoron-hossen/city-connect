import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { Phone, Mail, MessageCircle, Github, MapPin, Trash2, Cctv, Zap, Lightbulb, Brain, Camera, CheckCircle, ChevronDown, Loader2, Cpu, MessageSquare, X, Send, Menu, LogOut, User as UserIcon, AlertCircle, AlertTriangle, ArrowLeft, Users, FileText, Activity, Settings, Search, Filter, Shield, ShieldAlert, ShieldCheck, BarChart3, TrendingUp, Calendar, RefreshCw, Fingerprint, Moon, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// --- Types ---
interface User {
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
function Navbar({ user, setUser }: { user: User | null, setUser: (user: User | null) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/ai-chat') || location.pathname.startsWith('/sos') || location.pathname.startsWith('/my-reports');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="bg-[#00103a] text-white py-4 px-6 md:px-12 flex justify-between items-center shadow-md sticky top-0 z-40 backdrop-blur-md bg-opacity-90 border-b border-white/10">
      <Link to={user ? (user.role === 'Super Admin' ? "/admin" : "/dashboard") : "/"} className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <MapPin className="text-blue-400" /> CityConnect
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {!isDashboard && (user?.role !== 'Super Admin') && <Link to="/" className="hover:text-blue-300 transition-colors font-medium">Home</Link>}
        {!isDashboard && (user?.role !== 'Super Admin') && <Link to="/about" className="hover:text-blue-300 transition-colors font-medium">About Us</Link>}
        
        {user && isDashboard && (user.role !== 'Super Admin') && (
          <>
            <Link to="/ai-chat" className="flex items-center gap-2 hover:text-blue-300 transition-colors font-medium">
              <Brain size={18} className="text-purple-400" /> AI Chat
            </Link>
            <Link to="/my-reports" className="flex items-center gap-2 hover:text-blue-300 transition-colors font-medium">
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
                {user.photo_url ? (
                  <img src={user.photo_url} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 object-cover" referrerPolicy="no-referrer" />
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
      <p>&copy; {new Date().getFullYear()} CityConnect. A Hub Connecting Citizens with City Services.</p>
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
      
      if (result.match && result.confidence > 0.7) {
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
        setter(reader.result as string);
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
            {step === 0 && 'Sign up to join the CityConnect network.'}
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
                    <label htmlFor="doc-photo" className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all overflow-hidden">
                      {photo ? (
                        <img src={photo} alt="Document" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={32} className="text-gray-500 mb-2 group-hover:text-blue-400 transition-colors" />
                          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">NID/Birth Cert Photo</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest mb-3 uppercase text-gray-400">Upload Clear Profile Photo</label>
                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setProfilePhoto)} className="hidden" id="profile-photo" />
                    <label htmlFor="profile-photo" className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all overflow-hidden">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <UserIcon size={32} className="text-gray-500 mb-2 group-hover:text-blue-400 transition-colors" />
                          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Clear Selfie/Photo</span>
                        </>
                      )}
                    </label>
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
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@cityconnect.com" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
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
    { role: 'ai', text: 'Hi! Ask me anything about CityConnect services.' }
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
        body: JSON.stringify({ prompt: `You are the CityConnect public Assistant. Be concise. User query: ${trimmed}` })
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
            <h1 className="text-4xl font-bold mb-2 tracking-tight">CityConnect</h1>
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
          
          <HomepageChatBox />
        </div>

        <div className="hidden md:flex w-full md:w-1/2 flex-col">
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
          <h1 className="text-5xl font-bold mb-8 tracking-tight text-center">About CityConnect</h1>
          
          <div className="space-y-8 text-lg text-gray-200 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">Our Mission</h2>
              <p>
                CityConnect is a smart city management platform designed to bridge the gap between citizens and local authorities. 
                Our mission is to empower residents to take an active role in improving their urban environment through technology and transparency.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">How It Works</h2>
              <p>
                Using advanced AI and real-time data processing, CityConnect allows users to report infrastructure issues, 
                public safety concerns, and environmental problems instantly. Our AI analysis categorizes and prioritizes 
                reports, ensuring that the right city departments can respond efficiently.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4">Our Vision</h2>
              <p>
                We envision a future where every city is a "Smart City" – where data-driven decisions lead to safer streets, 
                cleaner neighborhoods, and more responsive governance. CityConnect is the first step towards that future.
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
  const navigate = useNavigate();

  useEffect(() => {
    request('/api/reports')
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  const fetchHistory = async (reportId: number) => {
    setHistoryLoading(true);
    try {
      const data = await request(`/api/reports/${reportId}/history`);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReportClick = (report: any) => {
    setSelectedReport(report);
    fetchHistory(report.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'initiated': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white">
      <Navbar user={user} setUser={setUser} />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-4xl font-bold tracking-tight">My Reports</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reports List */}
          <div className="lg:col-span-1 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-400" size={40} />
              </div>
            ) : reports.length > 0 ? (
              reports.map((report) => (
                <div 
                  key={report.id} 
                  onClick={() => handleReportClick(report)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer ${selectedReport?.id === report.id ? 'bg-white/15 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1 truncate">{report.title}</h3>
                  <p className="text-gray-400 text-sm flex items-center gap-1 truncate">
                    <MapPin size={14} /> {report.location.split(',')[0]}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-gray-400">No reports submitted yet</p>
                <button onClick={() => navigate('/report')} className="mt-4 text-blue-400 font-medium">Submit your first report</button>
              </div>
            )}
          </div>

          {/* Report Details & Timeline */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 md:p-10 sticky top-24">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                      <span className="text-gray-400 text-sm">{selectedReport.category}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{selectedReport.title}</h2>
                    <p className="text-gray-300 text-lg mb-6 leading-relaxed">{selectedReport.description}</p>
                    <div className="flex items-center gap-2 text-gray-400 bg-white/5 w-fit px-4 py-2 rounded-2xl border border-white/5">
                      <MapPin size={18} className="text-blue-400" />
                      <span className="text-sm">{selectedReport.location}</span>
                    </div>
                  </div>
                  {selectedReport.image_url && (
                    <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden border border-white/10 shrink-0">
                      <img src={selectedReport.image_url} alt="Report" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <Activity size={20} className="text-blue-400" /> Progress Timeline
                  </h3>
                  
                  <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                    {historyLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-blue-400" />
                      </div>
                    ) : history.map((step, idx) => (
                      <div key={step.id} className="relative pl-10">
                        <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#1a0b3c] z-10 ${idx === history.length - 1 ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}></div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg capitalize">{step.status}</span>
                            <span className="text-xs text-gray-400">{new Date(step.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-400 text-sm">{step.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[40px] text-center p-10">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Activity size={48} className="text-blue-400/30" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Select a Report</h2>
                <p className="text-gray-400 max-w-xs">Choose a report from the list to track its real-time progress and timeline.</p>
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
        setImage(reader.result as string);
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
      // 1. Analyze image with server Gemini endpoint
      const base64Data = image.split(',')[1];
      const response = await request('/api/gemini/public', {
        method: 'POST',
        body: JSON.stringify({
          prompt: `Analyze this image for urban issues. Categorize it as one of: Garbage, Crime, Road Damage, Street Light, Other. Return a JSON object with exactly these keys: "category" (string matching the enum), "confidence" (number between 0 and 1), "description" (brief description of what is seen).`,
          images: [{ data: base64Data, mimeType: 'image/jpeg' }]
        })
      });

      let aiResult;
      try {
        aiResult = JSON.parse(response.response || "{}");
      } catch (e) {
        aiResult = { category: issueType, confidence: 0.8, description: "AI analysis failed, using user input." };
      }

      // 2. Save to Backend
      request('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          title: issueType,
          description: description,
          category: aiResult.category || issueType,
          location: location,
          image_url: image.substring(0, 1000), // Truncated for demo
          ai_analysis: JSON.stringify(aiResult)
        })
      });

      // 3. Navigate to success with state
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
        
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/5 border border-white/20 rounded-[2rem] aspect-[4/3] flex flex-col items-center justify-center gap-4 mb-8 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden relative"
        >
          {image ? (
            <img src={image} alt="Upload preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <Camera size={48} className="text-gray-300" />
              <span className="text-gray-200 font-medium">Upload Image</span>
            </>
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
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <BarChart3 size={20} /> Overview
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Users size={20} /> User Management
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <FileText size={20} /> Reports
          </button>
          <button onClick={() => setActiveTab('ai-analyzer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'ai-analyzer' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Brain size={20} /> AI Analyzer
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

  const fetchUsers = () => {
    request('/api/admin/users')
    .then(data => setUsers(data))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (id: number, role: string, status: string) => {
    await request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role, status })
    });
    fetchUsers();
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('Are you sure you want to delete this user? This will also remove them from Firebase Auth and Firestore.')) {
      try {
        await request(`/api/admin/users/${id}`, { method: 'DELETE' });
        fetchUsers();
      } catch (err: any) {
        alert('Failed to delete user: ' + err.message);
      }
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-7xl mx-auto">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-800">User Management</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><Filter size={18} /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Face Match</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                    {u.fraud_alert === 1 && (
                      <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{u.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${u.face_confidence > 0.8 ? 'bg-green-500' : u.face_confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">{(u.face_confidence * 100).toFixed(1)}%</span>
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
                    value={u.status} 
                    onChange={(e) => handleUpdateRole(u.id, u.role, e.target.value)}
                    className={`text-sm rounded-full px-3 py-1 font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                      u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                    disabled={u.role === 'Super Admin'}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(u.join_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={u.role === 'Super Admin'}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      const prompt = `Analyze this city report and determine if it's a "correct" or "fault" (fake/incorrect) report. 
      Report Title: ${report.title}
      Category: ${report.category}
      Description: ${report.description}
      Location: ${report.location}
      
      If it's correct, recommend the necessary action (dispatch to police, rescue team, or sanitation/cleaner).
      Provide the response in JSON format:
      {
        "is_correct": boolean,
        "reasoning": "string",
        "recommended_action": "police" | "rescue" | "cleaner" | "none",
        "urgency": "low" | "medium" | "high",
        "sms_message": "string (a short message to send to the team)"
      }`;

      const requestBody: any = { prompt };
      
      if (report.image_url && report.image_url.startsWith('data:')) {
        const base64Data = report.image_url.split(',')[1];
        const mimeType = report.image_url.split(';')[0].split(':')[1];
        requestBody.images = [{ data: base64Data, mimeType }];
      }

      const response = await request('/api/gemini/generate', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const analysis = JSON.parse(response.response || '{}');
      setResults(prev => ({ ...prev, [report.id]: analysis }));
      
      // Save analysis to database
      await request(`/api/admin/reports/${report.id}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ analysis: response.response })
      });
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzing(null);
    }
  };

  const takeAction = async (report: any) => {
    const analysis = results[report.id];
    if (!analysis) return;

    try {
      if (activeSubTab === 'queue') {
        const response = await request(`/api/admin/report-queue/${report.id}/process`, {
          method: 'POST',
          body: JSON.stringify({ 
            analysis, 
            isApproved: analysis.is_correct 
          })
        });
        if (response.success) fetchData();
      } else {
        // Legacy/Direct Action
        if (analysis.is_correct) {
          await request(`/api/admin/reports/${report.id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
              status: 'approved',
              admin_notes: `AI Analysis: ${analysis.reasoning}`
            })
          });
          await request(`/api/admin/reports/${report.id}/initiate`, {
            method: 'POST',
            body: JSON.stringify({ 
              notes: `AI Dispatched: ${analysis.recommended_action}. SMS: ${analysis.sms_message}`
            })
          });
        } else {
          await request(`/api/admin/reports/${report.id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
              status: 'rejected',
              admin_notes: `AI Analysis (Fault): ${analysis.reasoning}`
            })
          });
        }
        fetchData();
      }
    } catch (err) {
      console.error('Failed to take action:', err);
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
            reportQueue.map((report) => (
              <div key={report.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Queue</span>
                    <span className="text-gray-400 text-xs">{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{report.title}</h3>
                  <p className="text-gray-600 mb-4">{report.description}</p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={16} /> {report.location}
                  </div>
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
                        className={`w-full py-2 rounded-lg font-bold transition-colors ${results[report.id].is_correct ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      >
                        {results[report.id].is_correct ? 'Approve & Move' : 'Reject & Move to Faults'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
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
                        className={`w-full py-2 rounded-lg font-bold transition-colors ${results[report.id].is_correct ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      >
                        {results[report.id].is_correct ? 'Initiate Action' : 'Reject Report'}
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

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);

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
                <td className="px-6 py-4 font-medium text-gray-900">{r.user_name}</td>
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
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
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
                  <p className="text-gray-900 font-medium">{selectedReport.user_name}</p>
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
                  <p className="text-gray-900 font-medium">{new Date(selectedReport.created_at).toLocaleString()}</p>
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
                  <div className="text-sm text-blue-800 prose prose-blue max-w-none">
                    <ReactMarkdown>{JSON.parse(selectedReport.ai_analysis).summary || selectedReport.ai_analysis}</ReactMarkdown>
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
            <input type="email" defaultValue="support@cityconnect.com" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5" />
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
      await request('/api/auth/profile', {
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
      const data = await request('/api/auth/me');
      if (data.user) setUser(data.user);
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword })
      });
      setShowDeleteModal(false);
      setMessage(`Account scheduled for deletion on ${new Date(data.scheduledDate).toLocaleDateString()}. You will be logged out.`);
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
        setProfilePhotoUrl(reader.result as string);
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
        setMessages([{ role: 'model', content: `Hello ${user.name}! I am your personalized CityConnect AI. I can help you analyze reports, answer questions about city issues, or just chat. How can I assist you today?` }]);
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
      const prompt = `You are a personalized AI assistant for CityConnect user ${user.name}. 
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
    setStatus('FETCHING LOCATION & SENDING ALERTS...');
    
    let locationStr = 'Unknown Location';
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 15000, 
            enableHighAccuracy: true,
            maximumAge: 0
          });
        });
        locationStr = `${position.coords.latitude},${position.coords.longitude}`;
      } catch (e) {
        console.warn('Could not get location:', e);
        // Fallback to user's stored location if available
        if (user.location) {
          locationStr = user.location + ' (Stored Location)';
        }
      }
    }

    try {
      await request('/api/sos/alert', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'I am in an emergency! Please help me.',
          location: locationStr
        })
      });
      setStatus('ALERTS SENT SUCCESSFULLY!');
    } catch (err: any) {
      setStatus('ERROR SENDING ALERTS: ' + err.message);
    }
    
    // Simulate finding nearby police stations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Mocking nearby stations for demo
          setNearbyStations([
            { name: 'Central Police Station', distance: '0.8 km', phone: '911' },
            { name: 'District 4 Precinct', distance: '1.5 km', phone: '911' },
          ]);
        } catch (e) {}
      });
    }

    // Simulate SMS/Call alerts
    console.log(`SOS ALERT: Sending SMS to Parent (${user.parent_number}) and Relative (${user.relative_number})`);
    console.log(`SOS ALERT: Calling Emergency Services...`);
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
            <p className="text-xl font-mono">{user.parent_number || 'Not Set'}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Relative Contact</p>
            <p className="text-xl font-mono">{user.relative_number || 'Not Set'}</p>
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
              <h3 className="font-bold">CityConnect AI</h3>
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
