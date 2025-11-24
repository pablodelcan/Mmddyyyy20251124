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
}

interface Preferences {
  email: string;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0 = Sunday, 1 = Monday, etc.
}

export function SettingsModal({ onClose, accessToken, onSignOut, dateOfBirth, onSaveDateOfBirth, expectedLifespan, onSaveLifespan }: SettingsModalProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    email: '',
    weeklyReportEnabled: false,
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
      <div className="flex justify-between items-center p-6 border-b border-black/10">
        <h2>Settings</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[375px] mx-auto space-y-6">
          {/* Email Address */}
          <div>
            <label className="block mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email address
            </label>
            <input
              type="email"
              value={preferences.email}
              onChange={(e) => setPreferences({ ...preferences, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          {/* Weekly Report */}
          <div className="border-t border-black/10 pt-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Weekly report</span>
                </div>
              </div>
              <button
                onClick={() => setPreferences({ 
                  ...preferences, 
                  weeklyReportEnabled: !preferences.weeklyReportEnabled 
                })}
                className={`h-6 w-11 rounded-full transition-colors ${
                  preferences.weeklyReportEnabled ? 'bg-black' : 'bg-black/20'
                }`}
              >
                <div 
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    preferences.weeklyReportEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {preferences.weeklyReportEnabled && (
              <div className="ml-6 flex gap-1.5 justify-between">
                {['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setPreferences({ 
                      ...preferences, 
                      weeklyReportDay: index 
                    })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      preferences.weeklyReportDay === index 
                        ? 'bg-black text-white' 
                        : 'bg-black/10 hover:bg-black/20'
                    }`}
                  >
                    <span className="text-[11px]">{day}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test Email */}
          <div className="border-t border-black/10 pt-4">
            <p className="mb-3">
              Send test weekly report
            </p>
            <Button
              onClick={testWeeklyEmail}
              disabled={testing || !preferences.email}
              className="w-full bg-black hover:bg-black/90 text-white rounded-none flex items-center justify-center gap-2"
            >
              <Send className="h-3 w-3" />
              {testing ? 'Sending...' : 'Send test'}
            </Button>
          </div>

          {/* Data Recovery */}
          <div className="border-t border-black/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4" />
              <span>Data recovery</span>
            </div>
            <Button
              onClick={checkDataStatus}
              className="w-full bg-black/10 hover:bg-black/20 text-black rounded-none flex items-center justify-center gap-2"
            >
              <Database className="h-3 w-3" />
              Check data status
            </Button>
          </div>

          {/* Date of Birth */}
          <div className="border-t border-black/10 pt-4">
            <label className="block mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date of birth
            </label>
            <p className="text-black/60 mb-3">
              Required for "Life in Weeks" visualization
            </p>
            <input
              type="date"
              value={dateOfBirth || ''}
              onChange={(e) => onSaveDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>

          {/* Expected Lifespan */}
          <div className="border-t border-black/10 pt-4">
            <label className="block mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Expected lifespan
            </label>
            <p className="text-black/60 mb-3">
              Used to calculate "Life in Weeks" grid (default: 80 years)
            </p>
            <input
              type="number"
              value={customLifespan}
              onChange={(e) => setCustomLifespan(e.target.value)}
              min="1"
              max="120"
              className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-2"
            />
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="border-t border-black/10 p-6">
        <div className="max-w-[375px] mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-none border-black/20 hover:bg-black/5"
          >
            Cancel
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving || !preferences.email}
            className="flex-1 bg-black hover:bg-black/90 text-white rounded-none"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {onSignOut && (
            <Button
              onClick={onSignOut}
              className="flex-1 bg-black hover:bg-black/90 text-white rounded-none"
            >
              Sign out
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
