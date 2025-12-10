import type { TodoItem, TodosByDate } from '../App';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import { useState } from 'react';
import { MeditationTimer } from './MeditationTimer';

interface MonthViewInlineProps {
  currentDate: Date;
  todos: TodosByDate;
  onSelectDate: (date: Date) => void;
  meditationDates: string[];
  onMonthChange: (direction: number) => void;
  onMeditationComplete?: () => void;
  onSettingsClick?: () => void;
  accessToken?: string | null;
  onAuthClick?: () => void;
}

export const MonthViewInline = ({ currentDate, todos, onSelectDate, meditationDates, onMonthChange, onMeditationComplete, onSettingsClick, accessToken, onAuthClick }: MonthViewInlineProps) => {
  const [showMeditation, setShowMeditation] = useState(false);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const today = new Date();
  const todayKey = getLocalDateString(today);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#E9EAE5',
      position: 'relative',
    }}>
      {/* Content Area with padding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '39px',
        paddingLeft: '39px',
        paddingRight: '39px',
      }}>
        {/* Title - mm */}
        <div style={{ marginBottom: '26px', alignSelf: 'flex-start' }}>
          <h2 style={{
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '15px',
            lineHeight: '19.5px',
            height: '19.5px',
            color: '#000000',
            margin: 0,
          }}>
            mm
          </h2>
        </div>

        {/* Month Header with Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          maxWidth: '322px',
          height: '19.5px',
          gap: '6.5px',
          marginBottom: '20px',
          alignSelf: 'flex-start',
        }}>
          <button
            onClick={() => onMonthChange(-1)}
            style={{
              width: '19.5px',
              height: '19.5px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <ChevronLeft style={{ height: '19.5px', width: '19.5px', color: 'black' }} />
          </button>

          <div style={{
            letterSpacing: '.05em',
            color: 'rgba(0,0,0,0.6)',
            fontFamily: 'Courier New, Courier, monospace',
            fontSize: '15px',
            lineHeight: '19.5px',
            height: '19.5px',
          }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>

          <button
            onClick={() => onMonthChange(1)}
            style={{
              width: '19.5px',
              height: '19.5px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <ChevronRight style={{ height: '19.5px', width: '19.5px', color: 'black' }} />
          </button>
        </div>

        {/* Days and Numbers Container */}
        <div style={{
          width: '361px',
          gap: '6.5px',
          paddingRight: '19.5px',
          paddingLeft: '19.5px',
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'center',
        }}>
          {/* Weekday Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            width: '100%',
            maxWidth: '322px',
            gap: '4px',
            marginBottom: '6.5px',
          }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} style={{
                width: '100%',
                height: '32.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                color: 'rgba(0,0,0,0.4)',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '12px',
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            width: '100%',
            maxWidth: '322px',
            gap: '4px',
          }}>
            {days.map((date, i) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${i}`}
                    style={{
                      aspectRatio: '1',
                      border: '1px solid transparent',
                    }}
                  />
                );
              }

              const dateKey = getLocalDateString(date);
              const dayTodos = todos[dateKey] || [];
              const completed = dayTodos.filter((t: TodoItem) => t.completed).length;
              const total = dayTodos.length;
              const isSelected = dateKey === getLocalDateString(currentDate);
              const isToday = dateKey === todayKey;
              const hasMeditation = meditationDates.includes(dateKey);

              return (
                <button
                  key={dateKey}
                  onClick={() => onSelectDate(date)}
                  style={{
                    aspectRatio: '1',
                    width: '100%',
                    padding: '4px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}>
                    <div style={{
                      width: 'auto',
                      minWidth: '16px',
                      height: '20px',
                      fontFamily: 'Courier New',
                      fontWeight: 700,
                      fontSize: '13px',
                      lineHeight: '19.5px',
                      letterSpacing: '0px',
                      textAlign: 'center',
                      color: isSelected ? '#BE8BAD' : (isToday ? '#be8bad' : 'rgba(0, 0, 0, 0.8)'),
                    }}>
                      {date.getDate()}
                    </div>
                    {total > 0 && (
                      <div style={{ width: '12px', height: '2px', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                        <div
                          style={{ height: '100%', backgroundColor: hasMeditation ? '#a7f3d0' : 'rgba(0, 0, 0, 0.4)', width: `${(completed / total) * 100}%` }}
                        />
                      </div>
                    )}
                    {hasMeditation && total === 0 && (
                      <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#a7f3d0' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer Container - Outside content wrapper for full-width separator */}
      <div style={{
        width: '100%',
        height: '79px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '39px',
        paddingLeft: '39px',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box',
      }}>
        {/* Settings Button (logged in) or Sign In Button (not logged in) */}
        {accessToken ? (
          <button
            onClick={onSettingsClick}
            style={{
              width: '26px',
              height: '26px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        ) : (
          <button
            onClick={onAuthClick}
            style={{
              height: '37.5px',
              paddingLeft: '30px',
              paddingRight: '30px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '15px',
              color: '#000000',
            }}
          >
            Sign In
          </button>
        )}

        {/* Meditation Button */}
        <button
          onClick={() => setShowMeditation(true)}
          style={{
            width: '26px',
            height: '26px',
            backgroundColor: '#FFFFFF',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        />
      </div>

      {/* Meditation Overlay */}
      {showMeditation && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 100,
        }}>
          <MeditationTimer
            durationMinutes={5}
            onComplete={() => {
              setShowMeditation(false);
              onMeditationComplete?.();
            }}
            onClose={() => setShowMeditation(false)}
          />
        </div>
      )}
    </div>
  );
};
