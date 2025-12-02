import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { X, Mail, Calendar, TrendingUp, Send, Database } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface SettingsModalProps {
  onClose: () => void;
  accessToken: string;
  onSignOut?: () => void;
  dateOfBirth: string | null;
  onSaveDateOfBirth: (date: string) => void;
  expectedLifespan: number;
  onSaveLifespan: (years: number) => void;
  meditationDuration: number;
  onSaveMeditationDuration: (minutes: number) => void;
  totalMeditationMinutes: number;
  onAddManualMeditation: (minutes: number) => void;
}

interface Preferences {
  email: string;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0 = Sunday, 1 = Monday, etc.
}

export function SettingsModal({ onClose, accessToken, onSignOut, dateOfBirth, onSaveDateOfBirth, expectedLifespan, onSaveLifespan, meditationDuration, onSaveMeditationDuration, totalMeditationMinutes, onAddManualMeditation }: SettingsModalProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    email: '',
    weeklyReportEnabled: true, // Set to true by default
    weeklyReportDay: 0 // Default to Sunday
  });
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customLifespan, setCustomLifespan] = useState(expectedLifespan.toString());
  
  // Refs for debouncing autosave
  const savePreferencesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveLifespanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  // Update customLifespan when expectedLifespan prop changes
  useEffect(() => {
    setCustomLifespan(expectedLifespan.toString());
  }, [expectedLifespan]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savePreferencesTimeoutRef.current) {
        clearTimeout(savePreferencesTimeoutRef.current);
      }
      if (saveLifespanTimeoutRef.current) {
        clearTimeout(saveLifespanTimeoutRef.current);
      }
    };
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.preferences && Object.keys(data.preferences).length > 0) {
          setPreferences({
            email: data.preferences.email || '',
            weeklyReportEnabled: data.preferences.weeklyReportEnabled || false,
            weeklyReportDay: data.preferences.weeklyReportDay ?? 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDataStatus = async () => {
    try {
      // Check localStorage
      const localData = localStorage.getItem('todos');
      console.log('=== Data Check ===');
      console.log('LocalStorage todos:', localData ? JSON.parse(localData) : 'Empty');

      // Check server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/todos`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const serverData = await response.json();
        console.log('Server todos:', serverData.todos);

        const localCount = localData ? Object.keys(JSON.parse(localData)).length : 0;
        const serverCount = serverData.todos ? Object.keys(serverData.todos).length : 0;

        toast.success(`Found ${serverCount} days on server, ${localCount} days in local storage`);
      }
    } catch (err) {
      console.error('Failed to check data:', err);
      toast.error('Failed to check data status');
    }
  };

  // Autosave preferences with debouncing
  const savePreferences = useCallback(async (showToast = false) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ preferences })
        }
      );

      if (response.ok) {
        if (showToast) {
          toast.success('Settings saved');
        }
      } else {
        console.error('Failed to save preferences');
        if (showToast) {
          toast.error('Failed to save settings');
        }
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      if (showToast) {
        toast.error('Failed to save settings');
      }
    }
  }, [accessToken, preferences]);

  // Debounced autosave for preferences
  const autosavePreferences = useCallback(() => {
    if (savePreferencesTimeoutRef.current) {
      clearTimeout(savePreferencesTimeoutRef.current);
    }
    savePreferencesTimeoutRef.current = setTimeout(() => {
      savePreferences(false); // Don't show toast for autosave
    }, 1000); // Wait 1 second after last change
  }, [savePreferences]);

  // Debounced autosave for lifespan
  const autosaveLifespan = useCallback(() => {
    if (saveLifespanTimeoutRef.current) {
      clearTimeout(saveLifespanTimeoutRef.current);
    }
    saveLifespanTimeoutRef.current = setTimeout(() => {
      const lifespan = parseInt(customLifespan, 10);
      if (!isNaN(lifespan) && lifespan > 0 && lifespan <= 120) {
        onSaveLifespan(lifespan);
      }
    }, 1000); // Wait 1 second after last change
  }, [customLifespan, onSaveLifespan]);

  // Autosave preferences when they change
  useEffect(() => {
    if (!loading) {
      autosavePreferences();
    }
    return () => {
      if (savePreferencesTimeoutRef.current) {
        clearTimeout(savePreferencesTimeoutRef.current);
      }
    };
  }, [preferences, loading, autosavePreferences]);

  // Autosave lifespan when it changes
  useEffect(() => {
    if (!loading && customLifespan !== expectedLifespan.toString()) {
      autosaveLifespan();
    }
    return () => {
      if (saveLifespanTimeoutRef.current) {
        clearTimeout(saveLifespanTimeoutRef.current);
      }
    };
  }, [customLifespan, loading, expectedLifespan, autosaveLifespan]);

  const testWeeklyEmail = async () => {
    if (!preferences.email) {
      toast.error('Please enter an email address first');
      return;
    }

    setTesting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/test-weekly-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ email: preferences.email })
        }
      );

      if (response.ok) {
        toast.success(`Test email sent to ${preferences.email}! Check your inbox.`);
      } else {
        const errorData = await response.json();
        console.error('Test email failed:', errorData);
        toast.error(`Failed to send test email: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to send test email:', err);
      toast.error('Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 50,
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
      >
        <div style={{
          width: '375px',
          padding: '32px',
          background: '#FDF5ED',
          border: '0.54px solid rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '15px',
            lineHeight: '22.5px',
            color: 'rgba(0, 0, 0, 0.6)',
            textAlign: 'center',
          }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#fdf5ed] z-50 flex flex-col"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        width: '100%',
        height: '59.98444366455078px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
            paddingLeft: '22.5px',
            paddingRight: '22.5px',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        <h2 style={{
          fontFamily: 'Courier New',
          fontWeight: 700,
          fontSize: '15px',
          lineHeight: '22.5px',
          letterSpacing: '0px',
          color: '#000000',
        }}>
          Settings
        </h2>
        <button
          onClick={async () => {
            // Save any pending changes before closing
            if (savePreferencesTimeoutRef.current) {
              clearTimeout(savePreferencesTimeoutRef.current);
              await savePreferences(false);
            }
            if (saveLifespanTimeoutRef.current) {
              clearTimeout(saveLifespanTimeoutRef.current);
              const lifespan = parseInt(customLifespan, 10);
              if (!isNaN(lifespan) && lifespan > 0 && lifespan <= 120) {
                onSaveLifespan(lifespan);
              }
            }
            onClose();
          }}
          style={{
            width: '29.99222183227539px',
            height: '29.99222183227539px',
            borderRadius: '17981000px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X style={{ color: '#000000', width: '14.996110916137695px', height: '14.996110916137695px' }} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div 
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '24px',
          paddingBottom: 'calc(24px + 50px + 20px + env(safe-area-inset-bottom))',
          position: 'relative',
        }}
        onScroll={(e) => {
          // Stop scroll event from bubbling to document level
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          // Allow touch scrolling within this element
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // Allow touch scrolling within this element
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          // Allow touch scrolling within this element
          e.stopPropagation();
        }}
        onWheel={(e) => {
          // Allow wheel scrolling within this element
          e.stopPropagation();
        }}
      >
        <div className="max-w-[375px] mx-auto">
          {/* Email Address */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px', marginBottom: '2px' }}>
              <Mail style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Email address
              </span>
            </label>
            <input
              type="email"
              value={preferences.email}
              onChange={(e) => setPreferences({ ...preferences, email: e.target.value })}
              onBlur={() => {
                // Save immediately when user leaves the email field
                if (savePreferencesTimeoutRef.current) {
                  clearTimeout(savePreferencesTimeoutRef.current);
                }
                savePreferences(false);
              }}
              placeholder="your@email.com"
              style={{
                width: '100%',
                height: '38.02px',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
                paddingTop: '7.5px',
                paddingBottom: '7.5px',
                paddingLeft: '0',
                paddingRight: '0',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '100%',
                letterSpacing: '0px',
                color: '#000000',
              }}
              className="placeholder:text-black/50 outline-none transition-colors"
            />
          </div>

          {/* Weekly Report */}
          <div
            className="border-t border-black/10 pt-4"
            style={{
              height: '83.00192260742188px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              marginTop: '22.5px', // Updated top margin to 22.5px
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> {/* Changed to alignItems: 'center' and justifyContent: 'space-between' */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
                  <TrendingUp style={{
                    width: '14.996110916137695px',
                    height: '14.996110916137695px',
                    color: '#000000',
                  }} />
                  <span style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                  }}>
                    Weekly report
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreferences({
                  ...preferences,
                  weeklyReportEnabled: !preferences.weeklyReportEnabled
                })}
                style={{
                  width: '41.24558639526367px',
                  height: '22.49835205078125px',
                  borderRadius: '17981000px',
                  transition: 'background-color 0.2s',
                  backgroundColor: preferences.weeklyReportEnabled ? '#000000' : 'rgba(0,0,0,0.2)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  padding: '1.88px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-in-out`}
                  style={{
                    transform: preferences.weeklyReportEnabled ? 'translateX(19.36px)' : 'translateX(0px)',
                  }}
                />
              </button>
            </div>

            {preferences.weeklyReportEnabled && (
              <div style={{ display: 'flex', gap: '1.5px', justifyContent: 'space-between', marginLeft: '0px', marginRight: '0px' }}>
                {['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setPreferences({
                      ...preferences,
                      weeklyReportDay: index
                    })}
                    style={{
                      width: '29.99222183227539px',
                      height: '29.99222183227539px',
                      borderRadius: '17981000px',
                      padding: 0, // Removed paddingRight: '0.01px' and set to 0 for perfect centering
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s, color 0.2s',
                      backgroundColor: preferences.weeklyReportDay === index ? '#000000' : 'rgba(0,0,0,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontFamily: 'Courier New',
                      fontWeight: 700,
                      fontSize: '11px',
                      lineHeight: '16.5px',
                      letterSpacing: '0px',
                      textAlign: 'center',
                      color: preferences.weeklyReportDay === index ? '#FFFFFF' : '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      width: '100%',
                    }}>{day}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test Email */}
          <div
            style={{
              width: '100%',
              height: '83.01029968261719px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '11.25px',
              marginTop: '22.5px',
            }}
          >
            <p
              style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
                margin: 0, // Remove default paragraph margin
              }}
            >
              Send test weekly report
            </p>
            <Button
              onClick={testWeeklyEmail}
              disabled={testing || !preferences.email}
              style={{
                width: '100%',
                height: '33.743343353271484px',
                background: '#000000',
                color: '#FFFFFF',
                borderRadius: '0', // Ensure sharp corners if not already
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px', // Default gap for icon and text
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Send style={{ color: '#FFFFFF', width: '14.996110916137695px', height: '14.996110916137695px' }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#FFFFFF',
              }}>
                {testing ? 'Sending...' : 'Send test'}
              </span>
            </Button>
          </div>

          {/* Data Recovery */}
          <div
            style={{
              width: '100%',
              height: '83.01029968261719px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '11.24px',
              marginTop: '22.5px', // 22.5px below the previous section
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <Database style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Data recovery
              </span>
            </div>
            <Button
              onClick={checkDataStatus}
              style={{
                width: '100%',
                height: '33.743343353271484px',
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                cursor: 'pointer',
              }}
            >
              <Database style={{ color: '#000000', width: '14.996110916137695px', height: '14.996110916137695px' }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#000000',
              }}>
                Check data status
              </span>
            </Button>
          </div>

          {/* Date of Birth */}
          <div
            style={{
              width: '100%',
              height: '139.75437927246094px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '7.49px',
              marginTop: '22.5px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <Calendar style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Date of birth
              </span>
            </label>
            <p
              style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: 'rgba(0,0,0,0.6)',
                margin: 0,
                marginTop: '7.17px', // 7.17px below the date of birth text
              }}
            >
              Required for "Life in Weeks" visualization
            </p>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="date"
                value={dateOfBirth || ''}
                onChange={(e) => onSaveDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  height: '38.01359176635742px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.54px solid rgba(0,0,0,0.2)',
                  paddingTop: '7.5px',
                  paddingBottom: '7.5px',
                  paddingLeft: '0',
                  paddingRight: '0',
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.5px',
                  letterSpacing: '0px',
                  color: '#000000',
                }}
                className="outline-none transition-colors date-of-birth-input"
              />
              {!dateOfBirth && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                  }}
                >
                  mm/dd/yyyy
                </div>
              )}
            </div>
          </div>

          {/* Expected Lifespan */}
          <div
            style={{
              width: '100%',
              height: '139.75437927246094px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '7.49px',
              marginTop: '22.5px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <TrendingUp style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Expected lifespan
              </span>
            </label>
            <p
              style={{
                width: '100%',
                height: '45px',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: 'rgba(0,0,0,0.6)',
                margin: 0,
                marginTop: '7.17px',
              }}
            >
              Used to calculate "Life in Weeks" grid (default: 80 years)
            </p>
            <input
              type="number"
              value={customLifespan}
              onChange={(e) => setCustomLifespan(e.target.value)}
              onBlur={() => {
                // Save immediately when user leaves the lifespan field
                if (saveLifespanTimeoutRef.current) {
                  clearTimeout(saveLifespanTimeoutRef.current);
                }
                const lifespan = parseInt(customLifespan, 10);
                if (!isNaN(lifespan) && lifespan > 0 && lifespan <= 120) {
                  onSaveLifespan(lifespan);
                }
              }}
              min="1"
              max="120"
              style={{
                width: '100%',
                height: '38.01359176635742px',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.54px solid rgba(0,0,0,0.2)',
                paddingTop: '7.5px',
                paddingBottom: '7.5px',
                paddingLeft: '0',
                paddingRight: '0',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
                marginTop: '7.49px',
              }}
              className="outline-none transition-colors"
            />
          </div>

          {/* Meditation Duration */}
          <div
            style={{
              width: '100%',
              height: '139.75437927246094px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '7.49px',
              marginTop: '30px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <TrendingUp style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Meditation duration
              </span>
            </label>
            <p
              style={{
                width: '100%',
                height: '45px',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: 'rgba(0,0,0,0.6)',
                margin: 0,
                marginTop: '7.17px',
              }}
            >
              Set the default duration for your meditation sessions (in minutes)
            </p>
            <input
              type="number"
              value={meditationDuration}
              onChange={(e) => onSaveMeditationDuration(parseInt(e.target.value, 10))}
              min="1"
              max="120"
              style={{
                width: '100%',
                height: '38.01359176635742px',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.54px solid rgba(0,0,0,0.2)',
                paddingTop: '7.5px',
                paddingBottom: '7.5px',
                paddingLeft: '0',
                paddingRight: '0',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
                marginTop: '7.49px',
              }}
              className="outline-none transition-colors text-left"
            />
          </div>

          {/* Add Manual Meditation */}
          <div
            style={{
              width: '100%',
              height: '139.75437927246094px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '7.49px',
              marginTop: '22.5px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <TrendingUp style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
              }}>
                Add manual meditation
              </span>
            </label>
            <p
              style={{
                width: '100%',
                height: '45px',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: 'rgba(0,0,0,0.6)',
                margin: 0,
                marginTop: '7.17px',
              }}
            >
              Add a manual meditation session (in minutes)
            </p>
            <input
              type="number"
              value={totalMeditationMinutes}
              onChange={(e) => onAddManualMeditation(parseInt(e.target.value, 10))}
              min="1"
              max="120"
              style={{
                width: '100%',
                height: '38.01359176635742px',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.54px solid rgba(0,0,0,0.2)',
                paddingTop: '7.5px',
                paddingBottom: '7.5px',
                paddingLeft: '0',
                paddingRight: '0',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: '#000000',
                marginTop: '7.49px',
              }}
              className="outline-none transition-colors text-left"
            />
          </div>

          {/* Contact Us */}
          <div
            className="border-t border-black/10 pt-4"
            style={{
              marginTop: '22.5px',
            }}
          >
            <Button
              onClick={() => window.location.href = 'mailto:hello@delcan.co'}
              style={{
                width: '100%',
                height: '33.743343353271484px',
                background: '#000000',
                color: '#FFFFFF',
                borderRadius: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Send style={{ color: '#FFFFFF', width: '14.996110916137695px', height: '14.996110916137695px' }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#FFFFFF',
              }}>
                Contact Us
              </span>
            </Button>
          </div>

          {/* Privacy Policy */}
          <div
            style={{
              width: '100%',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '11.24px',
              marginTop: '11.25px',
            }}
          >
            <Button
              onClick={() => window.open('https://www.delcan.co/mmddyyyy', '_system')}
              style={{
                width: '100%',
                height: '33.743343353271484px',
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#000000',
              }}>
                Privacy Policy
              </span>
            </Button>
          </div>

          {/* Delete Account */}
          <div
            style={{
              width: '100%',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '11.24px',
              marginTop: '11.25px',
            }}
          >
            <Button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? You cannot recover it.')) {
                  onSignOut?.(); // Assuming onSignOut handles the actual sign-out process
                }
              }}
              style={{
                width: '100%',
                height: '33.743343353271484px',
                background: '#F5D5D8',
                color: '#000000',
                borderRadius: '0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#000000',
              }}>
                Delete Account
              </span>
            </Button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            width: '100%',
            height: '79.27592468261719px',
            borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '23.03px',
            marginTop: '22px',
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          <Button
            onClick={async () => {
              // Save any pending changes before closing
              if (savePreferencesTimeoutRef.current) {
                clearTimeout(savePreferencesTimeoutRef.current);
                await savePreferences(false);
              }
              if (saveLifespanTimeoutRef.current) {
                clearTimeout(saveLifespanTimeoutRef.current);
                const lifespan = parseInt(customLifespan, 10);
                if (!isNaN(lifespan) && lifespan > 0 && lifespan <= 120) {
                  onSaveLifespan(lifespan);
                }
              }
              onClose();
            }}
            style={{
              width: '108.61226654052734px',
              height: '33.743343353271484px',
              gap: '7.5px',
              paddingTop: '7.5px',
              paddingRight: '15px',
              paddingBottom: '7.5px',
              paddingLeft: '15px',
              border: '0.54px solid rgba(0, 0, 0, 0.5)',
              background: '#FDF5ED',
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginRight: '5.62px',
            }}
          >
            <span style={{
              fontFamily: 'Courier New',
              fontWeight: 400,
              fontSize: '13.13px',
              lineHeight: '18.75px',
              letterSpacing: '0px',
              textAlign: 'center',
              color: '#000000',
            }}>
              Close
            </span>
          </Button>
          {onSignOut && (
            <Button
              onClick={onSignOut}
              style={{
                width: '108.61225891113281px',
                height: '33.743343353271484px',
                gap: '7.5px',
                paddingTop: '7.5px',
                paddingRight: '15px',
                paddingBottom: '7.5px',
                paddingLeft: '15px',
                background: '#000000',
                borderRadius: '0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                marginLeft: '5.62px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#FFFFFF',
              }}>
                Sign out
              </span>
            </Button>
          )}
          {/* Invisible Spacer */}
          <div
            style={{
              height: '50px', // Adjustable height to push content up
              background: '#FDF5ED',
              opacity: 0,
              marginTop: '20px', // Space from the button above
              width: '100%',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          ></div>
        </div>
      </div>
    </motion.div>
  );
}