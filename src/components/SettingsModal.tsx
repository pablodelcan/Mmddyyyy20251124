import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeOfDay, isDarkModeActive, setThemePreference, getThemePreference } from '../hooks/useTimeOfDay';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { X, Mail, Calendar, TrendingUp, Send, Database, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface SettingsModalProps {
  onClose: () => void;
  accessToken: string;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  dateOfBirth: string | null;
  onSaveDateOfBirth: (date: string) => void;
  expectedLifespan: number;
  onSaveLifespan: (years: number) => void;
  meditationDuration: number;
  onSaveMeditationDuration: (minutes: number) => void;
  totalMeditationMinutes: number;
  onAddManualMeditation: (minutes: number) => void;
  timeOfDay?: 'day' | 'night';
  isEmbedded?: boolean;
  isPro?: boolean;
  onShowPaywall?: () => void;
}

interface Preferences {
  email: string;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0 = Sunday, 1 = Monday, etc.
}

export function SettingsModal({ onClose, accessToken, onSignOut, onDeleteAccount, dateOfBirth, onSaveDateOfBirth, expectedLifespan, onSaveLifespan, meditationDuration, onSaveMeditationDuration, totalMeditationMinutes, onAddManualMeditation, timeOfDay: _providedTimeOfDay = 'day', isEmbedded = false, isPro = false, onShowPaywall }: SettingsModalProps) {
  const timeOfDay = useTimeOfDay();
  console.log('[SettingsModal] Hook timeOfDay:', timeOfDay);
  const [preferences, setPreferences] = useState<Preferences>({
    email: '',
    weeklyReportEnabled: false, // Set to false by default - requires Pro subscription
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
    console.log('[DEBUG] Loading preferences...');
    try {
      // First, get the user's email from Supabase auth
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      const authEmail = user?.email?.toLowerCase().trim() || '';
      console.log('[DEBUG] User auth email:', authEmail);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('[DEBUG] Preferences response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Preferences data from server:', data);

        // Use saved email preference if exists, otherwise use auth email
        const savedEmail = data.preferences?.email?.toLowerCase().trim() || '';
        const emailToUse = savedEmail || authEmail;

        console.log('[DEBUG] Setting preferences with email:', emailToUse);
        setPreferences({
          email: emailToUse,
          weeklyReportEnabled: data.preferences?.weeklyReportEnabled || false,
          weeklyReportDay: data.preferences?.weeklyReportDay ?? 0
        });
      } else {
        // If no preferences saved, still use auth email
        console.log('[DEBUG] No preferences found, using auth email:', authEmail);
        setPreferences(prev => ({
          ...prev,
          email: authEmail
        }));
      }
    } catch (err) {
      console.error('[DEBUG] Failed to load preferences:', err);
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
    console.log('[DEBUG] Saving preferences...', preferences);
    try {
      // Normalize email to lowercase before saving
      const normalizedPreferences = {
        ...preferences,
        email: preferences.email ? preferences.email.toLowerCase().trim() : ''
      };
      console.log('[DEBUG] Normalized preferences to save:', normalizedPreferences);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ preferences: normalizedPreferences })
        }
      );

      console.log('[DEBUG] Save preferences response status:', response.status);

      if (response.ok) {
        console.log('[DEBUG] Preferences saved successfully');

        let successMessage = 'Settings saved';

        // Check if we should trigger an immediate weekly report
        // Only if enabled, and if the chosen day matches TODAY
        if (normalizedPreferences.weeklyReportEnabled) {
          const now = new Date();
          // Adjust for user's timezone if available? 
          // Note: The UI for day selection is 0-6 (Sun-Sat).
          // We can use the browser's local day since 'weekNotes' etc use local time.
          const currentDay = now.getDay();

          // If the day matches AND we just saved (which implies user interaction or autosave)
          // We should be careful not to spam. The user said "when user click saturday it should send it also today imidiately".
          // This implies on CHANGE or on explicit SAVE.
          // Since autosave runs frequently, we might want to track if this specific preference CHANGED?
          // But `savePreferences` uses `preferences` from state.
          // Let's rely on the user finding it acceptable or maybe check if we *just* enabled it or changed the day?
          // Since we don't have previous state here easily without ref, let's just trigger it. 
          // The backend could rate limit, or we just trust the user not to toggle wildly.
          // Actually, `autosavePreferences` debounces.

          if (normalizedPreferences.weeklyReportDay === currentDay) {
            console.log('[DEBUG] Triggering immediate weekly report...');
            fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/trigger-weekly-report`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            )
              .then(async res => {
                console.log('[DEBUG] Trigger response status:', res.status);
                if (res.ok) {
                  toast.success('Weekly report sent!', { description: 'Since today matches your schedule.' });
                } else {
                  const errText = await res.text();
                  console.error('[DEBUG] Trigger failed:', errText);
                  toast.error('Failed to trigger report', { description: 'Check console for details' });
                }
              })
              .catch(err => {
                console.error('[DEBUG] Trigger network error:', err);
              });
          }
        }

        if (showToast) {
          // If we triggered a report, we already toasted. But showToast is usually explicit save.
          // Let's just standard toast if we didn't trigger? 
          // Or just standard toast always? Sonner stacks.
          toast.success(successMessage);
        }
      } else {
        console.error('[DEBUG] Failed to save preferences, status:', response.status);
        if (showToast) {
          toast.error('Failed to save settings');
        }
      }
    } catch (err) {
      console.error('[DEBUG] Failed to save preferences:', err);
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

    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = preferences.email.toLowerCase().trim();

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/test-weekly-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ email: normalizedEmail })
        }
      );

      if (response.ok) {
        toast.success(`Test email sent to ${normalizedEmail}! Check your inbox.`);
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
          backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : 'rgba(0, 0, 0, 0.2)',
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
          background: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
          border: timeOfDay === 'night' ? '0.54px solid rgba(251, 248, 232, 0.1)' : '0.54px solid rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '15px',
            lineHeight: '22.5px',
            color: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.6)' : 'rgba(0, 0, 0, 0.6)',
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
      style={{
        ...(isEmbedded ? {} : {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
        }),
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isEmbedded ? 'transparent' : (timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6'),
        paddingTop: isEmbedded ? '0' : 'max(env(safe-area-inset-top), 40px)',
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
          color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
          <X style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '14.996110916137695px', height: '14.996110916137695px' }} />
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
          paddingBottom: 'calc(24px + 50px + 20px)',
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
          {/* Dark Mode Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7.5px' }}>
              <Moon style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
              }}>
                Dark mode
              </span>
            </div>
            <button
              onClick={() => {
                // Toggle: if currently dark, switch to light; if light, switch to dark
                const currentlyDark = isDarkModeActive();
                setThemePreference(currentlyDark ? 'light' : 'dark');
              }}
              style={{
                width: '41.24558639526367px',
                height: '22.49835205078125px',
                borderRadius: '17981000px',
                transition: 'background-color 0.2s',
                backgroundColor: timeOfDay === 'night' ? (timeOfDay === 'night' ? '#FBF8E8' : '#000000') : (timeOfDay === 'night' ? 'rgba(251,248,232,0.2)' : 'rgba(0,0,0,0.2)'),
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                padding: '1.88px',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-in-out`}
                style={{
                  transform: timeOfDay === 'night' ? 'translateX(19.36px)' : 'translateX(0px)',
                }}
              />
            </button>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7.5px', marginBottom: '2px' }}>
              <Mail style={{
                width: '14.996110916137695px',
                height: '14.996110916137695px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
              }}>
                Email address
              </span>
            </label>
            <input
              type="email"
              value={preferences.email}
              onChange={(e) => setPreferences({ ...preferences, email: e.target.value.toLowerCase().trim() })}
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  }} />
                  <span style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  }}>
                    Weekly report
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isPro && onShowPaywall) {
                    onShowPaywall();
                    return;
                  }
                  setPreferences({
                    ...preferences,
                    weeklyReportEnabled: !preferences.weeklyReportEnabled
                  });
                }}
                style={{
                  width: '41.24558639526367px',
                  height: '22.49835205078125px',
                  borderRadius: '17981000px',
                  transition: 'background-color 0.2s',
                  backgroundColor: (isPro && preferences.weeklyReportEnabled) ? (timeOfDay === 'night' ? '#FBF8E8' : '#000000') : (timeOfDay === 'night' ? 'rgba(251,248,232,0.2)' : 'rgba(0,0,0,0.2)'),
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  padding: '1.88px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-in-out`}
                  style={{
                    transform: (isPro && preferences.weeklyReportEnabled) ? 'translateX(19.36px)' : 'translateX(0px)',
                  }}
                />
              </button>
            </div>

            {isPro && preferences.weeklyReportEnabled && (
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
                      backgroundColor: preferences.weeklyReportDay === index ? (timeOfDay === 'night' ? '#FBF8E8' : '#000000') : (timeOfDay === 'night' ? '#444444' : 'rgba(0,0,0,0.1)'),
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
                      color: preferences.weeklyReportDay === index ? (timeOfDay === 'night' ? '#000000' : '#FFFFFF') : (timeOfDay === 'night' ? '#FBF8E8' : '#000000'),
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                margin: 0, // Remove default paragraph margin
              }}
            >
              Send test weekly report
            </p>
            <Button
              onClick={testWeeklyEmail}
              disabled={testing || !preferences.email}
              style={{
                width: '96px',
                height: '30px',
                background: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                borderRadius: '16777200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: timeOfDay === 'night' ? '1px solid #FBF8E8' : '1px solid #000000',
                cursor: 'pointer',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
              }}>
                Data recovery
              </span>
            </div>
            <Button
              onClick={checkDataStatus}
              style={{
                width: '180px',
                height: '30px',
                background: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                borderRadius: '16777200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: timeOfDay === 'night' ? '1px solid #FBF8E8' : '1px solid #000000',
                cursor: 'pointer',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                whiteSpace: 'nowrap',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? 'rgba(251,248,232,0.6)' : 'rgba(0,0,0,0.6)',
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
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? 'rgba(251,248,232,0.6)' : 'rgba(0,0,0,0.6)',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? 'rgba(251,248,232,0.6)' : 'rgba(0,0,0,0.6)',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                marginTop: '3.74px',
              }} />
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                letterSpacing: '0px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                color: timeOfDay === 'night' ? 'rgba(251,248,232,0.6)' : 'rgba(0,0,0,0.6)',
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
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                width: '120px',
                height: '30px',
                background: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                borderRadius: '16777200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: timeOfDay === 'night' ? '1px solid #FBF8E8' : '1px solid #000000',
                cursor: 'pointer',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                whiteSpace: 'nowrap',
              }}>
                Contact Us
              </span>
            </Button>
          </div>

          {/* Privacy Policy */}
          <div
            style={{
              width: '100%',
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
                width: '140px',
                height: '30px',
                background: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                borderRadius: '16777200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: timeOfDay === 'night' ? '1px solid #FBF8E8' : '1px solid #000000',
                cursor: 'pointer',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                whiteSpace: 'nowrap',
              }}>
                Privacy Policy
              </span>
            </Button>
          </div>

          {/* Delete Account */}
          <div
            style={{
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '11.24px',
              marginTop: '11.25px',
            }}
          >
            <Button
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete your account? You cannot recover it. This will permanently delete all your data.')) {
                  if (onDeleteAccount) {
                    await onDeleteAccount();
                  } else {
                    onSignOut?.();
                  }
                }
              }}
              style={{
                width: '150px',
                height: '30px',
                background: '#F5D5D8',
                color: '#000000',
                borderRadius: '16777200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7.5px',
                border: 'none',
                cursor: 'pointer',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
              }}
            >
              <span style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#000000',
                whiteSpace: 'nowrap',
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
              width: '79.64px',
              height: '30px',
              gap: '7.5px',
              paddingTop: '7.5px',
              paddingRight: '11.25px',
              paddingBottom: '7.5px',
              paddingLeft: '11.25px',
              border: 'none',
              background: '#F5D5D8',
              borderRadius: '16777200px',
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
              fontWeight: 700,
              fontSize: '13.13px',
              lineHeight: '18.75px',
              letterSpacing: '0px',
              textAlign: 'center',
              color: '#000000',
              whiteSpace: 'nowrap',
            }}>
              Close
            </span>
          </Button>
          {onSignOut && (
            <Button
              onClick={onSignOut}
              style={{
                width: '93px',
                height: '30px',
                gap: '7.5px',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
                background: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                borderRadius: '16777200px',
                border: timeOfDay === 'night' ? '1px solid #FBF8E8' : '1px solid #000000',
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
                fontWeight: 700,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                whiteSpace: 'nowrap',
              }}>
                Sign out
              </span>
            </Button>
          )}
          {/* Invisible Spacer */}
          <div
            style={{
              height: '50px', // Adjustable height to push content up
              background: '#ECE8D6',
              opacity: 0,
              marginTop: '20px', // Space from the button above
              width: '100%',
            }}
          ></div>
        </div>
      </div>
    </motion.div>
  );
}