import React, { useState } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface TimerModalProps {
  onClose: () => void;
  onSetTimer: (minutes: number) => void;
  onClearTimer?: () => void;
  taskText: string;
  hasActiveTimer?: boolean;
}

export function TimerModal({ onClose, onSetTimer, onClearTimer, taskText, hasActiveTimer }: TimerModalProps) {
  const [minutes, setMinutes] = useState<string>('');

  const handleSet = () => {
    const mins = parseInt(minutes);
    if (mins && mins > 0) {
      onSetTimer(mins);
      onClose();
    }
  };

  const quickOptions = [5, 10, 15, 30, 60];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] bg-white p-6 shadow-lg"
        style={{ fontFamily: 'Terminal, monospace' }}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="mb-1">Set Timer</h2>
            <p className="text-black/60 text-[12px] break-words pr-4">{taskText}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 rounded-full hover:bg-black/5 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Quick options */}
          <div className="grid grid-cols-5 gap-2">
            {quickOptions.map((mins) => (
              <Button
                key={mins}
                variant="outline"
                onClick={() => {
                  onSetTimer(mins);
                  onClose();
                }}
                className="h-10 px-2 border-black/20 hover:bg-black/5"
              >
                {mins}m
              </Button>
            ))}
          </div>

          {/* Custom input */}
          <div className="space-y-2">
            <p className="text-[12px] text-black/60">Custom (minutes)</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSet()}
                placeholder="Enter minutes"
                className="flex-1 bg-transparent border-0 border-b border-black/20 focus:border-black outline-none px-0 py-1"
                style={{ fontFamily: 'Terminal, monospace', fontSize: '14px' }}
                autoFocus
              />
              <Button
                onClick={handleSet}
                variant="outline"
                className="px-4 border-black/20 hover:bg-black/5"
              >
                Set
              </Button>
            </div>
          </div>

          {/* Clear timer option */}
          {hasActiveTimer && onClearTimer && (
            <div className="pt-2 border-t border-black/10">
              <Button
                onClick={() => {
                  onClearTimer();
                  onClose();
                }}
                variant="outline"
                className="w-full border-black/20 hover:bg-black/5 text-[#D84341]"
              >
                Clear Timer
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}