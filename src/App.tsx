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

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      className={`group relative flex items-start gap-3 py-1 mb-1 cursor-pointer select-none ${
        isDragging ? 'opacity-50' : ''
      } ${meditationGlowActive && !todo.completed ? 'animate-pulse' : ''}`}
    >
      <div
        className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0 cursor-pointer mt-1 flex items-center justify-center"
        onClick={onToggle}
      >
        {todo.completed && (
          <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        )}
      </div>
      
      {editingId === todo.id ? (
        <Input
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-0"
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          {timeRemaining ? (
            <div className="relative h-6 flex items-center">
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
                <span className="cursor-text break-words inline mr-8">
                  {todo.text} • {timeRemaining}
                </span>
                <span className="cursor-text break-words inline mr-8">
                  {todo.text} • {timeRemaining}
                </span>
              </motion.div>
            </div>
          ) : (
            <span
              onClick={onStartEdit}
              className={`cursor-text transition-all break-words inline ${
                todo.completed ? 'line-through opacity-50' : ''
              }`}
              style={{
                background: todo.completed
                  ? 'rgba(0,0,0,0.05)'
                  : todo.priority
                  ? 'rgba(243, 235, 126, 0.4)'
                  : meditationGlowActive
                  ? 'rgba(190, 139, 173, 0.05)'
                  : 'transparent',
              }}
            >
              {todo.text}
            </span>
          )}
        </div>
      )}
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTimerClick}
          className={`h-6 w-6 rounded-full hover:bg-black/5 ${timeRemaining ? 'opacity-100' : ''}`}
          title={timeRemaining ? `Timer: ${timeRemaining}` : "Set timer"}
        >
          <Clock className={`h-3 w-3 ${timeRemaining ? 'text-[#D84341]' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPriorityToggle}
          className={`h-6 w-6 rounded-full hover:bg-[#be8bad]/20 ${
            todo.priority ? 'text-[#be8bad]' : ''
          }`}
        >
          <ArrowUp className={`h-3 w-3 ${todo.priority ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-6 w-6 rounded-full hover:bg-black/5"
        >
          <Minus className="h-3 w-3" />
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

  const supabase = getSupabaseClient();

  const dateKey = currentDate.toISOString().split('T')[0];

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
    const today = new Date().toISOString().split('T')[0]; // Real today, not currentDate
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    let hasChanges = false;
    const newTodos = { ...todos };
    
    // Scan all past dates
    Object.keys(newTodos).forEach(dateKey => {
      const taskDate = new Date(dateKey);
      taskDate.setHours(0, 0, 0, 0);
      
      // Only process past dates (before today)
      if (taskDate < todayStart) {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditText(todo.text);
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

  const isToday = dateKey === new Date().toISOString().split('T')[0];
  const hasMeditatedToday = meditationDates.includes(dateKey);

  // Keep tasks in their original order - no sorting by completion status
  const sortedTodos = [...currentTodos];

  return (
    <div 
      className="min-h-screen flex flex-col items-center transition-colors duration-1000"
      style={{
        backgroundColor: timeOfDay === 'night' ? '#1a1a1a' : '#FBF8E8',
        color: timeOfDay === 'night' ? '#fdf5ed' : '#000000',
        paddingTop: 'max(env(safe-area-inset-top), 40px)'
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

      {/* Main Content - Constrained Width */}
      <div className="w-full max-w-[375px] flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousDay}
                className="h-6 w-6 p-0 hover:bg-black/5 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <h1>
                  {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}.{' '}
                  {isToday && (
                    <span 
                      className="inline-block w-2.5 h-2.5 rounded-full mx-1 relative" 
                      style={{ 
                        backgroundColor: hasMeditatedToday ? '#be8bad' : '#D84341',
                        top: 'calc(-0.15em + 2px)',
                        marginRight: 'calc(0.15rem + 4px)'
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
                className="h-6 w-6 p-0 hover:bg-black/5 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday && (
                <Button
                  variant="ghost"
                  onClick={goToToday}
                  className="h-6 px-2 hover:bg-black/5 rounded-full"
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          {/* Calendar */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <MonthView
                  currentDate={currentDate}
                  todos={todos}
                  onSelectDate={(date) => {
                    setCurrentDate(date);
                    setShowCalendar(false);
                  }}
                  meditationDates={meditationDates}
                  onMonthChange={setCurrentDate}
                  onClose={() => setShowCalendar(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Todos List */}
        <div className="flex-1">
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

        {/* Todo Input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add task"
              className="flex-1 bg-transparent border-0 border-b border-black/20 focus:border-black rounded-none px-0"
            />
            <Button
              onClick={addTodo}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-black/5 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-4">
          <div className="border-t border-black/10 pt-4">
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                {accessToken ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(true)}
                      className="h-8 w-8 hover:bg-black/5 rounded-full"
                      title="Email settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAuth(true)}
                    className="h-8 px-3 rounded-full border-black/20 hover:bg-black/5"
                  >
                    Sign In
                  </Button>
                )}
                {syncing && (
                  <div className="flex items-center h-8 px-2 text-black/40">
                    Syncing...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowMeditation(true)}
                  className="h-8 w-8 bg-white hover:bg-black hover:w-auto hover:px-3 rounded-full transition-all duration-500 overflow-hidden group"
                  title="Start meditation"
                >
                  <span className="opacity-0 group-hover:opacity-100 text-white whitespace-nowrap transition-opacity duration-500">
                    meditate
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="h-8 w-8 hover:bg-black/5 rounded-full"
                  title="Toggle calendar"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLifetimeView(true)}
                  className="h-8 w-8 hover:bg-black/5 rounded-full"
                  title="Life in weeks"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAuth && !accessToken && (
          <AuthModal onSuccess={handleAuthSuccess} />
        )}
      </AnimatePresence>

      {showSettings && accessToken && (
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
      )}

      {showMeditation && (
        <>
          <CalmingBackground />
          <MeditationTimer
            onComplete={handleMeditationComplete}
            onClose={() => setShowMeditation(false)}
            durationMinutes={meditationDuration}
          />
        </>
      )}

      {showLifetimeView && (
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
      )}

      {timerModalTodoId && (
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
      )}
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <AppContent />
    </DndProvider>
  );
}