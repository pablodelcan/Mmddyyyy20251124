import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

// Type definition for Wake Lock API
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

interface MeditationTimerProps {
  onComplete: (minutes: number) => void;
  onClose: () => void;
  durationMinutes: number;
}

export const MeditationTimer = ({ onComplete, onClose, durationMinutes }: MeditationTimerProps) => {
  const [endTime] = useState(() => Date.now() + durationMinutes * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request screen wake lock to prevent phone from sleeping
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        // Check if Screen Wake Lock API is supported
        if ('wakeLock' in navigator && navigator.wakeLock) {
          const wakeLock = await navigator.wakeLock.request('screen');
          wakeLockRef.current = wakeLock;

          // Handle wake lock release (e.g., when user switches tabs or screen locks)
          wakeLock.addEventListener('release', () => {
            // Try to reacquire if timer is still running
            if (!hasCompletedRef.current) {
              requestWakeLock();
            }
          });
        }
      } catch (err) {
        // Wake lock request failed (e.g., user denied permission or not supported)
        console.log('Wake lock not available:', err);
      }
    };

    requestWakeLock();

    // Reacquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !hasCompletedRef.current) {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Release wake lock when component unmounts or timer ends
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
          // Ignore errors when releasing
        });
        wakeLockRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame-like approach with short interval for accuracy
    // Calculate remaining time from endTime each tick to prevent drift
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Release wake lock when timer completes
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => { });
          wakeLockRef.current = null;
        }
        // Use setTimeout to defer the onComplete call to avoid setState during render
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => onComplete(durationMinutes), 0);
        }
      }
    }, 100); // Check every 100ms for more accurate timing

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Release wake lock on cleanup
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => { });
        wakeLockRef.current = null;
      }
    };
  }, [onComplete, durationMinutes, endTime]);

  // Release wake lock when user closes the timer
  const handleClose = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => { });
      wakeLockRef.current = null;
    }
    onClose();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0B0E27',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Timer Display */}
      <motion.div
        key={timeLeft}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{
          color: '#FEFEFE',
          fontFamily: 'Courier New',
          fontSize: '15px',
          fontWeight: 700,
          lineHeight: '22.5px',
          letterSpacing: '-0.38px',
          textAlign: 'center',
        }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </motion.div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '35px',
          right: '25px',
          width: '45px',
          height: '45px',
          borderRadius: '17981000px',
          paddingRight: '0.01px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="45" height="45" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.4921 14.9982L14.994 22.4963" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.994 14.9982L22.4921 22.4963" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
};