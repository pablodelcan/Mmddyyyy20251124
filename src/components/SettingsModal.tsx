import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { X, Mail, Calendar, TrendingUp, Send, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
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
  const [saving, setSaving] = useState(false);
  const [customLifespan, setCustomLifespan] = useState(expectedLifespan.toString());

  useEffect(() => {
    loadPreferences();
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

  const savePreferences = async () => {
    setSaving(true);

    try {
      // Save lifespan
      const lifespan = parseInt(customLifespan, 10);
      if (!isNaN(lifespan) && lifespan > 0 && lifespan <= 120) {
        onSaveLifespan(lifespan);
      }

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
        toast.success('Settings saved');
        onClose();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="w-[375px] m-4 p-8 bg-[#fdf5ed] border border-black/10">
          <div className="text-center text-black/60">Loading...</div>
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
          onClick={onClose}
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[375px] mx-auto">
          {/* Email Address */}
          <div style={{ paddingLeft: '22.5px', paddingRight: '22.5px' }}>
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
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
                lineHeight: '100%',
                letterSpacing: '0px',
                color: '#000000',
              }}
              className="outline-none transition-colors"
            />
          </div>

          {/* Expected Lifespan */}
          <div
            style={{
              width: '100%',
              height: '139.75437927246094px',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
                lineHeight: '100%',
                letterSpacing: '0px',
                color: '#000000',
                marginTop: '7.49px',
              }}
              className="outline-none transition-colors"
            />
          </div>

          {/* Meditation Duration */}
          <div
            className="border-t border-black/10 pt-4"
            style={{
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
              marginTop: '22.5px',
            }}
          >
            <label className="block mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Meditation duration
            </label>
            <p className="text-black/60 mb-3">
              Set the default duration for your meditation sessions (in minutes)
            </p>
            <input
              type="number"
              value={meditationDuration}
              onChange={(e) => onSaveMeditationDuration(parseInt(e.target.value, 10))}
              min="1"
              max="120"
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          {/* Add Manual Meditation */}
          <div
            className="border-t border-black/10 pt-4"
            style={{
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
              marginTop: '22.5px',
            }}
          >
            <label className="block mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Add manual meditation
            </label>
            <p className="text-black/60 mb-3">
              Add a manual meditation session (in minutes)
            </p>
            <input
              type="number"
              value={totalMeditationMinutes}
              onChange={(e) => onAddManualMeditation(parseInt(e.target.value, 10))}
              min="1"
              max="120"
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          {/* Contact Us */}
          <div
            className="border-t border-black/10 pt-4"
            style={{
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
              marginTop: '22.5px',
            }}
          >
            <label className="block mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Us
            </label>
            <Button
              onClick={() => window.location.href = 'mailto:hello@delcan.co'}
              className="w-full bg-black hover:bg-black/90 text-white rounded-none flex items-center justify-center gap-2"
            >
              <Send className="h-3 w-3" />
              Contact Us
            </Button>
          </div>

          {/* Privacy Policy */}
          <div
            style={{
              width: '100%',
              borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '15.53px',
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
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
      </div>

      {/* Footer Buttons */}
      <div
        style={{
          width: '100%',
          height: '79.27592468261719px',
          borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
          paddingTop: '23.03px',
          paddingRight: '22.5px',
          paddingLeft: '22.5px',
          marginTop: '22px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '375px', width: '100%', display: 'flex', gap: '11.24px', justifyContent: 'center' }}>
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              width: '108.61226654052734px',
              height: '33.743343353271484px',
              gap: '7.5px',
              paddingTop: '7.5px',
              paddingRight: '15px',
              paddingBottom: '7.5px',
              paddingLeft: '15px',
              border: '0.54px solid rgba(0, 0, 0, 0.2)',
              background: '#FDF5ED',
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
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
              Cancel
            </span>
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving || !preferences.email}
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
              {saving ? 'Saving...' : 'Save'}
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
        </div>
      </div>
    </motion.div>
  );
}