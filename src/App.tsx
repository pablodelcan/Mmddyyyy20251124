import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, Star, BarChart3, Undo2, Calendar, Settings, LogOut, Circle, Grid3X3, Minus, Square, ArrowUp, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { toast, Toaster } from 'sonner';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { MonthView } from './components/MonthView';
import { CalmingBackground } from './components/CalmingBackground';
import { MeditationTimer } from './components/MeditationTimer';
import { LifetimeView } from './components/LifetimeView';
import { EyeOpenIcon, EyeClosedIcon } from './components/EyeIcon';
import { TimerModal } from './components/TimerModal';
import { getSupabaseClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { useTimeOfDay } from './hooks/useTimeOfDay';
import { secureStorage } from './utils/secureStorage';
import { Keyboard } from '@capacitor/keyboard';
import { getLocalDateString } from './utils/dateUtils';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  priority: boolean;
  rolledOver?: boolean;
  timerEnd?: number; // Timestamp when timer should complete
}

interface TodosState {
  [date: string]: TodoItem[];
}

interface UndoAction {
  type: 'add' | 'delete' | 'toggle' | 'edit' | 'reorder' | 'priority';
  todo?: TodoItem;
  todos?: TodoItem[];
  dateKey: string;
  previousText?: string;
  index?: number;
  fromIndex?: number;
  toIndex?: number;
}

const ITEM_TYPE = 'TODO';

interface DragItem {
  id: string;
  index: number;
  dateKey: string;
}

const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

interface DraggableTodoProps {
  todo: TodoItem;
  index: number;
  dateKey: string;
  editingId: string | null;
  editText: string;
  onToggle: () => void;
  onStartEdit: () => void;
  onEditChange: (text: string) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDelete: () => void;
  onPriorityToggle: () => void;
  onTimerClick: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  meditationGlowActive: boolean;
  timeRemaining?: string;
}

function DraggableTodo({
  todo,
  index,
  dateKey,
  editingId,
  editText,
  onToggle,
  onStartEdit,
  onEditChange,
  onSave,
  onKeyDown,
  onMove,
  onDelete,
  onPriorityToggle,
  onTimerClick,
  onTouchStart,
  meditationGlowActive,
  timeRemaining
}: DraggableTodoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null); // New ref for the drag handle

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: todo.id, index, dateKey },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: DragItem) {
      if (!ref.current) return;
      if (item.dateKey !== dateKey) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  // Apply drop to the whole item, but drag only to the handle
  drop(ref); // The entire div remains the drop target

  return (
    <div
      ref={ref}
      style={{
        width: '330px',
        minHeight: '29.98px',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        opacity: isDragging ? 0.5 : 1,
        marginBottom: '10px', // Reverted to 10px spacing
        paddingTop: '3.74px',
        paddingBottom: '3.74px',
      }}
      className={`group select-none ${meditationGlowActive && !todo.completed ? 'animate-pulse' : ''}`}
    >
      <div
        style={{
          width: '11.24px',
          height: '11.24px',
          borderRadius: '17981000px',
          backgroundColor: '#707070',
          marginTop: '3.75px',
          marginRight: '11.25px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag on click
          onToggle();
        }}
      >
        {todo.completed && (
          <X className="h-2.5 w-2.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} strokeWidth={3} />
        )}
      </div>

      {editingId === todo.id ? (
        <Input
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            // Prevent viewport resize on iOS
            // Don't scroll or move anything
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: '22.49px',
            paddingRight: '122.27px',
            background: 'transparent',
            border: 'none',
            borderBottom: '0.54px solid #00000020',
            outline: 'none',
            color: '#000000',
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '15px',
            zIndex: 5,
          }}
        />
      ) : (
        <div // This div now wraps the drag handle
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: '22.49px',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            paddingRight: '90px',
          }}
        >
          {timeRemaining ? (
            <motion.div
              ref={dragHandleRef} // Apply drag handle here
              {...drag(dragHandleRef)} // Make this div draggable
              onTouchStart={onTouchStart} // Keep onTouchStart here for touch drag
              className="relative h-6 flex items-center"
              style={{ cursor: 'grab' }} // Indicate draggable area
            >
              <motion.div
                className="absolute whitespace-nowrap"
                animate={{
                  x: [0, -100],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <span className="cursor-text break-words inline mr-8" style={{ color: '#000000' }}>
                  {todo.text} • {timeRemaining}
                </span>
                <span className="cursor-text break-words inline mr-8" style={{ color: '#000000' }}>
                  {todo.text} • {timeRemaining}
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <span
              ref={dragHandleRef} // Apply drag handle here
              {...drag(dragHandleRef)} // Make this span draggable
              onTouchStart={onTouchStart} // Keep onTouchStart here for touch drag
              onClick={onStartEdit}
              className="cursor-text transition-all"
              style={{
                color: '#000000',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.49px',
                display: 'inline',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                textDecoration: todo.completed ? 'line-through' : 'none',
                opacity: todo.completed ? 0.5 : 1,
                background: todo.completed
                  ? 'rgba(0,0,0,0.05)'
                  : todo.priority
                    ? 'rgba(243, 235, 126, 0.4)'
                    : meditationGlowActive
                      ? 'rgba(190, 139, 173, 0.05)'
                      : 'transparent',
                cursor: 'grab', // Indicate draggable area
              }}
            >
              {todo.text}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag on click
            onTimerClick();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            minWidth: 'auto',
          }}
          title={timeRemaining ? `Timer: ${timeRemaining}` : "Set timer"}
        >
          <Clock style={{ color: '#000000', width: '15px', height: '15px' }} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag on click
            onPriorityToggle();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            minWidth: 'auto',
          }}
        >
          <ArrowUp style={{ color: '#000000', width: '15px', height: '15px' }} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag on click
            onDelete();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            minWidth: 'auto',
          }}
        >
          <Minus style={{ color: '#000000', width: '15px', height: '15px' }} />
        </Button>
      </div>
    </div>
  );
}

