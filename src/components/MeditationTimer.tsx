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
  const totalSeconds = durationMinutes * 60;

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
  
  // Calculate progress (0 to 1) - 0 is start (dark), 1 is end (bright)
  const progress = 1 - (timeLeft / totalSeconds);
  
  // Sunrise color transitions
  const getSunriseColors = (progress: number) => {
    if (progress < 0.2) {
      // Deep night to early dawn (dark navy to deep purple)
      const t = progress / 0.2;
      return {
        top: interpolateColor('#0a0e27', '#1a1b3d', t),
        middle: interpolateColor('#0a0e27', '#2d1b3d', t),
        bottom: interpolateColor('#0a0e27', '#3d2742', t),
      };
    } else if (progress < 0.4) {
      // Dawn to early sunrise (purple to pink/orange)
      const t = (progress - 0.2) / 0.2;
      return {
        top: interpolateColor('#1a1b3d', '#4a3b5c', t),
        middle: interpolateColor('#2d1b3d', '#7d4e6d', t),
        bottom: interpolateColor('#3d2742', '#c44569', t),
      };
    } else if (progress < 0.6) {
      // Sunrise (pink/orange to warm light)
      const t = (progress - 0.4) / 0.2;
      return {
        top: interpolateColor('#4a3b5c', '#a16f8f', t),
        middle: interpolateColor('#7d4e6d', '#e5989b', t),
        bottom: interpolateColor('#c44569', '#ffb4a2', t),
      };
    } else if (progress < 0.8) {
      // Morning light (warm to bright)
      const t = (progress - 0.6) / 0.2;
      return {
        top: interpolateColor('#a16f8f', '#e8c4b8', t),
        middle: interpolateColor('#e5989b', '#ffd6a5', t),
        bottom: interpolateColor('#ffb4a2', '#ffe5d0', t),
      };
    } else {
      // Full daylight (bright warm tones)
      const t = (progress - 0.8) / 0.2;
      return {
        top: interpolateColor('#e8c4b8', '#fef3e2', t),
        middle: interpolateColor('#ffd6a5', '#fef5ed', t),
        bottom: interpolateColor('#ffe5d0', '#fdf5ed', t),
      };
    }
  };

  const colors = getSunriseColors(progress);
  
  // Interpolate text color from white to black
  const textColor = interpolateColor('#ffffff', '#000000', progress);
  const closeButtonColor = progress > 0.5 ? 'black' : 'white';
  const closeButtonHover = progress > 0.5 ? 'hover:bg-black/5' : 'hover:bg-white/10';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, ${colors.top}, ${colors.middle}, ${colors.bottom})`,
        transition: 'background 2s ease-in-out',
      }}
    >
      {/* Timer Display */}
      <div className="relative z-10 text-center">
        <motion.div
          key={timeLeft}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="tracking-tight font-mono-label"
          style={{ 
            color: textColor, 
            transition: 'color 2s ease-in-out'
          }}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </motion.div>
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={`absolute top-6 right-6 h-10 w-10 rounded-full ${closeButtonHover} z-20`}
        style={{ transition: 'all 2s ease-in-out' }}
      >
        <X className="h-5 w-5" style={{ color: closeButtonColor, transition: 'color 2s ease-in-out' }} />
      </Button>
    </motion.div>
  );
};

function interpolateColor(color1: string, color2: string, progress: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}