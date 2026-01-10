import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, Star, BarChart3, Undo2, Calendar, Settings, LogOut, Circle, Grid3X3, Minus, Square, ArrowUp, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { MonthView } from './components/MonthView';
import { CalmingBackground } from './components/CalmingBackground';
import { MeditationTimer } from './components/MeditationTimer';
import { LifetimeView } from './components/LifetimeView';
import { EyeOpenIcon, EyeClosedIcon } from './components/EyeIcon';
import { TimerModal } from './components/TimerModal';
import { OnboardingModal } from './components/OnboardingModal';
import { getSupabaseClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { useTimeOfDay } from './hooks/useTimeOfDay';
import { secureStorage } from './utils/secureStorage';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Browser } from '@capacitor/browser';
import { getLocalDateString } from './utils/dateUtils';
import { useIsMobile } from './components/ui/use-mobile';
import { WebLayout } from './components/WebLayout';
import { useSubscription } from './hooks/useSubscription';
import { useApplePurchases } from './hooks/useApplePurchases';
import { ProPaywall } from './components/ProPaywall';
import { DrawingView } from './components/DrawingView';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  priority: boolean;
  rolledOver?: boolean;
  timerEnd?: number; // Timestamp when timer should complete
}

export interface TodosState {
  [date: string]: TodoItem[];
}

export type TodosByDate = TodosState;

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
  meditationGlowActive: boolean;
  timeRemaining?: string;
  timeOfDay: 'day' | 'night';
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
  meditationGlowActive,
  timeRemaining,
  timeOfDay
}: DraggableTodoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null); // New ref for the drag handle
  const textMeasureRef = useRef<HTMLSpanElement>(null); // Ref to measure text width
  const [scrollDistance, setScrollDistance] = useState(0);

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

  // Measure text width for scrolling animation
  useEffect(() => {
    if (timeRemaining && textMeasureRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (textMeasureRef.current) {
          const textWidth = textMeasureRef.current.scrollWidth;
          const containerWidth = 240; // Approximate available width (330px - 90px padding)
          if (textWidth > containerWidth) {
            // Scroll through the entire text width plus some padding
            setScrollDistance(-(textWidth - containerWidth + 50));
          } else {
            // For short text, scroll by the text width plus spacing to create a continuous loop
            // This makes it scroll continuously like long text
            setScrollDistance(-(textWidth + 32)); // 32px is the marginRight between duplicated spans
          }
        }
      });
    } else {
      setScrollDistance(0);
    }
  }, [timeRemaining, todo.text]);

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
          backgroundColor: '#FFFFFF',
          marginTop: '5.5px',
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
          <X className="h-2.5 w-2.5" style={{ color: '#000000', stroke: '#000000' }} strokeWidth={3} />
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
              data-task-text="true"
              style={{
                position: 'relative',
                height: '22.49px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'grab',
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.49px',
                color: '#000000',
                textDecoration: todo.completed ? 'line-through' : 'none',
                opacity: todo.completed ? 0.5 : 1,
                background: todo.completed
                  ? 'rgba(0,0,0,0.05)'
                  : todo.priority
                    ? (timeOfDay === 'night' ? 'rgba(156, 156, 156, 0.4)' : 'rgba(243, 235, 126, 0.4)')
                    : meditationGlowActive
                      ? 'rgba(190, 139, 173, 0.05)'
                      : 'transparent',
                overflow: 'hidden',
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none', // Safari/Chrome
                MozUserSelect: 'none', // Firefox
              }}
            >
              {/* Hidden span to measure text width */}
              <span
                ref={textMeasureRef}
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.49px',
                  pointerEvents: 'none',
                }}
              >
                {todo.text} • {timeRemaining}
              </span>
              <motion.div
                style={{
                  position: 'absolute',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                }}
                animate={{
                  x: scrollDistance !== 0 ? [0, scrollDistance] : 0,
                }}
                transition={{
                  duration: scrollDistance !== 0 ? Math.max(5, Math.abs(scrollDistance) / 20) : 0,
                  repeat: scrollDistance !== 0 ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <span style={{
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.49px',
                  marginRight: '32px',
                }}>
                  {todo.text} • {timeRemaining}
                </span>
                <span style={{
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.49px',
                  marginRight: '32px',
                }}>
                  {todo.text} • {timeRemaining}
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <span
              ref={dragHandleRef} // Apply drag handle here
              {...drag(dragHandleRef)} // Make this span draggable
              onClick={onStartEdit}
              data-task-text="true"
              className="cursor-text transition-all"
              style={{
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                    ? (timeOfDay === 'night' ? 'rgba(156, 156, 156, 0.4)' : 'rgba(243, 235, 126, 0.4)')
                    : meditationGlowActive
                      ? 'rgba(190, 139, 173, 0.05)'
                      : 'transparent',
                cursor: 'grab', // Indicate draggable area
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none', // Safari/Chrome
                MozUserSelect: 'none', // Firefox
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
          <Clock style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '15px', height: '15px' }} />
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
          <ArrowUp style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '15px', height: '15px' }} />
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
          <Minus style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '15px', height: '15px' }} />
        </Button>
      </div>
    </div>
  );
}