function AppContent() {
  const timeOfDay = useTimeOfDay();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [todos, setTodos] = useState<TodosState>({});
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showLifetimeView, setShowLifetimeView] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [expectedLifespan, setExpectedLifespan] = useState(80); // Default 80 years
  const [weekNotes, setWeekNotes] = useState<{ [weekIndex: number]: string }>({});
  const [bucketList, setBucketList] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [showMeditation, setShowMeditation] = useState(false);
  const [meditationDates, setMeditationDates] = useState<string[]>([]);
  const [lastMeditationTime, setLastMeditationTime] = useState<number | null>(null);
  const [meditationDuration, setMeditationDuration] = useState(10); // Default 10 minutes
  const [totalMeditationMinutes, setTotalMeditationMinutes] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; id: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const [timerModalTodoId, setTimerModalTodoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showSplash, setShowSplash] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const supabase = getSupabaseClient();

  const dateKey = getLocalDateString(currentDate);

  // Set body background color to match app
  useEffect(() => {
    const bgColor = timeOfDay === 'night' ? '#1a1a1a' : '#FBF8E8';
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.backgroundColor = bgColor;

    return () => {
      // Cleanup on unmount
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [timeOfDay]);

  // Track keyboard visibility
  useEffect(() => {
    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', () => {
        setIsKeyboardVisible(true);
      });

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardVisible(false);
        setIsAddingTask(false);
      });
    };

    setupListeners();

    return () => {
      if (showListener) showListener.remove();
      if (hideListener) hideListener.remove();
    };
  }, []);

  // Prevent content shifting when keyboard appears/disappears
  useEffect(() => {
    // Disable keyboard scrolling
    Keyboard.setScroll({ isDisabled: true });

    // Lock the initial viewport height
    const initialHeight = window.innerHeight;
    document.documentElement.style.setProperty('--initial-vh', `${initialHeight}px`);

    const preventResize = () => {
      // Lock the initial viewport height
      const initialHeight = window.innerHeight;
      document.documentElement.style.setProperty('--initial-vh', `${initialHeight}px`);

      // Instead of setting fixed heights and overflow: hidden on root, body, html, 
      // we'll rely on the meta tag and viewport-fit=cover
      // We only ensure scrolling is prevented
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    // Prevent viewport resize on visual viewport changes (keyboard)
    const handleVisualViewportChange = () => {
      preventResize();
      // Force scroll to top
      window.scrollTo(0, 0);
      if (window.visualViewport) {
        window.scrollTo(0, 0);
      }
    };

    const preventScroll = (e: Event) => {
      e.preventDefault();
      window.scrollTo(0, 0);
    };

    // Lock viewport on resize (keyboard show/hide)
    window.addEventListener('resize', preventResize);
    window.addEventListener('scroll', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      window.visualViewport.addEventListener('scroll', (e) => {
        e.preventDefault();
        window.scrollTo(0, 0);
      });
    }

    preventResize(); // Initial call

    return () => {
      window.removeEventListener('resize', preventResize);
      window.removeEventListener('scroll', preventScroll);
      document.removeEventListener('scroll', preventScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);

  // Check if first time opening app
  useEffect(() => {
    const hasSeenSplash = secureStorage.getItem<boolean>('hasSeenSplash');
    if (!hasSeenSplash) {
      setShowSplash(true);
      // Auto-dismiss after 2 seconds or wait for user tap
      const timer = setTimeout(() => {
        setShowSplash(false);
        secureStorage.setItem('hasSeenSplash', true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online');
      // Sync when coming back online
      if (accessToken) {
        syncToBackend();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Working offline', { description: 'Changes saved locally' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [accessToken]);

  // Load from local storage on mount
  useEffect(() => {
    const loadLocalData = () => {
      const localTodos = secureStorage.getItem<TodosState>('todos');
      const localDOB = secureStorage.getItem<string>('dateOfBirth');
      const localLifespan = secureStorage.getItem<number>('expectedLifespan');
      const localMeditationDates = secureStorage.getItem<string[]>('meditationDates');
      const localMeditationTime = secureStorage.getItem<number>('lastMeditationTime');
      const localWeekNotes = secureStorage.getItem<{ [weekIndex: number]: string }>('weekNotes');
      const localBucketList = secureStorage.getItem<{ id: string; text: string; completed: boolean }[]>('bucketList');

      if (localTodos) setTodos(localTodos);
      if (localDOB) setDateOfBirth(localDOB);
      if (localLifespan) setExpectedLifespan(localLifespan);
      if (localMeditationDates) setMeditationDates(localMeditationDates);
      if (localMeditationTime) setLastMeditationTime(localMeditationTime);
      if (localWeekNotes) setWeekNotes(localWeekNotes);
      if (localBucketList) setBucketList(localBucketList);
    };

    loadLocalData();
  }, []);

  // Save to local storage whenever data changes
  useEffect(() => {
    secureStorage.setItem('todos', todos);
    secureStorage.setItem('dateOfBirth', dateOfBirth);
    secureStorage.setItem('expectedLifespan', expectedLifespan);
    secureStorage.setItem('meditationDates', meditationDates);
    secureStorage.setItem('lastMeditationTime', lastMeditationTime);
    secureStorage.setItem('weekNotes', weekNotes);
    secureStorage.setItem('bucketList', bucketList);
    setLastLocalSave(new Date());
  }, [todos, dateOfBirth, expectedLifespan, meditationDates, lastMeditationTime, weekNotes, bucketList]);

  // Check for existing session on mount
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setUserId(session.user.id);
      } else {
        setAccessToken(null);
        setUserId(null);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setUserId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load data from backend when authenticated
  useEffect(() => {
    if (accessToken) {
      loadFromBackend();
    }
  }, [accessToken]);

  // Sync to backend when todos change
  useEffect(() => {
    if (accessToken && userId && isOnline) {
      const syncTimer = setTimeout(() => {
        syncToBackend();
      }, 1000);

      return () => clearTimeout(syncTimer);
    }
  }, [todos, dateOfBirth, expectedLifespan, meditationDates, lastMeditationTime, totalMeditationMinutes, weekNotes, bucketList, accessToken, userId, isOnline]);

  const loadFromBackend = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/todos`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.todos) {
          setTodos(data.todos);
        }
        if (data.dateOfBirth) {
          setDateOfBirth(data.dateOfBirth);
        }
        if (data.expectedLifespan) {
          setExpectedLifespan(data.expectedLifespan);
        }
        if (data.meditationDates) {
          setMeditationDates(data.meditationDates);
        }
        if (data.lastMeditationTime) {
          setLastMeditationTime(data.lastMeditationTime);
        }
        if (data.totalMeditationMinutes !== undefined) {
          setTotalMeditationMinutes(data.totalMeditationMinutes);
        }
        if (data.weekNotes) {
          setWeekNotes(data.weekNotes);
        }
        if (data.bucketList) {
          setBucketList(data.bucketList);
        }
      }
    } catch (err) {
      console.error('Failed to load from backend:', err);
    }
  };

  const syncToBackend = async () => {
    if (!accessToken) return;

    setSyncing(true);

    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      if (!freshToken) {
        console.error('No valid session token available');
        setSyncing(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/todos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshToken}`
          },
          body: JSON.stringify({
            todos,
            dateOfBirth,
            expectedLifespan,
            meditationDates,
            lastMeditationTime,
            totalMeditationMinutes,
            weekNotes,
            bucketList
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to sync to backend:', errorData);
        if (errorData.details) {
          console.error('Error details:', errorData.details);
        }
      }
    } catch (err) {
      // Silently fail if not connected or server is not available
      console.error('Failed to sync to backend:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAuthSuccess = (token: string, uid: string) => {
    setAccessToken(token);
    setUserId(uid);
    setShowAuth(false);
    toast.success('Signed in successfully');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setUserId(null);
    setTodos({});
    setDateOfBirth(null);
    setMeditationDates([]);
    setLastMeditationTime(null);
    toast.success('Signed out successfully');
  };

  const handleMeditationComplete = useCallback((minutes: number) => {
    const today = new Date().toISOString().split('T')[0];

    setMeditationDates(prev => {
      if (!prev.includes(today)) {
        return [...prev, today];
      }
      return prev;
    });

    setLastMeditationTime(Date.now());
    setTotalMeditationMinutes(prev => prev + minutes);
    setShowMeditation(false);
    toast.success('Meditation completed');

    // Play completion sound
    playCompletionSound();
  }, []); // Empty dependency array since we're using functional updates

  const playCompletionSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 528;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const saveDateOfBirth = (dob: string) => {
    setDateOfBirth(dob);
  };

  const handleSaveDateOfBirth = (dob: string) => {
    setDateOfBirth(dob);
    toast.success('Date of birth saved');
  };

  const saveLifespan = (years: number) => {
    setExpectedLifespan(years);
  };

  const addToUndoStack = (action: UndoAction) => {
    setUndoStack(prev => [...prev.slice(-9), action]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    switch (action.type) {
      case 'add':
        if (action.todo) {
          setTodos(prev => ({
            ...prev,
            [action.dateKey]: (prev[action.dateKey] || []).filter(t => t.id !== action.todo!.id)
          }));
        }
        break;
      case 'delete':
        if (action.todo && action.index !== undefined) {
          setTodos(prev => {
            const dateTodos = [...(prev[action.dateKey] || [])];
            dateTodos.splice(action.index!, 0, action.todo!);
            return { ...prev, [action.dateKey]: dateTodos };
          });
        }
        break;
      case 'toggle':
        if (action.todo) {
          setTodos(prev => ({
            ...prev,
            [action.dateKey]: (prev[action.dateKey] || []).map(t =>
              t.id === action.todo!.id ? { ...t, completed: !t.completed } : t
            )
          }));
        }
        break;
      case 'edit':
        if (action.todo && action.previousText) {
          setTodos(prev => ({
            ...prev,
            [action.dateKey]: (prev[action.dateKey] || []).map(t =>
              t.id === action.todo!.id ? { ...t, text: action.previousText! } : t
            )
          }));
        }
        break;
      case 'reorder':
        if (action.todos) {
          setTodos(prev => ({
            ...prev,
            [action.dateKey]: action.todos!
          }));
        }
        break;
      case 'priority':
        if (action.todo) {
          setTodos(prev => ({
            ...prev,
            [action.dateKey]: (prev[action.dateKey] || []).map(t =>
              t.id === action.todo!.id ? { ...t, priority: !t.priority } : t
            )
          }));
        }
        break;
    }
  };

  // Move incomplete tasks from past days to today
  const moveIncompleteTasksToToday = useCallback(() => {
    const todayDate = new Date();
    const today = getLocalDateString(todayDate);

    let hasChanges = false;
    const newTodos = { ...todos };

    // Scan all past dates
    Object.keys(newTodos).forEach(dateKey => {

      // Only process past dates (before today, using string comparison)
      if (dateKey < today) {
        const incompleteTasks = newTodos[dateKey].filter((t: TodoItem) => !t.completed);

        if (incompleteTasks.length > 0) {
          hasChanges = true;

          // Remove incomplete tasks from past date
          newTodos[dateKey] = newTodos[dateKey].filter((t: TodoItem) => t.completed);

          // Add incomplete tasks to today
          if (!newTodos[today]) {
            newTodos[today] = [];
          }
          newTodos[today] = [...incompleteTasks, ...newTodos[today]];
        }
      }
    });

    if (hasChanges) {
      setTodos(newTodos);
    }
  }, [todos]);

  // Run on mount and when date changes
  useEffect(() => {
    moveIncompleteTasksToToday();
  }, [currentDate]);

  // Run daily check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      moveIncompleteTasksToToday();
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [moveIncompleteTasksToToday]);

  const currentTodos = todos[dateKey] || [];
  // Filter out rolled over tasks from the current day view
  const activeTodos = currentTodos.filter(todo => !todo.completed && !todo.rolledOver);
  const completedTodos = currentTodos.filter(todo => todo.completed);

  const completionRate = currentTodos.length > 0
    ? (completedTodos.length / currentTodos.length) * 100
    : 0;

  // Check if meditation was completed recently (within 4 hours)
  const meditationGlowActive = lastMeditationTime && (Date.now() - lastMeditationTime) < (4 * 60 * 60 * 1000);

  // Update current time every second to check timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for expired timers and complete tasks
  useEffect(() => {
    Object.keys(todos).forEach((key) => {
      todos[key].forEach((todo) => {
        if (todo.timerEnd && !todo.completed && currentTime >= todo.timerEnd) {
          // Timer has expired, complete the task
          setTodos(prev => ({
            ...prev,
            [key]: (prev[key] || []).map(t =>
              t.id === todo.id ? { ...t, completed: true, timerEnd: undefined } : t
            )
          }));

          // Play completion sound and show toast
          playCompletionSound();
          toast.success(`Timer completed: ${todo.text}`);
        }
      });
    });
  }, [currentTime, todos]);

  const setTaskTimer = (id: string, minutes: number) => {
    const timerEnd = Date.now() + (minutes * 60 * 1000);

    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map(t =>
        t.id === id ? { ...t, timerEnd } : t
      )
    }));

    toast.success(`Timer set for ${minutes} minute${minutes !== 1 ? 's' : ''}`);
  };

  const clearTaskTimer = (id: string) => {
    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map(t =>
        t.id === id ? { ...t, timerEnd: undefined } : t
      )
    }));

    toast.success('Timer cleared');
  };

  const getTimeRemaining = (timerEnd: number | undefined): string | undefined => {
    if (!timerEnd) return undefined;

    const remaining = timerEnd - currentTime;
    if (remaining <= 0) return undefined;

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: TodoItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: newTodo.trim(),
        completed: false,
        date: dateKey,
        priority: false
      };

      setTodos(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), todo]
      }));

      addToUndoStack({ type: 'add', todo, dateKey });
      setNewTodo('');
    }
  };

  const toggleTodo = (id: string) => {
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    }));

    addToUndoStack({ type: 'toggle', todo, dateKey });
  };

  const deleteTodo = (id: string) => {
    const index = currentTodos.findIndex(t => t.id === id);
    const todo = currentTodos[index];
    if (!todo) return;

    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter(t => t.id !== id)
    }));

    addToUndoStack({ type: 'delete', todo, dateKey, index });
  };

  const togglePriority = (id: string) => {
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map(t =>
        t.id === id ? { ...t, priority: !t.priority } : t
      )
    }));

    addToUndoStack({ type: 'priority', todo, dateKey });
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleSave = () => {
    if (!editingId) return;

    const todo = currentTodos.find(t => t.id === editingId);
    if (!todo) return;

    if (editText.trim() && editText !== todo.text) {
      setTodos(prev => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).map(t =>
          t.id === editingId ? { ...t, text: editText.trim() } : t
        )
      }));

      addToUndoStack({ type: 'edit', todo, dateKey, previousText: todo.text });
    }

    setEditingId(null);

    // Force scroll to top to reset any displacement
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      const todo = currentTodos.find(t => t.id === editingId);
      setEditingId(null);
      setEditText(todo?.text || '');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const id = currentTodos.find(t => target.innerText.includes(t.text))?.id;
    if (id) {
      setTouchStart({ x: touch.clientX, y: touch.clientY, id });
    }
  };

  const moveTodo = (fromIndex: number, toIndex: number) => {
    const previousTodos = [...currentTodos];
    const newTodos = [...currentTodos];
    const [movedItem] = newTodos.splice(fromIndex, 1);
    newTodos.splice(toIndex, 0, movedItem);

    setTodos(prev => ({
      ...prev,
      [dateKey]: newTodos
    }));

    addToUndoStack({ type: 'reorder', todos: previousTodos, dateKey });
  };

  const goToPreviousDay = () => {
    setCurrentDate(new Date(currentDate.getTime() - 86400000));
  };

  const goToNextDay = () => {
    setCurrentDate(new Date(currentDate.getTime() + 86400000));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTasksGenerated = (tasks: string[]) => {
    tasks.forEach((taskText) => {
      const todo: TodoItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: taskText,
        completed: false,
        date: dateKey,
        priority: false
      };

      setTodos(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), todo]
      }));
    });

    toast.success(`Added ${tasks.length} tasks`);
  };

  const isToday = dateKey === getLocalDateString(new Date());
  const hasMeditatedToday = meditationDates.includes(dateKey);

  // Keep tasks in their original order - no sorting by completion status
  const sortedTodos = [...currentTodos];

  return (
    <div
      className="flex flex-col items-center transition-colors duration-1000"
      style={{
        backgroundColor: timeOfDay === 'night' ? '#1a1a1a' : '#FBF8E8',
        color: timeOfDay === 'night' ? '#fdf5ed' : '#000000',
        height: '100dvh',
        width: '100%',
        position: 'relative',
      }}
    >
      <Toaster position="top-center" />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              setShowSplash(false);
              secureStorage.setItem('hasSeenSplash', true);
            }}
            className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
            style={{
              backgroundColor: timeOfDay === 'night' ? '#1a1a1a' : '#FBF8E8',
            }}
          >
            <div className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full relative"
                style={{
                  backgroundColor: '#D84341',
                  top: 'calc(-0.15em + 2px)',
                  marginRight: 'calc(0.15rem + 4px)'
                }}
              />
              <h1>mm/dd/yyyy</h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Date navigation container - Outside main container to prevent shifting */}
      <div
        style={{
          position: 'fixed',
          top: '77.5px',
          left: '31.67px',
          display: 'flex',
          alignItems: 'center',
          gap: '7.5px',
          zIndex: 100,
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousDay}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            minWidth: 'auto',
          }}
        >
          <ChevronLeft
            style={{
              width: '16px',
              height: '16px',
              stroke: '#000000',
              strokeWidth: '1.25px',
              color: '#000000',
            }}
          />
        </Button>

        {/* Date text - Figma: 154px x 22px */}
        <div
          style={{
            width: '154px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <h1 style={{
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: '22px',
            margin: 0,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
          }}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}.{' '}
            {isToday && (
              <span
                style={{
                  width: '9.37px',
                  height: '9.37px',
                  borderRadius: '17981000px',
                  backgroundColor: '#D84341',
                  marginLeft: '10px',
                  marginRight: '6.25px',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
            {(currentDate.getMonth() + 1).toString().padStart(2, '0')}/{currentDate.getDate().toString().padStart(2, '0')}/{currentDate.getFullYear()}
          </h1>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDay}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            minWidth: 'auto',
          }}
        >
          <ChevronRight
            style={{
              width: '16px',
              height: '16px',
              stroke: '#000000',
              strokeWidth: '1.25px',
              color: '#000000',
            }}
          />
        </Button>
        {!isToday && (
          <Button
            variant="ghost"
            onClick={goToToday}
            style={{
              width: '54.37px',
              height: '22.5px',
              borderRadius: '17981000px',
              padding: '7.5px',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7.5px',
            }}
          >
            <span
              style={{
                width: '40px',
                height: '19px',
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                color: '#000000',
              }}
            >
              Today
            </span>
          </Button>
        )}
      </div>

      {/* Main Content Container - Responsive for all iPhones */}
      <div
        className="w-full flex flex-col"
        style={{
          width: 'calc(100% - 18.34px)', // ~375px on iPhone 14 Pro, responsive
          maxWidth: '375px',
          height: 'calc(100dvh - 80px)',
          position: 'fixed',
          top: '40px',
          left: '9.17px',
          willChange: 'auto',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Calendar */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'absolute',
                top: '45px',
                left: 0,
                right: 0,
                margin: '0 auto',
              }}
            >
              <MonthView
                currentDate={currentDate}
                todos={todos}
                onSelectDate={(date) => {
                  setCurrentDate(date);
                  setShowCalendar(false);
                }}
                meditationDates={meditationDates}
                onMonthChange={(direction) => {
                  const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
                  setCurrentDate(newDate);
                }}
                onClose={() => setShowCalendar(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Todos List - Dynamic positioning based on calendar visibility */}
      <div
        style={{
          position: 'fixed',
          top: showCalendar ? '453.73px' : '156.5px', // 45px (calendar top) + 378.73px (calendar height) + 30px (gap)
          left: '31.67px',
          width: '330px',
          height: showCalendar
            ? 'calc(100vh - 453.73px - 130px)' // Dynamic height when calendar is open
            : 'calc(100vh - 156.5px - 130px)', // Dynamic height when calendar is closed  
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 50,
          transform: 'translateZ(0)',
          willChange: 'transform',
          transition: 'top 0.3s ease-in-out, height 0.3s ease-in-out',
        }}
      >
        {sortedTodos.map((todo, index) => (
          <DraggableTodo
            key={todo.id}
            todo={todo}
            index={index}
            dateKey={dateKey}
            editingId={editingId}
            editText={editText}
            onToggle={() => toggleTodo(todo.id)}
            onStartEdit={() => startEdit(todo)}
            onEditChange={setEditText}
            onSave={handleSave}
            onKeyDown={handleKeyDown}
            onMove={moveTodo}
            onDelete={() => deleteTodo(todo.id)}
            onPriorityToggle={() => togglePriority(todo.id)}
            onTouchStart={handleTouchStart}
            meditationGlowActive={!!meditationGlowActive}
            timeRemaining={getTimeRemaining(todo.timerEnd)}
            onTimerClick={() => setTimerModalTodoId(todo.id)}
          />
        ))}
      </div>

      {/* Todo Input - Hide when editing */}
      {!editingId && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(30px + env(safe-area-inset-bottom) + 7.49px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '330px',
            height: '33.74px',
            display: 'flex',
            gap: '7.49px',
            alignItems: 'center',
            paddingRight: 0,
            zIndex: 10,
          }}
        >
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            onFocus={(e) => {
              setIsAddingTask(true);
            }}
            onBlur={() => {
              setIsAddingTask(false);
            }}
            placeholder="Add task"
            style={{
              width: '292.51px',
              height: '33.74px',
              background: 'transparent',
              border: 'none',
              borderBottom: '0.54px solid rgba(0, 0, 0, 0.8)',
              paddingTop: '3.75px',
              paddingBottom: '3.75px',
              paddingLeft: 0,
              paddingRight: 0,
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '15px',
              lineHeight: '100%',
              letterSpacing: '0px',
              color: '#000000',
            }}
            className="rounded-none add-task-input"
          />
          <Button
            onClick={addTodo}
            variant="ghost"
            size="icon"
            style={{
              width: '29.99px',
              height: '29.99px',
              borderRadius: '17981000px',
              paddingRight: '0.01px',
              background: 'transparent',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus style={{ color: '#000000', width: '14.99px', height: '14.99px' }} />
          </Button>
        </div>
      )}

      {/* Bottom Controls - Hide when keyboard is visible (editing or adding task) */}
      {!isKeyboardVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(-15px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '330px',
            maxWidth: 'calc(100% - 40px)',
            height: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingRight: 0,
            zIndex: 1000,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
          }}
        >
          {!accessToken && (
            <Button
              variant="ghost"
              onClick={() => setShowAuth(true)}
              style={{
                width: '78.69px',
                height: '30px',
                background: '#FDF5ED',
                borderRadius: '17981000px',
                borderWidth: '0.54px',
                borderTop: '0.54px solid rgba(0, 0, 0, 0.8)',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                marginTop: '-18px',
                marginLeft: '-10px',
                paddingTop: '7.5px',
                paddingRight: '11.25px',
                paddingBottom: '7.5px',
                paddingLeft: '11.25px',
                gap: '7.5px',
                fontFamily: 'Courier New',
                fontWeight: 400,
                fontSize: '13.13px',
                lineHeight: '18.75px',
                letterSpacing: '0px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000E5',
              }}
            >
              Sign In
            </Button>
          )}
          {accessToken && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              style={{ background: 'transparent' }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button
              variant="ghost"
              onClick={() => setShowMeditation(true)}
              style={{
                width: '29.99px',
                height: '29.99px',
                background: '#FFFFFF',
                borderRadius: '17981000px',
                paddingLeft: '0.01px',
                padding: 0,
                border: 'none',
                marginTop: '-18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                width: '29.99px',
                height: '29.99px',
                borderRadius: '17981000px',
                paddingRight: '0.01px',
                background: 'transparent',
                border: 'none',
                padding: 0,
                marginTop: '-22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar style={{ color: '#000000', width: '14.99px', height: '14.99px' }} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLifetimeView(true)}
              style={{
                width: '29.99px',
                height: '29.99px',
                borderRadius: '17981000px',
                paddingRight: '0.01px',
                background: 'transparent',
                border: 'none',
                padding: 0,
                marginTop: '-22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Grid3X3 style={{ color: '#000000', width: '14.99px', height: '14.99px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAuth && !accessToken && (
          <AuthModal
            onSuccess={handleAuthSuccess}
            onClose={() => setShowAuth(false)}
          />
        )}
      </AnimatePresence>

      {
        showSettings && accessToken && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            accessToken={accessToken}
            onSignOut={handleSignOut}
            dateOfBirth={dateOfBirth}
            onSaveDateOfBirth={handleSaveDateOfBirth}
            expectedLifespan={expectedLifespan}
            onSaveLifespan={saveLifespan}
            meditationDuration={meditationDuration}
            onSaveMeditationDuration={setMeditationDuration}
            totalMeditationMinutes={totalMeditationMinutes}
            onAddManualMeditation={setTotalMeditationMinutes}
          />
        )
      }
      {
        showMeditation && (
          <MeditationTimer
            onComplete={handleMeditationComplete}
            onClose={() => setShowMeditation(false)}
            durationMinutes={meditationDuration}
          />
        )
      }

      {
        showLifetimeView && (
          <LifetimeView
            onClose={() => setShowLifetimeView(false)}
            dateOfBirth={dateOfBirth}
            onSaveDateOfBirth={saveDateOfBirth}
            expectedLifespan={expectedLifespan}
            onSaveLifespan={saveLifespan}
            weekNotes={weekNotes}
            onSaveWeekNote={(weekIndex, note) => {
              setWeekNotes(prev => ({
                ...prev,
                [weekIndex]: note
              }));
            }}
            bucketList={bucketList}
            onSaveBucketList={setBucketList}
            totalMeditationMinutes={totalMeditationMinutes}
          />
        )
      }

      {
        timerModalTodoId && (
          <TimerModal
            onClose={() => setTimerModalTodoId(null)}
            onSetTimer={(minutes) => {
              setTaskTimer(timerModalTodoId, minutes);
            }}
            onClearTimer={() => {
              clearTaskTimer(timerModalTodoId);
            }}
            taskText={currentTodos.find(t => t.id === timerModalTodoId)?.text || ''}
            hasActiveTimer={!!currentTodos.find(t => t.id === timerModalTodoId)?.timerEnd}
          />
        )
      }
    </div >
  );
}

export default function App() {
  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <AppContent />
    </DndProvider>
  );
}