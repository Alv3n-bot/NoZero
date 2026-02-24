import { useState } from "react";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("> [ERROR] Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 font-mono flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Terminal window card */}
        <div className="bg-gray-900 border border-purple-500 rounded-sm shadow-2xl shadow-purple-900/40">
          {/* Title bar */}
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-purple-700">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-pink-400 text-sm font-mono ml-2">&gt; auth_login.exe</span>
          </div>

          <div className="p-8">
            {/* Logo / Title */}
            <div className="text-center mb-8">
              <div className="text-purple-400 text-4xl font-bold tracking-widest mb-1">
                &gt; NoZero_
              </div>
              <div className="text-gray-500 text-xs tracking-widest">
                PERSONAL DEVELOPMENT TERMINAL v1.0
              </div>
            </div>

            {/* Boot text */}
            <div className="bg-gray-950 border border-gray-800 rounded-sm p-4 mb-8 space-y-1">
              <p className="text-green-400 text-xs">&gt; System initialized...</p>
              <p className="text-green-400 text-xs">&gt; Loading modules... <span className="text-pink-400">[OK]</span></p>
              <p className="text-green-400 text-xs">&gt; Firebase connected... <span className="text-pink-400">[OK]</span></p>
              <p className="text-yellow-400 text-xs">&gt; Awaiting authentication...</p>
              <span className="inline-block w-2 h-4 bg-pink-400 animate-pulse" />
            </div>

            {/* Login button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full group relative bg-gray-950 border border-purple-500 hover:border-pink-500 text-gray-200 hover:text-pink-400 font-mono text-sm py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {/* Google icon SVG */}
              {!loading && (
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? (
                <span className="text-pink-400">&gt; AUTHENTICATING...</span>
              ) : (
                <span>&gt; LOGIN WITH GOOGLE</span>
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="mt-4 text-red-400 text-xs text-center">{error}</div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-gray-600 text-xs space-y-1">
              <p>// Secure authentication via Google OAuth 2.0</p>
              <p>// Your data is stored privately in Firestore</p>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute -inset-1 bg-purple-600/10 rounded-sm blur-xl -z-10 pointer-events-none" />
      </div>
    </div>
  );
}

export default Login;