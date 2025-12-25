import { TodoItem, TodosByDate } from '../App';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

interface MonthViewProps {
  currentDate: Date;
  todos: TodosByDate;
  onSelectDate: (date: Date) => void;
  meditationDates: string[];
  onMonthChange: (direction: number) => void;
  onClose: () => void;
  timeOfDay?: 'day' | 'night';
}

export const MonthView = ({ currentDate, todos, onSelectDate, meditationDates, onMonthChange, onClose, timeOfDay = 'day' }: MonthViewProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create array of all days including padding
  const days: (Date | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const today = new Date();
  const todayKey = getLocalDateString(today);

  return (
    <div style={{
      width: '329.9981689453125px',
      height: '378.729248046875px',
      paddingTop: '22.5px',
      paddingRight: '22.5px',
      paddingLeft: '22.5px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: timeOfDay === 'night' ? '#1D1C1C' : '#ECE8D6',
      margin: '0 auto',
    }}>
      {/* Container 1: Month Header with Navigation */}
      <div style={{ width: '285.00146484375px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <button
          onClick={() => onMonthChange(-1)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            borderRadius: '50%',
            appearance: 'none',
          }}
        >
          <ChevronLeft style={{ height: '16px', width: '16px', color: timeOfDay === 'night' ? '#FBF8E8' : 'black' }} />
        </button>

        <div style={{ textAlign: 'center', letterSpacing: '.05em', color: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.6)' : 'rgba(0,0,0,0.6)', fontFamily: 'Courier New, Courier, monospace' }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onMonthChange(1)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              borderRadius: '50%',
              appearance: 'none',
            }}
          >
            <ChevronRight style={{ height: '16px', width: '16px', color: timeOfDay === 'night' ? '#FBF8E8' : 'black' }} />
          </button>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              borderRadius: '50%',
              appearance: 'none',
            }}
          >
            <X style={{ height: '16px', width: '16px', color: timeOfDay === 'night' ? '#FBF8E8' : 'black' }} />
          </button>
        </div>
      </div>

      {/* Container 2: Weekday Headers - 15px gap from container 1 */}
      <div style={{
        marginTop: '15px',
        width: '285.00146484375px',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        justifyItems: 'center',
      }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.05em', color: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.4)' : 'rgba(0,0,0,0.4)', fontFamily: 'Courier New, Courier, monospace', padding: '8px' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Container 3: Calendar Grid - 15px gap from container 2, specific dimensions */}
      <div style={{
        marginTop: '15px',
        width: '285.00146484375px',
        height: '243.7726287841797px',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        placeItems: 'center',
      }}>
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} style={{ width: '32px', height: '32px', aspectRatio: '1' }} />;
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
              onClick={() => {
                onSelectDate(date);
              }}
              style={{
                aspectRatio: '1',
                padding: '4px',
                position: 'relative',
                borderRadius: '4px',
                backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ color: isSelected ? '#BE8BAD' : (isToday ? '#be8bad' : (timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.8)' : 'rgba(0, 0, 0, 0.8)')) }}>
                  {date.getDate()}
                </div>
                {total > 0 && (
                  <div style={{ marginTop: '2px', width: '16px', height: '2px', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <div
                      style={{ height: '100%', backgroundColor: hasMeditation ? '#a7f3d0' : 'rgba(0, 0, 0, 0.4)', width: `${(completed / total) * 100}%` }}
                    />
                  </div>
                )}
                {hasMeditation && total === 0 && (
                  <div style={{ marginTop: '2px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#a7f3d0' }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};