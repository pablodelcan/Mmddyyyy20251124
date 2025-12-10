import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuthModalProps {
  onSuccess: (accessToken: string, userId: string) => void;
  onClose?: () => void;
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
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

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email: normalizedEmail, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setLoading(false);
        return;
      }

      // After sign up, sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email: normalizedEmail, newPassword: password })
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

  const modalContent = (
    <>
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          margin: 0,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '363.34px',
            height: mode === 'signup' ? '485.75px' : '385.75px',
            backgroundColor: '#FDF5ED',
            borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
            borderWidth: '0.54px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              width: '302.28px',
              height: '22.49px',
              position: 'absolute',
              top: '20px',
              left: '30.53px',
              opacity: 1,
            }}
          >
            <div
              style={{
                width: '68px',
                height: '23px',
                position: 'absolute',
                top: '-0.32px',
                left: '117.01px',
                opacity: 1,
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.5px',
                  letterSpacing: '0.75px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {mode === 'signup' ? 'CREATE ACCOUNT' : mode === 'signin' ? 'SIGN IN' : 'RESET PASSWORD'}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: '70px',
              paddingLeft: '30.53px',
              paddingRight: '30.53px',
              paddingBottom: '30.53px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              flex: 1,
              overflowY: 'auto',
            }}
          >
            {mode === 'signup' && (
              <div>
                <label style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  textTransform: 'uppercase',
                  color: 'rgba(0, 0, 0, 0.6)',
                  display: 'block',
                  marginBottom: '8px',
                }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
                    outline: 'none',
                    padding: '8px 0',
                    fontFamily: 'Courier New',
                    fontSize: '15px',
                    color: '#000000',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                textTransform: 'uppercase',
                color: 'rgba(0, 0, 0, 0.6)',
                display: 'block',
                marginBottom: '8px',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                required
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
                  outline: 'none',
                  padding: '8px 0',
                  fontFamily: 'Courier New',
                  fontSize: '15px',
                  color: '#000000',
                }}
              />
            </div>

            <div>
              <label style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                textTransform: 'uppercase',
                color: 'rgba(0, 0, 0, 0.6)',
                display: 'block',
                marginBottom: '8px',
              }}>
                {mode === 'forgot' ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
                  outline: 'none',
                  padding: '8px 0',
                  fontFamily: 'Courier New',
                  fontSize: '15px',
                  color: '#000000',
                }}
              />
            </div>

            {error && (
              <div style={{
                textAlign: 'center',
                color: '#D84341',
                fontFamily: 'Courier New',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                textAlign: 'center',
                color: '#22c55e',
                fontFamily: 'Courier New',
                fontSize: '13px',
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : mode === 'signin' ? 'Sign In' : 'Reset Password'}
            </button>
          </form>

          <div style={{
            paddingLeft: '30.53px',
            paddingRight: '30.53px',
            paddingBottom: 0,
            marginTop: '22.18px',
            textAlign: 'center',
          }}>
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(0, 0, 0, 0.6)',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                textAlign: 'center',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div style={{
            paddingLeft: '30.53px',
            paddingRight: '30.53px',
            paddingBottom: '20px',
            marginTop: '6.5px',
            textAlign: 'center',
          }}>
            <button
              onClick={() => {
                setMode('forgot');
                setError('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(0, 0, 0, 0.6)',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                textAlign: 'center',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Forgot Password?
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
