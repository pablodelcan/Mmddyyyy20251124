import { TodoItem, TodosByDate } from '../App';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';

interface MonthViewProps {
  currentDate: Date;
  todos: TodosByDate;
  onSelectDate: (date: Date) => void;
  meditationDates: string[];
  onMonthChange: (direction: number) => void;
  onClose: () => void;
}

export const MonthView = ({ currentDate, todos, onSelectDate, meditationDates, onMonthChange, onClose }: MonthViewProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Create array of all days including padding
  const days = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="p-6">
      {/* Month Header with Navigation */}
      <div className="flex items-center justify-between mb-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(-1)}
          className="h-8 w-8 hover:bg-black/5 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center uppercase tracking-wider text-black/60 font-mono-label">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(1)}
            className="h-8 w-8 hover:bg-black/5 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-black/5 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center uppercase tracking-wider text-black/40 font-mono-label p-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTodos = todos[dateKey] || [];
          const completed = dayTodos.filter((t: TodoItem) => t.completed).length;
          const total = dayTodos.length;
          const isSelected = dateKey === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const isToday = dateKey === todayKey;
          const hasMeditation = meditationDates.includes(dateKey);
          
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(date)}
              className={`aspect-square p-1 hover:bg-black/5 transition-colors relative ${
                isSelected ? 'bg-black/10' : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className={`${isToday ? 'text-[#be8bad]' : 'text-black/80'}`}>
                  {date.getDate()}
                </div>
                {total > 0 && (
                  <div className="mt-0.5 w-4 h-0.5 bg-black/10">
                    <div 
                      className={`h-full ${hasMeditation ? 'bg-[#a7f3d0]' : 'bg-black/40'}`}
                      style={{ width: `${(completed / total) * 100}%` }}
                    />
                  </div>
                )}
                {hasMeditation && total === 0 && (
                  <div className="mt-0.5 w-1 h-1 rounded-full bg-[#a7f3d0]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};