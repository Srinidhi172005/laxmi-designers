import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

interface AdminLoginProps {
  /** Resolves to an error message, or null when the sign-in succeeded. */
  onLogin: (email: string, password: string) => Promise<string | null>;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const message = await onLogin(email.trim(), password);
    setLoading(false);
    if (message) {
      setError(message);
      setPassword("");
    }
  };

  return (
    <div className="min-h-[72vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-cream-100 border border-[#D4AF37]/30 rounded-xl p-8 shadow-xl">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto rounded-full bg-maroon-900 flex items-center justify-center mb-3 border border-gold-500/30">
            <Lock className="w-6 h-6 text-gold-300" />
          </div>
          <h2 className="font-display font-bold text-xl text-maroon-900 uppercase tracking-[0.15em]">Admin Login</h2>
          <p className="text-xs text-espresso/60 mt-1.5">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="text-[11px] font-bold uppercase tracking-wider text-espresso/70 block mb-1.5">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full bg-cream-50 border border-gold-500/25 rounded-md px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:border-gold-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="text-[11px] font-bold uppercase tracking-wider text-espresso/70 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-cream-50 border border-gold-500/25 rounded-md px-3.5 py-2.5 pr-10 text-sm text-espresso focus:outline-none focus:border-gold-500 transition-colors"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso/50 hover:text-maroon-900 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-maroon-900 hover:bg-maroon-800 text-gold-300 border border-gold-500 font-bold text-xs tracking-[0.15em] uppercase rounded-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="flex items-center justify-center gap-1.5 text-[10px] text-espresso/40 mt-6 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> Authorized access only
        </p>
      </div>
    </div>
  );
}
