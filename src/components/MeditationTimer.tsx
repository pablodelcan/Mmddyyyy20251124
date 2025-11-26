import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface MeditationTimerProps {
  onComplete: (minutes: number) => void;
  onClose: () => void;
  durationMinutes: number;
}

export const MeditationTimer = ({ onComplete, onClose, durationMinutes }: MeditationTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // Convert minutes to seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Use setTimeout to defer the onComplete call to avoid setState during render
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setTimeout(() => onComplete(durationMinutes), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onComplete, durationMinutes]);

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
        onClick={onClose}
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