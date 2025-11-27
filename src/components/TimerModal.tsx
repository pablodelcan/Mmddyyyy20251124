import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  const modalContent = (
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
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '363.34px',
          backgroundColor: '#FDF5ED',
          borderTop: '0.54px solid rgba(0, 0, 0, 0.5)',
          borderWidth: '0.54px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          pointerEvents: 'auto',
          fontFamily: 'Courier New, Courier, monospace', // Apply font here
          color: '#000000',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'Courier New, Courier, monospace',
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
            Set Timer
          </div>
          <Button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 0,
              background: 'transparent',
              border: 'none',
              padding: 0,
              width: 'auto',
              height: 'auto',
              minWidth: 'auto',
            }}
          >
            <X className="h-4 w-4" style={{ color: '#000000' }} />
          </Button>
        </div>

        <div
          style={{
            marginTop: '70px',
            paddingLeft: '30.53px',
            paddingRight: '30.53px',
            paddingBottom: '30.53px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', margin: 0, padding: 0, wordWrap: 'break-word' }}>{taskText}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {quickOptions.map((mins) => (
              <Button
                key={mins}
                onClick={() => {
                  onSetTimer(mins);
                  onClose();
                }}
                style={{
                  backgroundColor: '#FDF5ED',
                  border: '0.54px solid rgba(0, 0, 0, 0.5)',
                  borderRadius: '17981000px',
                  color: '#000000',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontWeight: 700,
                  fontSize: '15px',
                  height: '40px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {mins}m
              </Button>
            ))}
          </div>

          <div>
            <label style={{ fontFamily: 'Courier New, Courier, monospace', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.6)', display: 'block', marginBottom: '8px' }}>Custom (minutes)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSet()}
                placeholder="Enter minutes"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.54px solid rgba(0, 0, 0, 0.5)',
                  outline: 'none',
                  padding: '8px 0',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontSize: '15px',
                  color: '#000000',
                }}
                autoFocus
              />
              <Button
                onClick={handleSet}
                style={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 15px',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Set
              </Button>
            </div>
          </div>

          {hasActiveTimer && onClearTimer && (
            <div style={{ paddingTop: '15px', borderTop: '0.54px solid rgba(0, 0, 0, 0.5)' }}>
              <Button
                onClick={() => {
                  onClearTimer();
                  onClose();
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#FDF5ED',
                  border: '0.54px solid rgba(0, 0, 0, 0.5)',
                  borderRadius: '17981000px',
                  color: '#D84341',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontWeight: 700,
                  fontSize: '15px',
                  height: '40px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Clear Timer
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}