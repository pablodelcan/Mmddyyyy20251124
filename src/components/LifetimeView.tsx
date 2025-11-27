import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { X, ChevronDown, ChevronUp, Plus, Minus, Square, CheckSquare, List } from 'lucide-react';

interface LifetimeViewProps {
  onClose: () => void;
  dateOfBirth: string | null;
  onSaveDateOfBirth: (date: string) => void;
  expectedLifespan: number;
  onSaveLifespan: (years: number) => void;
  weekNotes: { [weekIndex: number]: string };
  onSaveWeekNote: (weekIndex: number, note: string) => void;
  bucketList: { id: string; text: string; completed: boolean }[];
  onSaveBucketList: (list: { id: string; text: string; completed: boolean }[]) => void;
  totalMeditationMinutes: number;
}

export const LifetimeView = ({ onClose, dateOfBirth, onSaveDateOfBirth, expectedLifespan, onSaveLifespan, weekNotes, onSaveWeekNote, bucketList, onSaveBucketList, totalMeditationMinutes }: LifetimeViewProps) => {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [searchDate, setSearchDate] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false); // Changed to false
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showBucketList, setShowBucketList] = useState(false);
  const [newBucketItem, setNewBucketItem] = useState('');
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editingBucketText, setEditingBucketText] = useState('');

  // Check if user has seen the onboarding
  /*
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('lifetimeViewOnboarding');
    if (!hasSeenOnboarding && dateOfBirth) {
      setShowOnboarding(true);
    }
  }, [dateOfBirth]);
  */
  const handleDismissOnboarding = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('lifetimeViewOnboarding', 'seen');
    }
    setShowOnboarding(false);
  };

  // Calculate age and remaining weeks based on expected lifespan
  const calculateLifetimeStats = () => {
    if (!dateOfBirth) return null;

    const birth = new Date(dateOfBirth);
    const today = new Date();
    const averageLifespan = expectedLifespan;
    const weeksInYear = 52;
    const totalWeeks = averageLifespan * weeksInYear;

    // Calculate weeks lived
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksLived = Math.floor((today.getTime() - birth.getTime()) / msPerWeek);

    // Calculate age in years, months, days
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const weeksRemaining = Math.max(0, totalWeeks - weeksLived);
    const yearsRemaining = Math.max(0, averageLifespan - years);
    const monthsRemaining = Math.max(0, yearsRemaining * 12 - months);

    return {
      weeksLived,
      weeksRemaining,
      totalWeeks,
      years,
      months,
      days,
      yearsRemaining,
      monthsRemaining,
      percentageLived: Math.min(100, (weeksLived / totalWeeks) * 100)
    };
  };

  const stats = calculateLifetimeStats();

  // Calculate stats for a specific week
  const getWeekStats = (weekIndex: number) => {
    if (!dateOfBirth || !stats) return null;

    const birth = new Date(dateOfBirth);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    // Calculate the date for this week
    const weekDate = new Date(birth.getTime() + (weekIndex * msPerWeek));

    // Calculate age at this week
    const daysLived = weekIndex * 7;
    const yearsAtWeek = Math.floor(daysLived / 365.25);
    const monthsAtWeek = Math.floor((daysLived % 365.25) / 30.44);

    // Calculate percentage
    const percentageAtWeek = Math.min(100, (weekIndex / stats.totalWeeks) * 100);

    return {
      date: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      age: `${yearsAtWeek} years, ${monthsAtWeek} months`,
      daysLived,
      percentage: percentageAtWeek.toFixed(2)
    };
  };

  // Convert a date to week index
  const dateToWeekIndex = (targetDate: string) => {
    if (!dateOfBirth) return null;

    const birth = new Date(dateOfBirth);
    const target = new Date(targetDate);

    if (isNaN(target.getTime())) return null;

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor((target.getTime() - birth.getTime()) / msPerWeek);

    if (weekIndex < 0 || (stats && weekIndex >= stats.totalWeeks)) return null;

    return weekIndex;
  };

  // Handle date search
  const handleDateSearch = () => {
    const weekIndex = dateToWeekIndex(searchDate);
    if (weekIndex !== null) {
      setSelectedWeek(weekIndex);
      setPopupPosition(null); // Clear popup position when using search
      // Scroll to the week
      const weekElement = document.getElementById(`week-${weekIndex}`);
      if (weekElement) {
        weekElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle week click
  const handleWeekClick = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSelectedWeek(index);

    // Calculate popup position
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Position popup to the right of the square, or left if too close to right edge
    const popupWidth = 340; // Updated width with padding
    const popupHeight = 450; // Updated height estimate
    const padding = 20; // Padding from screen edges

    let left = rect.right + scrollX + 10;
    let top = rect.top + scrollY;

    // Ensure popup doesn't go off the right edge
    if (left + popupWidth > window.innerWidth + scrollX - padding) {
      left = rect.left + scrollX - popupWidth - 10;
    }

    // Ensure popup doesn't go off the left edge
    if (left < scrollX + padding) {
      left = scrollX + padding;
    }

    // Ensure popup doesn't go off the bottom edge
    if (top + popupHeight > window.innerHeight + scrollY - padding) {
      top = window.innerHeight + scrollY - popupHeight - padding;
    }

    // Ensure popup doesn't go off the top edge
    if (top < scrollY + padding) {
      top = scrollY + padding;
    }

    // Final bounds check
    const maxLeft = window.innerWidth + scrollX - popupWidth - padding;
    const maxTop = window.innerHeight + scrollY - popupHeight - padding;

    left = Math.max(scrollX + padding, Math.min(left, maxLeft));
    top = Math.max(scrollY + padding, Math.min(top, maxTop));

    setPopupPosition({ top, left });
  };

  // Bucket list handlers
  const addBucketItem = () => {
    if (newBucketItem.trim()) {
      const newItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: newBucketItem.trim(),
        completed: false
      };
      onSaveBucketList([...bucketList, newItem]);
      setNewBucketItem('');
    }
  };

  const toggleBucketItem = (id: string) => {
    onSaveBucketList(bucketList.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteBucketItem = (id: string) => {
    onSaveBucketList(bucketList.filter(item => item.id !== id));
  };

  const startEditBucket = (item: { id: string; text: string; completed: boolean }) => {
    setEditingBucketId(item.id);
    setEditingBucketText(item.text);
  };

  const saveBucketEdit = () => {
    if (editingBucketId && editingBucketText.trim()) {
      onSaveBucketList(bucketList.map(item =>
        item.id === editingBucketId ? { ...item, text: editingBucketText.trim() } : item
      ));
    }
    setEditingBucketId(null);
    setEditingBucketText('');
  };

  // If showing bucket list, render that view instead
  if (showBucketList) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{
          background: '#FDF5ED',
          paddingTop: 'max(env(safe-area-inset-top), 40px)',
          width: '100%',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            width: '393.3318176269531px',
            height: '75.5248031616211px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 1,
            borderBottom: '0.54px solid rgba(0, 0, 0, 0.1)',
            boxSizing: 'border-box',
            flexShrink: 0,
            margin: '0 auto',
            paddingLeft: '22.5px',
            paddingRight: '22.5px',
          }}
        >
          <h2
            style={{
              width: '145px',
              height: '23px',
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '15px',
              lineHeight: '22.5px',
              letterSpacing: '0px',
              color: '#000000',
              margin: '0',
            }}
          >
            Life bucket list
          </h2>
          <Button
            onClick={() => setShowBucketList(false)}
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
          </Button>
        </div>

        {/* Scrollable Content */}
        <div
          className="overflow-y-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: '0',
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
          <div
            style={{
              width: '393.3318176269531px',
              margin: '0 auto',
              paddingBottom: 'calc(30px + env(safe-area-inset-bottom) + 7.49px + 33.743343353271484px + 20px)',
              boxSizing: 'border-box',
            }}
          >
            {bucketList.length === 0 && (
              <p
                style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.5px',
                  letterSpacing: '0px',
                  color: '#000000',
                  opacity: 0.9,
                  margin: '0',
                  padding: '22.5px',
                }}
              >
                Things you want to accomplish in your lifetime
              </p>
            )}

            {/* Bucket List Items */}
            <div /* Removed space-y-1 */>
              {bucketList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: '348.3351135253906px',
                    height: '48.73945236206055px',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7.5px',
                    background: 'transparent',
                    paddingLeft: '22.5px',
                    paddingRight: '22.5px',
                    paddingTop: '11.25px',
                    paddingBottom: '11.25px',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    // Removed group flex items-start gap-3 py-3 px-3 hover:bg-black/5 transition-colors
                  }}
                >
                  <button
                    onClick={() => toggleBucketItem(item.id)}
                    style={{
                      width: '18.74723243713379px',
                      height: '18.74723243713379px',
                      opacity: 1,
                      border: '0.54px solid #000000',
                      background: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '0',
                      flexShrink: 0,
                      // Removed flex-shrink-0 mt-0.5
                    }}
                  >
                    {item.completed ? (
                      <CheckSquare style={{ width: '18.74723243713379px', height: '18.74723243713379px', color: '#000000' }} />
                    ) : (
                      <Square style={{ width: '18.74723243713379px', height: '18.74723243713379px', color: '#000000' }} />
                    )}
                  </button>

                  {editingBucketId === item.id ? (
                    <input
                      value={editingBucketText}
                      onChange={(e) => setEditingBucketText(e.target.value)}
                      onBlur={saveBucketEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveBucketEdit();
                        if (e.key === 'Escape') {
                          setEditingBucketId(null);
                          setEditingBucketText('');
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '0.54px solid rgba(0,0,0,0.2)',
                        outline: 'none',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        lineHeight: '22.5px',
                        letterSpacing: '0px',
                        color: '#000000',
                        padding: '0',
                      }}
                      // className="flex-1 bg-transparent border-0 border-b border-black/20 focus:border-black outline-none transition-colors px-0 py-0"
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => startEditBucket(item)}
                      style={{
                        flex: 1,
                        cursor: 'text',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        lineHeight: '22.5px',
                        letterSpacing: '0px',
                        color: '#000000',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        opacity: item.completed ? 0.6 : 1,
                      }}
                    // className={`flex-1 cursor-text ${
                    //   item.completed ? 'line-through' : ''
                    // }`}
                    >
                      {item.text}
                    </div>
                  )}

                  <Button
                    onClick={() => deleteBucketItem(item.id)}
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
                      opacity: 1, // Always visible for mobile
                      flexShrink: 0,
                    }}
                  >
                    <Minus style={{ width: '14.996110916137695px', height: '14.996110916137695px', color: '#000000' }} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add New Item - Fixed to bottom with background */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            paddingBottom: 'calc(30px + env(safe-area-inset-bottom) + 7.49px)',
            paddingTop: '20px',
            zIndex: 50,
            background: '#FDF5ED',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '393.3318176269531px',
              height: '33.743343353271484px',
              display: 'flex',
              gap: '7.5px',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '22.5px',
              paddingRight: '22.5px',
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
          <div
            style={{
              width: '348.3351135253906px',
              height: '33.743343353271484px',
              display: 'flex',
              gap: '7.5px',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
          <input
            value={newBucketItem}
            onChange={(e) => setNewBucketItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBucketItem()}
            placeholder="Add Bucket"
            style={{
              flex: 1,
              height: '33.743343353271484px',
              background: 'transparent',
              border: 'none',
              borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
              paddingTop: '3.75px',
              paddingBottom: '3.75px',
              paddingLeft: '0px',
              paddingRight: '0px',
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '15px',
              lineHeight: '100%',
              letterSpacing: '0px',
              color: '#000000',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={addBucketItem}
            disabled={!newBucketItem.trim()}
            style={{
              width: '33.743343353271484px',
              height: '33.743343353271484px',
              background: 'transparent',
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '0',
              border: 'none',
              flexShrink: 0,
            }}
          >
            <Plus style={{ width: '14.996110916137695px', height: '14.996110916137695px', color: '#000000' }} />
          </button>
          </div>
          </div>
        </div>
      </motion.div>
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
        boxSizing: 'border-box',
        flexShrink: 0, /* Ensure header does not shrink */
      }}>
        <h2 style={{
          height: '23px',
          fontFamily: 'Courier New',
          fontWeight: 700,
          fontSize: '15px',
          lineHeight: '22.5px',
          letterSpacing: '0px',
          color: '#000000',
        }}>
          Your life in weeks
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
        <div>
          {dateOfBirth && stats ? (
            <>
              {/* Onboarding Popup */}
              <AnimatePresence>
                {showOnboarding && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" /* Reverted className */
                    onClick={() => handleDismissOnboarding(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-full max-w-md bg-[#fdf5ed] border border-black/10 p-6" /* Reverted className */
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="mb-4">How to use Life in Weeks</h3>
                      <div className="text-black/90 mb-6">
                        <p>
                          Each square represents one week of your life. Click any square to view details and add notes. Pink squares mark weeks with saved notes, and you can adjust your expected lifespan in Settings.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={() => handleDismissOnboarding(true)}
                          className="w-full bg-black text-white hover:bg-black/90 rounded-none"
                        >
                          Don't show again
                        </Button>
                        <Button
                          onClick={() => handleDismissOnboarding(false)}
                          variant="outline"
                          className="w-full border-black/20 hover:bg-black/5 rounded-none"
                        >
                          Got it
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Weeks Grid */}
              <div className="relative" style={{
                opacity: 1,
                position: 'relative',
                margin: '0', // Ensure no margin
                padding: '0', // Ensure no padding
              }}>
                <div className="grid" style={{
                  gridTemplateColumns: `repeat(52, 5.007076740264893px)`,
                  gap: '0px', // Ensure no gap
                  rowGap: '0px', // Ensure no row gap
                  columnGap: '0px', // Ensure no column gap
                  margin: '0', // Ensure no margin
                  padding: '0', // Ensure no padding
                }}>
                  {Array.from({ length: stats.totalWeeks }).map((_, index) => {
                    const isLived = index < stats.weeksLived;
                    const isCurrent = index === stats.weeksLived;
                    const isSelected = selectedWeek === index;
                    const hasNote = weekNotes[index] && weekNotes[index].trim().length > 0;

                    let backgroundColor = 'rgba(0, 0, 0, 0.1)'; // Empty boxes - #000000 10% opacity
                    if (isLived) {
                      backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Already filled - #000000 80% opacity
                    }
                    if (hasNote) {
                      backgroundColor = '#be8bad'; // Has note (keep pink)
                    }
                    if (isCurrent) {
                      backgroundColor = '#D84341'; // Current week (also red)
                    }
                    if (isSelected) {
                      backgroundColor = '#D84341'; // Selected boxes (also red)
                    }

                    return (
                      <motion.button
                        key={index}
                        id={`week-${index}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: Math.min(index * 0.001, 2),
                          duration: 0.2
                        }}
                        onClick={(e) => handleWeekClick(index, e)}
                        onMouseEnter={() => setHoveredWeek(index)}
                        onMouseLeave={() => setHoveredWeek(null)}
                        style={{
                          width: '5.007076740264893px',
                          height: '5.007076740264893px',
                          opacity: 1,
                          backgroundColor: backgroundColor,
                          border: 'none', // Removed temporary blue border
                          padding: '0',
                          margin: '0',
                          flexShrink: 0,
                        }}
                        title={`Week ${index + 1}${isCurrent ? ' (This week)' : ''}${hasNote ? ' - Has note' : ''}`}
                      >
                      </motion.button>
                    );
                  })}
                </div>

                {/* Floating Popup for Selected Week */}
                <AnimatePresence>
                  {selectedWeek !== null && popupPosition && (() => {
                    const weekStats = getWeekStats(selectedWeek);
                    const currentNote = weekNotes[selectedWeek] || '';
                    return weekStats ? (
                      <motion.div
                        drag
                        dragMomentum={false}
                        dragElastic={0}
                        dragConstraints={{
                          top: 0,
                          left: 0,
                          right: window.innerWidth - 340,
                          bottom: window.innerHeight - 450
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[60] w-80 cursor-move"
                        style={{
                          top: popupPosition.top,
                          left: popupPosition.left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="bg-[#fdf5ed] border-2 border-[#be8bad] shadow-lg p-4">
                          <div className="flex justify-between items-start mb-3 cursor-move">
                            <h4 className="select-none">Week {selectedWeek + 1}</h4>
                            <button
                              onClick={() => {
                                setSelectedWeek(null);
                                setPopupPosition(null);
                              }}
                              className="text-black/60 hover:text-black cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3 cursor-move select-none">
                            <div>
                              <div className="text-black/60">Date</div>
                              <div>{weekStats.date}</div>
                            </div>
                            <div>
                              <div className="text-black/60">Age</div>
                              <div>{weekStats.age}</div>
                            </div>
                            <div>
                              <div className="text-black/60">Days lived</div>
                              <div>{weekStats.daysLived.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-black/60">Percentage</div>
                              <div>{weekStats.percentage}%</div>
                            </div>
                          </div>

                          {/* Note Input */}
                          <div className="border-t border-black/10 pt-3">
                            <label className="text-black/60 block mb-2 cursor-move select-none">
                              Note for this week
                            </label>
                            <textarea
                              value={currentNote}
                              onChange={(e) => onSaveWeekNote(selectedWeek, e.target.value)}
                              placeholder="Add a memory or important moment..."
                              className="w-full bg-transparent border border-black/20 focus:border-[#be8bad] outline-none transition-colors px-2 py-2 resize-none cursor-text"
                              rows={3}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : null;
                  })()}
                </AnimatePresence>
              </div>

              {/* Find Week Section */}
              <div
                style={{
                  width: '100%',
                  opacity: 1,
                  marginTop: '22.5px', // 22.5px below the grid container
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                }}
              >
                <h3 style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '22.5px',
                  letterSpacing: '0px',
                  color: '#000000',
                  margin: '0', // Remove default margin
                }}>
                  Find week
                </h3>
                <p
                  style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: 'rgba(0, 0, 0, 0.9)',
                    margin: '0', // Remove default margin
                    marginTop: '7.17px', // 7.17px below the Find week text
                  }}
                >
                  Enter a date to locate the corresponding week
                </p>
                <div style={{ display: 'flex', gap: '7.49px', alignItems: 'center', marginTop: 'auto' }}>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDateSearch();
                      }
                    }}
                    style={{
                      flex: '1',
                      height: '38.54946517944336px',
                      border: '0.54px solid rgba(0, 0, 0, 0.2)',
                      background: 'transparent',
                      padding: '0',
                      fontFamily: 'Courier New',
                      fontWeight: 700,
                      fontSize: '15px',
                      lineHeight: '100%',
                      letterSpacing: '0px',
                      color: '#000000',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                    className="outline-none transition-colors"
                  />
                  <Button
                    onClick={handleDateSearch}
                    disabled={!searchDate}
                    style={{
                      height: '38.54946517944336px',
                      opacity: 0.5,
                      gap: '7.5px',
                      paddingTop: '7.5px',
                      paddingRight: '15px',
                      paddingBottom: '7.5px',
                      paddingLeft: '15px',
                      background: '#000000',
                      color: '#FFFFFF',
                      borderRadius: '0',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontFamily: 'Courier New',
                      fontWeight: 400,
                      fontSize: '13.13px',
                      lineHeight: '18.75px',
                      letterSpacing: '0px',
                      textAlign: 'center',
                    }}
                  >
                    Find week
                  </Button>
                </div>
              </div>

              {/* Collapsible More Information */}
              <div
                style={{
                  marginTop: '30px',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <button
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                  className="flex items-center gap-2 text-black/60 hover:text-black transition-colors"
                  style={{
                    opacity: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    textAlign: 'center',
                    color: 'rgba(0, 0, 0, 0.6)', // 60% opacity for text and arrow
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '7.49px', // Added gap
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '0', // Ensure no default padding
                  }}
                >
                  {showMoreInfo ? (
                    <>
                      <ChevronUp style={{ width: '14.996110916137695px', height: '14.996110916137695px', color: 'rgba(0, 0, 0, 0.6)' }} />
                      <span>Hide more information</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown style={{ width: '14.996110916137695px', height: '14.996110916137695px', color: 'rgba(0, 0, 0, 0.6)' }} />
                      <span>Show more information</span>
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showMoreInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-black/90">
                      <div className="border border-black/10 p-6">
                        <div className="mb-2">
                          Time lived
                        </div>
                        <div className="mb-1">{stats.years}</div>
                        <div>
                          years, {stats.months} months, {stats.days} days
                        </div>
                        <div className="mt-2">
                          {stats.weeksLived.toLocaleString()} weeks
                        </div>
                      </div>

                      <div className="border border-black/10 p-6">
                        <div className="mb-2">
                          Percentage lived
                        </div>
                        <div className="mb-1">
                          {stats.percentageLived.toFixed(1)}%
                        </div>
                        <div>of {expectedLifespan} years</div>
                      </div>

                      <div className="border border-black/10 p-6">
                        <div className="mb-2">
                          Time remaining
                        </div>
                        <div className="mb-1">{stats.yearsRemaining}</div>
                        <div>
                          years ({stats.monthsRemaining} months)
                        </div>
                        <div className="mt-2">
                          {stats.weeksRemaining.toLocaleString()} weeks
                        </div>
                      </div>

                      <div className="border border-black/10 p-6">
                        <div className="mb-2">
                          Total meditation
                        </div>
                        <div className="mb-1">{totalMeditationMinutes.toLocaleString()}</div>
                        <div>
                          minutes
                        </div>
                        <div className="mt-2">
                          {(totalMeditationMinutes / 60).toFixed(1)} hours
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-6 justify-center mb-8 text-black/90">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-black/80" />
                        <span>Weeks lived</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#D84341]" />
                        <span>Current week</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-black/80" />
                        <span>Weeks remaining</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#be8bad]" />
                        <span>Has note</span>
                      </div>
                    </div>

                    <div className="text-black/90">
                      <p className="text-left">
                        Each row represents one year of your life. This visualization is inspired by Tim Urban's
                        "Your life in weeks" and serves as a reminder to make the most of every week.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bucket List Button */}
              <div
                style={{
                  opacity: 1,
                  borderTop: '0.54px solid rgba(0, 0, 0, 0.1)',
                  marginTop: '40px', // Increased to 40px to push it down further
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Removed width and margin: '0 auto'
                  padding: '0',
                }}
              >
                <Button
                  onClick={() => setShowBucketList(true)}
                  style={{
                    width: '100%', // Full width
                    opacity: 1,
                    border: '0.54px solid rgba(0, 0, 0, 0.1)',
                    background: '#F5D5D8',
                    color: '#000000',
                    borderRadius: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    paddingTop: '7.5px',
                    paddingRight: '15px',
                    paddingBottom: '7.5px',
                    paddingLeft: '15px',
                  }}
                >
                  Bucket list
                </Button>
              </div>
              {/* Invisible Spacer */}
              <div
                style={{
                  height: '50px', // Adjustable height to push content up
                  background: '#FDF5ED',
                  opacity: 0,
                  marginTop: '20px', // Space from the button above
                  width: '100%',
                }}
              ></div>
            </>
          ) : (
            <div className="flex flex-1 flex-col p-4" style={{ marginTop: '25px', paddingLeft: '22.5px', paddingRight: '22.5px' }}>
              <div className="w-full max-w-md bg-[#fdf5ed] border border-black/10 p-6 rounded-lg"
                style={{ textAlign: 'left' }}
              >
                <p className="mb-4"
                  style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                  }}
                >
                  Please set your date of birth in Settings to view your life in weeks
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};