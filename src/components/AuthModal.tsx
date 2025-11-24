import { useState } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuthModalProps {
  onSuccess: (accessToken: string, userId: string) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = getSupabaseClient();

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setLoading(false);
        return;
      }

      // After sign up, sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      onSuccess(signInData.session!.access_token, signInData.user!.id);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      onSuccess(data.session!.access_token, data.user!.id);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, newPassword: password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setSuccess('Password has been reset! You can now sign in with your new password.');
      setPassword('');
      setLoading(false);
      
      // Auto switch to sign in after 2 seconds
      setTimeout(() => {
        setMode('signin');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      handleSignUp();
    } else if (mode === 'signin') {
      handleSignIn();
    } else if (mode === 'forgot') {
      handleForgotPassword();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-[375px] m-4 p-8 bg-[#fdf5ed] border border-black/10"
      >
        <h2 className="uppercase tracking-wider mb-6 text-center">
          {mode === 'signup' ? 'Create Account' : mode === 'signin' ? 'Sign In' : 'Reset Password'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="uppercase tracking-wider text-black/60 block mb-2 font-mono-label">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
              />
            </div>
          )}

          <div>
            <label className="uppercase tracking-wider text-black/60 block mb-2 font-mono-label">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          <div>
            <label className="uppercase tracking-wider text-black/60 block mb-2 font-mono-label">
              {mode === 'forgot' ? 'New Password' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          {error && (
            <div className="text-center" style={{ color: '#D84341' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-center">
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-black/90 text-white rounded-none"
          >
            {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : mode === 'signin' ? 'Sign In' : 'Reset Password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
            }}
            className="text-black/60 hover:text-black transition-colors"
          >
            {mode === 'signup' 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-2 text-center">
          <button
            onClick={() => {
              setMode('forgot');
              setError('');
            }}
            className="text-black/60 hover:text-black transition-colors"
          >
            Forgot Password?
          </button>
        </div>
      </motion.div>
    </div>
  );
}