function AppContent() {
  const timeOfDay = useTimeOfDay();
  const isMobile = useIsMobile();
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
  const [showBucketList, setShowBucketList] = useState(false);
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
  const [showPaywall, setShowPaywall] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);

  // Check for subscription success/cancel params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscription = params.get('subscription');

    if (subscription === 'success') {
      toast.success('Pro Subscription Activated! 🎉', {
        description: 'Thank you for upgrading. Your 3-month free trial has started.',
        duration: 5000,
      });
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (subscription === 'canceled') {
      toast.info('Subscription checkout canceled');
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const supabase = getSupabaseClient();

  // Subscription management
  const { isPro: isStripePro, isLoading: isSubscriptionLoading, createCheckoutSession, refresh: refreshSubscription } = useSubscription(accessToken);

  // Apple In-App Purchases (iOS only)
  const { isPro: isApplePro, purchase: applePurchase, restorePurchases, isIOSNative } = useApplePurchases(accessToken);

  // Combined Pro status (either Stripe or Apple)
  const isPro = isStripePro || isApplePro;

  // Refresh subscription when returning from in-app browser or app comes to foreground
  useEffect(() => {
    // Listen for browser close events
    const handleBrowserFinished = () => {
      console.log('Browser closed, refreshing subscription...');
      // Small delay to allow webhook to process
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
    };

    // Listen for visibility change (app comes to foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visible, refreshing subscription...');
        refreshSubscription();
      }
    };

    Browser.addListener('browserFinished', handleBrowserFinished);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      Browser.removeAllListeners();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSubscription]);

  const dateKey = getLocalDateString(currentDate);

  // Set body background color to match app
  useEffect(() => {
    const bgColor = timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6';
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.backgroundColor = bgColor;

    // Update theme-color meta tag for mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', bgColor);
    }

    // Programmatically set Native Status Bar
    const setStatusBar = async () => {
      try {
        if (showDrawing) {
          // Force dark status bar for drawing view
          await StatusBar.setStyle({ style: Style.Dark });
          // With overlay: true, we rely on the view's background. 
          // But setting background color to black ensures no flicker if there's a gap.
          // However, overly relies on webview.
          await StatusBar.setOverlaysWebView({ overlay: true });
        } else {
          await StatusBar.setStyle({ style: timeOfDay === 'night' ? Style.Dark : Style.Light });
          await StatusBar.setOverlaysWebView({ overlay: true });
        }
      } catch (e) {
        console.error('StatusBar error:', e);
      }
    };
    setStatusBar();

    // Control body overflow for full-screen modals
    if (showLifetimeView || showMeditation || showAuth || showSettings || timerModalTodoId || showOnboarding || showDrawing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.overflow = '';
    };
  }, [timeOfDay, showLifetimeView, showMeditation, showAuth, showSettings, timerModalTodoId, showOnboarding, showDrawing]);

  // Track keyboard visibility (only on mobile/Capacitor)
  useEffect(() => {
    // Only run on Capacitor (mobile)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
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
    }
  }, []);

  // Prevent content shifting when keyboard appears/disappears (only on mobile/Capacitor)
  useEffect(() => {
    // Only run on Capacitor (mobile)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
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
        // Don't prevent scrolling inside modals (SettingsModal, LifetimeView, etc.)
        const target = e.target as HTMLElement;
        if (target && (
          target.closest('[class*="overflow-y-auto"]') ||
          target.closest('[class*="overflow-y-scroll"]') ||
          target.closest('.fixed.inset-0')
        )) {
          return; // Allow scrolling in modals
        }
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
    }
  }, []);

  // Check if first time opening app
  useEffect(() => {
    const hasSeenOnboarding = secureStorage.getItem<boolean>('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

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

  // Clear text selection when clicking outside tasks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Only clear selection if not in edit mode
      if (editingId) return;

      const target = e.target as HTMLElement;
      // Check if click is on an input field, textarea, or any editable element
      const isInputField = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea');

      // If clicking on an input field, don't clear selection
      if (isInputField) return;

      // Check if click is not on a task span or within task text
      const isTaskClick = target.closest('[data-task-text]') ||
        target.hasAttribute('data-task-text');

      if (!isTaskClick) {
        // Clear native text selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          selection.removeAllRanges();
        }
      }
    };

    // Use capture phase to catch events early
    document.addEventListener('touchend', handleClickOutside, { capture: true });
    document.addEventListener('click', handleClickOutside, { capture: true });

    return () => {
      document.removeEventListener('touchend', handleClickOutside, { capture: true });
      document.removeEventListener('click', handleClickOutside, { capture: true });
    };
  }, [editingId]);


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
      console.log('[AUTH] Auth state change:', event);

      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        // Token was refreshed successfully
        setAccessToken(session.access_token);
        setUserId(session.user.id);
      } else if (event === 'SIGNED_IN' && session?.access_token) {
        // New sign in - reset merge flag
        hasMergedLocalDataRef.current = false;
        setAccessToken(session.access_token);
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT' || !session) {
        // Signed out or session cleared
        hasMergedLocalDataRef.current = false;
        setAccessToken(null);
        setUserId(null);
      }
    });

    // Get initial session with error handling for invalid refresh tokens
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AUTH] Error getting session:', error);
        // If refresh token is invalid, clear any stale auth state
        if (error.message?.includes('refresh_token') || error.code === 'refresh_token_not_found') {
          console.log('[AUTH] Invalid refresh token, clearing session');
          supabase.auth.signOut(); // Clear the invalid session
          setAccessToken(null);
          setUserId(null);
        }
        return;
      }

      if (session?.access_token) {
        setAccessToken(session.access_token);
        setUserId(session.user.id);
      }
    }).catch((err) => {
      // Handle any caught errors (like network issues)
      console.error('[AUTH] Failed to get session:', err);
      // If it's related to refresh token, sign out
      if (err?.message?.includes('refresh_token') || err?.code === 'refresh_token_not_found') {
        supabase.auth.signOut();
        setAccessToken(null);
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Track if we've merged local data after authentication
  const hasMergedLocalDataRef = useRef(false);

  // Track if sync to backend is in progress (to prevent race conditions)
  const isSyncingToBackendRef = useRef(false);

  // Track the last date we checked for task rollover
  const lastCheckedDateRef = useRef<string | null>(null);

  // Load data from backend when authenticated
  useEffect(() => {
    if (accessToken && !hasMergedLocalDataRef.current) {
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

  // Sync when app returns from background (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && accessToken) {
        console.log('[SYNC] App became visible, syncing from server...');
        loadFromBackend();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [accessToken]);

  // Periodic sync disabled - was causing feedback loops with concurrent requests
  // Sync now happens only on: 1) data changes (1s debounce), 2) app visibility change
  // If you need periodic sync, increase interval to 60+ seconds and add proper debouncing

  // Helper function to merge local and server tasks
  // SERVER IS SOURCE OF TRUTH - if task doesn't exist on server, it was deleted elsewhere
  // We only add local-only tasks if they are NEW (created while offline)
  const mergeTasks = (localTasks: TodosState, serverTasks: TodosState): TodosState => {
    const merged: TodosState = {};

    // Get all unique date keys from both
    const allDateKeys = new Set([...Object.keys(localTasks), ...Object.keys(serverTasks)]);

    // Get all task IDs from server (these are the authoritative ones)
    const allServerTaskIds = new Set<string>();
    Object.values(serverTasks).forEach(tasks => {
      tasks.forEach(t => allServerTaskIds.add(t.id));
    });

    allDateKeys.forEach(dateKey => {
      const localTasksForDate = localTasks[dateKey] || [];
      const serverTasksForDate = serverTasks[dateKey] || [];

      // Create a map of local tasks by ID for quick lookup
      const localTaskMap = new Map(localTasksForDate.map(t => [t.id, t]));
      const serverTaskMap = new Map(serverTasksForDate.map(t => [t.id, t]));

      // Get all unique task IDs for this date
      const allTaskIds = new Set([...localTaskMap.keys(), ...serverTaskMap.keys()]);

      const mergedTasksForDate: TodoItem[] = [];

      allTaskIds.forEach(taskId => {
        const localTask = localTaskMap.get(taskId);
        const serverTask = serverTaskMap.get(taskId);

        if (localTask && serverTask) {
          // Task exists in both - merge intelligently
          // Once a task is completed anywhere, it stays completed
          const isCompleted = localTask.completed || serverTask.completed;
          const isPriority = localTask.priority || serverTask.priority;

          mergedTasksForDate.push({
            ...serverTask,
            ...localTask,
            completed: isCompleted,
            priority: isPriority,
          });
        } else if (localTask && !allServerTaskIds.has(taskId)) {
          // Only exists locally AND never existed on server (new task created offline)
          // Keep it - it will be synced to server
          mergedTasksForDate.push(localTask);
        } else if (serverTask) {
          // Only exists on server - use it unless locally deleted
          const storedDeletedIds = secureStorage.getItem<string[]>('deletedTaskIds') || [];
          if (!storedDeletedIds.includes(taskId)) {
            mergedTasksForDate.push(serverTask);
          }
        }
        // If task only exists locally but WAS on server before (deleted on another device), skip it
      });

      if (mergedTasksForDate.length > 0) {
        merged[dateKey] = mergedTasksForDate;
      }
    });

    return merged;
  };

  // Helper function to merge arrays (for meditationDates, bucketList, etc.)
  const mergeArrays = <T,>(local: T[] | null, server: T[] | null | undefined): T[] => {
    if (!server || server.length === 0) {
      return local || [];
    }
    if (!local || local.length === 0) {
      return server;
    }
    // Merge and deduplicate
    const combined = [...server, ...local];
    if (typeof combined[0] === 'string') {
      return [...new Set(combined)] as T[];
    }
    // For objects, check by id if it exists
    const seen = new Set<string>();
    return combined.filter((item: any) => {
      if (item.id) {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }
      return true;
    }) as T[];
  };

  const loadFromBackend = async () => {
    console.log('[DEBUG] loadFromBackend called, accessToken exists:', !!accessToken);
    if (!accessToken) {
      console.log('[DEBUG] No accessToken, returning early');
      return;
    }

    // Skip loading if we're currently syncing to backend (prevents race condition)
    if (isSyncingToBackendRef.current) {
      console.log('[DEBUG] Skipping load - sync to backend in progress');
      return;
    }

    console.log('[DEBUG] hasMergedLocalDataRef:', hasMergedLocalDataRef.current);

    // Preserve local data before loading from backend
    const localTodos = secureStorage.getItem<TodosState>('todos') || {};
    console.log('[DEBUG] Local todos keys:', Object.keys(localTodos));
    const localDateOfBirth = secureStorage.getItem<string>('dateOfBirth');
    const localExpectedLifespan = secureStorage.getItem<number>('expectedLifespan');
    const localMeditationDates = secureStorage.getItem<string[]>('meditationDates') || [];
    const localLastMeditationTime = secureStorage.getItem<number>('lastMeditationTime');
    const localTotalMeditationMinutes = secureStorage.getItem<number>('totalMeditationMinutes') || 0;
    const localWeekNotes = secureStorage.getItem<{ [weekIndex: number]: string }>('weekNotes') || {};
    const localBucketList = secureStorage.getItem<{ id: string; text: string; completed: boolean }[]>('bucketList') || [];

    try {
      // Get fresh session token to avoid 401 errors with stale tokens
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      if (!freshToken) {
        console.error('[DEBUG] No valid session token available');
        return;
      }

      // Get timezone offset in minutes (negative for timezones behind UTC)
      const timezoneOffset = -new Date().getTimezoneOffset();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/todos?timezoneOffset=${timezoneOffset}`,
        {
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        }
      );

      console.log('[DEBUG] Response status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Server data received:', {
          todoKeys: Object.keys(data.todos || {}),
          totalTodos: Object.values(data.todos || {}).flat().length,
          hasBucketList: (data.bucketList || []).length,
          dateOfBirth: data.dateOfBirth
        });

        // USE SERVER DATA AS SOURCE OF TRUTH
        // Server is authoritative - if task was deleted on another device, it won't be in serverTodos
        const serverTodos = data.todos || {};

        // Simply use server data - don't merge with local
        // This ensures deletions on other devices are respected
        setTodos(serverTodos);

        // Also update local storage to match server
        secureStorage.setItem('todos', serverTodos);

        // Reset the last checked date so task transfer runs again after loading
        // This ensures tasks are properly transferred even if the app was closed at midnight
        lastCheckedDateRef.current = null;
        secureStorage.removeItem('lastTaskRolloverDate');

        // For other data, prefer server if it exists, otherwise use local
        if (data.dateOfBirth || localDateOfBirth) {
          setDateOfBirth(data.dateOfBirth || localDateOfBirth);
        }
        if (data.expectedLifespan !== undefined || localExpectedLifespan !== null) {
          setExpectedLifespan(data.expectedLifespan !== undefined ? data.expectedLifespan : (localExpectedLifespan || 80));
        }

        // Merge meditation dates
        const mergedMeditationDates = mergeArrays(localMeditationDates, data.meditationDates);
        setMeditationDates(mergedMeditationDates);

        if (data.lastMeditationTime || localLastMeditationTime) {
          // Prefer the more recent meditation time
          const serverTime = data.lastMeditationTime || 0;
          const localTime = localLastMeditationTime || 0;
          setLastMeditationTime(Math.max(serverTime, localTime));
        }

        if (data.totalMeditationMinutes !== undefined || localTotalMeditationMinutes > 0) {
          // Sum the meditation minutes (in case user has done meditation on both local and server)
          const serverMinutes = data.totalMeditationMinutes || 0;
          const localMinutes = localTotalMeditationMinutes || 0;
          // Use the larger value to avoid double counting (safer approach)
          setTotalMeditationMinutes(Math.max(serverMinutes, localMinutes));
        }

        // Merge week notes
        const mergedWeekNotes = { ...data.weekNotes, ...localWeekNotes };
        if (Object.keys(mergedWeekNotes).length > 0) {
          setWeekNotes(mergedWeekNotes);
        }

        // Merge bucket list
        const mergedBucketList = mergeArrays(localBucketList, data.bucketList);
        if (mergedBucketList.length > 0) {
          setBucketList(mergedBucketList);
        }

        // Mark that we've merged local data
        hasMergedLocalDataRef.current = true;

        // Immediately sync the merged data back to backend
        // Use a small delay to ensure state has updated
        setTimeout(() => {
          syncToBackend();
        }, 500);
      }
    } catch (err) {
      console.error('Failed to load from backend:', err);
      // If loading fails, keep local data and mark as merged so we don't try again
      hasMergedLocalDataRef.current = true;
    }
  };

  const syncToBackend = async () => {
    if (!accessToken) return;

    // Set flag to prevent loadFromBackend from running during sync
    isSyncingToBackendRef.current = true;
    setSyncing(true);

    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      if (!freshToken) {
        console.error('No valid session token available');
        setSyncing(false);
        isSyncingToBackendRef.current = false;
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
            bucketList,
            // Send timezone offset for server to store and use in email digests
            timezoneOffset: -new Date().getTimezoneOffset(),
            // Send deleted task IDs so server can remove them too
            deletedTaskIds: secureStorage.getItem<string[]>('deletedTaskIds') || []
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to sync to backend:', response.status, errorText);
      } else {
        console.log('[SYNC] Sync successful');
      }
    } catch (err) {
      // Silently fail if not connected or server is not available
      console.error('Failed to sync to backend:', err);
    } finally {
      setSyncing(false);
      isSyncingToBackendRef.current = false;
    }
  };

  const handleAuthSuccess = (token: string, uid: string) => {
    // Reset merge flag so we can merge local data after authentication
    hasMergedLocalDataRef.current = false;
    setAccessToken(token);
    setUserId(uid);
    setShowAuth(false);
    toast.success('Signed in successfully');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();

    // Clear all local storage data
    secureStorage.clear();

    // Reset merge flag for next authentication
    hasMergedLocalDataRef.current = false;

    // Reset all state to empty/default values
    setAccessToken(null);
    setUserId(null);
    setTodos({});
    setDateOfBirth(null);
    setExpectedLifespan(80); // Reset to default
    setMeditationDates([]);
    setLastMeditationTime(null);
    setTotalMeditationMinutes(0);
    setWeekNotes({});
    setBucketList([]);
    setDeletedTaskIds(new Set());

    toast.success('Signed out successfully');
  };

  const handleDeleteAccount = async () => {
    if (!accessToken) return;

    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      if (!freshToken) {
        toast.error('Unable to delete account. Please try again.');
        return;
      }

      // Call delete endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/delete-account`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        }
      );

      if (response.ok) {
        // Clear local storage
        secureStorage.clear();

        // Reset all state
        setTodos({});
        setDateOfBirth(null);
        setMeditationDates([]);
        setLastMeditationTime(null);
        setWeekNotes({});
        setBucketList([]);

        // Sign out (which clears auth)
        await supabase.auth.signOut();
        setAccessToken(null);
        setUserId(null);

        toast.success('Account deleted successfully');
        setShowSettings(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error('Failed to delete account. Please try again.');
    }
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
    setUndoStack([action]); // Only keep the latest action (one-level undo)
  };

  const handleUndo = (actionOverride?: UndoAction) => {
    const action = actionOverride || (undoStack.length > 0 ? undoStack[undoStack.length - 1] : undefined);
    if (!action) return;

    setUndoStack([]); // Always clear stack since it's one-level

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
  // Only moves tasks after midnight (when date actually changes)
  const moveIncompleteTasksToToday = useCallback(() => {
    const now = new Date();
    const today = getLocalDateString(now);

    // Get the last checked date from storage or ref
    const lastCheckedDate = lastCheckedDateRef.current || secureStorage.getItem<string>('lastTaskRolloverDate');

    // Only proceed if we've crossed midnight (date has actually changed from last check)
    // This ensures tasks only move at midnight, not during the day
    // Exception: if lastCheckedDate is null (first run), we should check once to move any past tasks
    if (lastCheckedDate !== null && lastCheckedDate === today) {
      // Still the same day - don't move tasks, wait for midnight
      return;
    }

    // If we're here, either:
    // 1. First run (lastCheckedDate is null) - move past tasks
    // 2. Date has changed (crossed midnight) - move past tasks
    // Use functional update to always work with latest state
    setTodos(prevTodos => {
      let hasChanges = false;
      const newTodos = { ...prevTodos };

      // Scan all past dates (only dates strictly before today)
      Object.keys(newTodos).forEach(dateKey => {
        // Only process past dates (before today, using string comparison)
        if (dateKey < today) {
          // Use strict boolean comparison to ensure completed priority tasks are not transferred
          // This fixes a bug where priority tasks with completed=true were being treated as incomplete
          const incompleteTasks = newTodos[dateKey].filter((t: TodoItem) => t.completed !== true);

          if (incompleteTasks.length > 0) {
            hasChanges = true;

            // Remove incomplete tasks from past date (keep only truly completed tasks)
            newTodos[dateKey] = newTodos[dateKey].filter((t: TodoItem) => t.completed === true);

            // Add incomplete tasks to today (update date field and remove rolledOver flag if present)
            if (!newTodos[today]) {
              newTodos[today] = [];
            }
            // Get existing task IDs on today to prevent duplicates
            const existingTaskIds = new Set(newTodos[today].map((t: TodoItem) => t.id));
            // Update the date field of transferred tasks to today and filter out any that already exist
            const transferredTasks = incompleteTasks
              .filter(t => !existingTaskIds.has(t.id))
              .map(t => ({
                ...t,
                date: today,
                rolledOver: undefined // Remove rolledOver flag
              }));
            newTodos[today] = [...transferredTasks, ...newTodos[today]];
          }
        }
      });

      // Update the last checked date to prevent moving tasks again until next midnight
      if (hasChanges) {
        lastCheckedDateRef.current = today;
        secureStorage.setItem('lastTaskRolloverDate', today);
      }

      return hasChanges ? newTodos : prevTodos;
    });

    // Update the last checked date even if no changes (to prevent checking again today)
    if (lastCheckedDate !== today) {
      lastCheckedDateRef.current = today;
      secureStorage.setItem('lastTaskRolloverDate', today);
    }
  }, []);

  // Run on mount and when date changes
  useEffect(() => {
    moveIncompleteTasksToToday();
  }, [currentDate]);

  // Run daily check - check every minute to catch midnight rollover
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

    const action: UndoAction = { type: 'toggle', todo, dateKey };
    addToUndoStack(action);
  };

  const deleteTodo = (id: string) => {
    const index = currentTodos.findIndex(t => t.id === id);
    const todo = currentTodos[index];
    if (!todo) return;

    setTodos(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter(t => t.id !== id)
    }));

    // Track deleted task ID to prevent it from being restored from server
    setDeletedTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    // Also persist to storage for cross-session persistence
    const storedDeletedIds = secureStorage.getItem<string[]>('deletedTaskIds') || [];
    if (!storedDeletedIds.includes(id)) {
      secureStorage.setItem('deletedTaskIds', [...storedDeletedIds, id]);
    }

    const action: UndoAction = { type: 'delete', todo, index, dateKey };
    addToUndoStack(action);
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

    const action: UndoAction = { type: 'reorder', todos: previousTodos, dateKey };
    addToUndoStack(action);
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

  // If desktop, render WebLayout
  if (!isMobile) {
    return (
      <>
        <Toaster position="top-center" />
        <WebLayout
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          todos={todos}
          setTodos={setTodos}
          newTodo={newTodo}
          setNewTodo={setNewTodo}
          editingId={editingId}
          setEditingId={setEditingId}
          editText={editText}
          setEditText={setEditText}
          dateKey={dateKey}
          currentTodos={currentTodos}
          sortedTodos={sortedTodos}
          meditationDates={meditationDates}
          dateOfBirth={dateOfBirth}
          expectedLifespan={expectedLifespan}
          weekNotes={weekNotes}
          setWeekNotes={setWeekNotes}
          bucketList={bucketList}
          setBucketList={setBucketList}
          totalMeditationMinutes={totalMeditationMinutes}
          meditationGlowActive={!!meditationGlowActive}
          currentTime={currentTime}
          timerModalTodoId={timerModalTodoId}
          setTimerModalTodoId={setTimerModalTodoId}
          accessToken={accessToken}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          showAuth={showAuth}
          setShowAuth={setShowAuth}
          onToggle={toggleTodo}
          onStartEdit={startEdit}
          onSave={handleSave}
          onKeyDown={handleKeyDown}
          onMove={moveTodo}
          onDelete={deleteTodo}
          onPriorityToggle={togglePriority}
          onTimerClick={setTimerModalTodoId}
          getTimeRemaining={getTimeRemaining}
          setTaskTimer={setTaskTimer}
          clearTaskTimer={clearTaskTimer}
          addTodo={addTodo}
          goToPreviousDay={goToPreviousDay}
          goToNextDay={goToNextDay}
          goToToday={goToToday}
          onMonthChange={(direction) => {
            const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
            setCurrentDate(newDate);
          }}
          onSelectDate={setCurrentDate}
          onSaveWeekNote={(weekIndex, note) => {
            setWeekNotes(prev => ({
              ...prev,
              [weekIndex]: note
            }));
          }}
          timeOfDay={timeOfDay}
          showBucketList={showBucketList}
          setShowBucketList={setShowBucketList}
          undoStack={undoStack}
          onUndo={() => handleUndo()}
          isPro={isPro}
          onShowPaywall={() => setShowPaywall(true)}
        />
        {/* Modals for web */}
        <AnimatePresence>
          {showAuth && !accessToken && (
            <AuthModal
              onSuccess={handleAuthSuccess}
              onClose={() => setShowAuth(false)}
            />
          )}
        </AnimatePresence>
        {showSettings && accessToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: 'calc(100vw / 3)',
              minWidth: '320px',
              maxWidth: 'calc(100vw / 3)',
              height: '100dvh',
              backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : '#E9EAE5',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '40px',
              overflow: 'auto',
              borderRight: timeOfDay === 'night' ? '0.54px solid rgba(251,248,232,0.1)' : '0.54px solid rgba(0, 0, 0, 0.1)',
            }}
          >
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
              timeOfDay={timeOfDay as 'day' | 'night'}
              isEmbedded={true}
              isPro={isPro}
              onShowPaywall={() => setShowPaywall(true)}
            />
          </motion.div>
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
        {/* Bucket List Modal - Right Side */}
        {showBucketList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 'calc(100vw / 3)',
              minWidth: '320px',
              maxWidth: 'calc(100vw / 3)',
              height: '100dvh',
              backgroundColor: timeOfDay === 'night' ? '#690D1C' : '#f0d6d9',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderLeft: timeOfDay === 'night' ? '0.54px solid rgba(251,248,232,0.1)' : '0.54px solid rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header - matches left panel header area */}
            <div style={{
              width: '100%',
              paddingTop: '39px',
              paddingLeft: '39px',
              paddingRight: '39px',
              paddingBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}>
              <h2 style={{
                fontFamily: 'Courier New',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: '22.5px',
                color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                margin: 0,
              }}>
                Resolutions 2026
              </h2>
              <button
                onClick={() => setShowBucketList(false)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '15px', height: '15px' }} />
              </button>
            </div>

            {/* Scrollable Content - takes remaining space */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '0 39px',
            }}>
              {bucketList.length === 0 && (
                <p style={{
                  fontFamily: 'Courier New',
                  fontSize: '13px',
                  color: timeOfDay === 'night' ? 'rgba(251,248,232,0.6)' : 'rgba(0, 0, 0, 0.6)',
                }}>
                  No resolution items
                </p>
              )}
              {bucketList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    gap: '10px',
                  }}
                >
                  <button
                    onClick={() => {
                      setBucketList(bucketList.map(i =>
                        i.id === item.id ? { ...i, completed: !i.completed } : i
                      ));
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: timeOfDay === 'night' ? '2px solid rgba(251,248,232,0.4)' : '2px solid rgba(0, 0, 0, 0.4)',
                      background: item.completed ? (timeOfDay === 'night' ? '#FBF8E8' : '#000') : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.completed && (
                      <X style={{ color: timeOfDay === 'night' ? '#1D1C1C' : '#fff', width: '10px', height: '10px' }} strokeWidth={3} />
                    )}
                  </button>
                  <span style={{
                    fontFamily: 'Courier New',
                    fontSize: '15px',
                    fontWeight: 700,
                    flex: 1,
                    textDecoration: item.completed ? 'line-through' : 'none',
                    opacity: item.completed ? 0.5 : 1,
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  }}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => {
                      setBucketList(bucketList.filter(i => i.id !== item.id));
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000', width: '14px', height: '14px' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Item Footer - 79px height like other panels */}
            <div style={{
              width: '100%',
              height: '79px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: '39px',
              paddingRight: '39px',
              borderTop: timeOfDay === 'night' ? '1px solid rgba(251,248,232,0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <Input
                  placeholder="Add resolution"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setBucketList([...bucketList, {
                        id: `${Date.now()}-${Math.random()}`,
                        text: e.currentTarget.value.trim(),
                        completed: false,
                      }]);
                      e.currentTarget.value = '';
                    }
                  }}
                  style={{
                    flex: 1,
                    height: '26px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: timeOfDay === 'night' ? '0.54px solid rgba(251,248,232,0.8)' : '0.54px solid rgba(0, 0, 0, 0.8)',
                    padding: 0,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add resolution"]') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      setBucketList([...bucketList, {
                        id: `${Date.now()}-${Math.random()}`,
                        text: input.value.trim(),
                        completed: false,
                      }]);
                      input.value = '';
                    }
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '19.5px', height: '19.5px' }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pro Paywall Modal for Web */}
        <ProPaywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          onStartTrial={async (priceType) => {
            const url = await createCheckoutSession(priceType);
            if (url) {
              // Use in-app browser for better UX
              await Browser.open({ url });
            }
          }}
          onApplePurchase={applePurchase}
          onRestorePurchases={restorePurchases}
          timeOfDay={timeOfDay as 'day' | 'night'}
        />
      </>
    );
  }

  // Mobile layout (existing code - unchanged)
  return (
    <div
      className="flex flex-col items-center transition-colors duration-1000"
      style={{
        backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
        color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              cursor: 'pointer',
              margin: 0,
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7.49px',
                margin: 0,
                padding: 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '5.007076740264893px',
                  height: '5.007076740264893px',
                  borderRadius: '50%',
                  backgroundColor: '#D84341',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.5px',
                  letterSpacing: '0px',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                }}
              >
                mm/dd/yyyy
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Hidden when splash is showing */}
      {!showSplash && (
        <>
          {/* Header - Date navigation container - Outside main container to prevent shifting */}
          <div
            style={{
              position: 'fixed',
              top: '77.5px',
              left: '31.67px',
              right: '22.5px',
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
                  stroke: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  strokeWidth: '1.25px',
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                  stroke: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  strokeWidth: '1.25px',
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                    color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
                  }}
                >
                  Today
                </span>
              </Button>
            )}

            {/* Undo Button - positioned absolutely at right edge */}
            {undoStack.length > 0 && (
              <button
                onClick={() => handleUndo()}
                style={{
                  position: 'absolute',
                  right: '22.5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  paddingRight: '0.01px',
                  width: '12.99px',
                  height: '12.99px',
                  borderRadius: '20562800px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 1,
                  zIndex: 10,
                }}
              >
                <img
                  src="/undo.svg"
                  alt="Undo"
                  style={{
                    width: '12.99px',
                    height: '12.99px',
                    filter: timeOfDay === 'night' ? 'invert(1) sepia(1) saturate(0) brightness(1.1)' : 'none',
                  }}
                />
              </button>
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
                    timeOfDay={timeOfDay as 'day' | 'night'}
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
                meditationGlowActive={!!meditationGlowActive}
                timeRemaining={getTimeRemaining(todo.timerEnd)}
                onTimerClick={() => setTimerModalTodoId(todo.id)}
                timeOfDay={timeOfDay as 'day' | 'night'}
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
                  borderBottom: timeOfDay === 'night' ? '0.54px solid rgba(251, 248, 232, 0.8)' : '0.54px solid rgba(0, 0, 0, 0.8)',
                  paddingTop: '3.75px',
                  paddingBottom: '3.75px',
                  paddingLeft: 0,
                  paddingRight: 0,
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '100%',
                  letterSpacing: '0px',
                  color: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
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
                <Plus style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '14.99px', height: '14.99px' }} />
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
                    background: '#F5D5D8',
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
                    fontWeight: 700,
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
                  style={{
                    width: '29.99px',
                    height: '29.99px',
                    borderRadius: '17981000px',
                    paddingRight: '0.01px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    marginTop: '-22px', // Maintain alignment
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '14.99px', height: '14.99px' }} />
                </Button>
              )}

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Drawing Button - iOS only, 16.5px gap from meditation */}
                {isIOSNative && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (isPro) {
                        setShowDrawing(true);
                      } else {
                        setShowPaywall(true);
                      }
                    }}
                    style={{
                      width: '29.99px',
                      height: '29.99px',
                      background: timeOfDay === 'night' ? '#FFFFFF' : '#000000',
                      borderRadius: '17981000px',
                      padding: 0,
                      border: 'none',
                      marginTop: '-18px',
                      marginRight: '4.5px', // Adjusts total gap to ~16.5px with the existing 12px
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Rectangle icon inside 16x21 */}
                    <div
                      style={{
                        width: '16px',
                        height: '21px', // Requested 16x21
                        backgroundColor: timeOfDay === 'night' ? '#000000' : '#FFFFFF', // Filled rectangle
                        borderRadius: '1px', // Slight radius for aesthetics
                      }}
                    />
                  </Button>
                )}

                {/* Meditation Button */}
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
                  <Calendar style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '14.99px', height: '14.99px' }} />
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
                  <Grid3X3 style={{ color: timeOfDay === 'night' ? '#FBF8E8' : '#000000', width: '14.99px', height: '14.99px' }} />
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100dvh',
                  backgroundColor: '#ECE8D6',
                  zIndex: 99999,
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: 'max(env(safe-area-inset-top), 40px)',
                  overflow: 'hidden',
                }}
              >
                <SettingsModal
                  onClose={() => {
                    setShowSettings(false);
                    loadFromBackend();
                  }}
                  accessToken={accessToken}
                  onSignOut={handleSignOut}
                  onDeleteAccount={handleDeleteAccount}
                  dateOfBirth={dateOfBirth}
                  onSaveDateOfBirth={handleSaveDateOfBirth}
                  expectedLifespan={expectedLifespan}
                  onSaveLifespan={saveLifespan}
                  meditationDuration={meditationDuration}
                  onSaveMeditationDuration={setMeditationDuration}
                  totalMeditationMinutes={totalMeditationMinutes}
                  onAddManualMeditation={setTotalMeditationMinutes}
                  isPro={isPro}
                  onShowPaywall={() => setShowPaywall(true)}
                />
              </motion.div>
            )
          }
          {
            showMeditation && (
              <MeditationTimer
                onComplete={handleMeditationComplete}
                onClose={() => {
                  setShowMeditation(false);
                  loadFromBackend();
                }}
                durationMinutes={meditationDuration}
              />
            )
          }

          {/* Drawing View Modal - iOS only */}
          {showDrawing && (
            <DrawingView
              onClose={() => setShowDrawing(false)}
              timeOfDay={timeOfDay as 'day' | 'night'}
            />
          )}

          {
            showLifetimeView && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
                  zIndex: 99999, // Keep high z-index
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: 'max(env(safe-area-inset-top), 40px)',
                }}
              >
                <LifetimeView
                  onClose={() => {
                    setShowLifetimeView(false);
                    // Fetch fresh data when returning to main view
                    loadFromBackend();
                  }}
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
                  timeOfDay={timeOfDay as 'day' | 'night'}
                  isPro={isPro}
                  onShowPaywall={() => setShowPaywall(true)}
                />
              </motion.div>
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
                onComplete={() => {
                  if (timerModalTodoId) {
                    toggleTodo(timerModalTodoId);
                    setTimerModalTodoId(null);
                  }
                }}
              />
            )
          }

          {
            showOnboarding && (
              <OnboardingModal
                onClose={() => {
                  setShowOnboarding(false);
                  secureStorage.setItem('hasSeenOnboarding', true);
                }}
              />
            )
          }

          {/* Pro Paywall Modal */}
          <ProPaywall
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            onStartTrial={async (priceType) => {
              const url = await createCheckoutSession(priceType);
              if (url) {
                // Use in-app browser for better UX
                await Browser.open({ url });
              }
            }}
            onApplePurchase={applePurchase}
            onRestorePurchases={restorePurchases}
            timeOfDay={timeOfDay as 'day' | 'night'}
          />
          <Toaster position="top-center" />
        </>
      )}
    </div >
  );
}

export default function App() {
  const backend = isTouchDevice()
    ? TouchBackend
    : HTML5Backend;

  const backendOptions = isTouchDevice()
    ? { delay: 300, delayTouchStart: 300 }
    : {};

  return (
    <DndProvider backend={backend} options={backendOptions}>
      <AppContent />
    </DndProvider>
  );
}