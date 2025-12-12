import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronLeft, ChevronRight, Plus, Clock, ArrowUp, Minus, X, Settings, Grid3X3, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useDrag, useDrop } from 'react-dnd';
import { MonthViewInline } from './MonthViewInline';
import { LifetimeViewInline } from './LifetimeViewInline';
import { ScrollingTaskText } from './ScrollingTaskText';
import { getLocalDateString } from '../utils/dateUtils';
import type { TodoItem, TodosState } from '../App';

interface WebLayoutProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  todos: TodosState;
  setTodos: React.Dispatch<React.SetStateAction<TodosState>>;
  newTodo: string;
  setNewTodo: (text: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editText: string;
  setEditText: (text: string) => void;
  dateKey: string;
  currentTodos: TodoItem[];
  sortedTodos: TodoItem[];
  meditationDates: string[];
  dateOfBirth: string | null;
  expectedLifespan: number;
  weekNotes: { [weekIndex: number]: string };
  setWeekNotes: React.Dispatch<React.SetStateAction<{ [weekIndex: number]: string }>>;
  bucketList: { id: string; text: string; completed: boolean }[];
  setBucketList: React.Dispatch<React.SetStateAction<{ id: string; text: string; completed: boolean }[]>>;
  totalMeditationMinutes: number;
  meditationGlowActive: boolean;
  currentTime: number;
  timerModalTodoId: string | null;
  setTimerModalTodoId: (id: string | null) => void;
  accessToken: string | null;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  onToggle: (id: string) => void;
  onStartEdit: (todo: TodoItem) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
  onPriorityToggle: (id: string) => void;
  onTimerClick: (id: string) => void;
  getTimeRemaining: (timerEnd: number | undefined) => string | undefined;
  setTaskTimer: (id: string, minutes: number) => void;
  clearTaskTimer: (id: string) => void;
  addTodo: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  onMonthChange: (direction: number) => void;
  onSelectDate: (date: Date) => void;
  onSaveWeekNote: (weekIndex: number, note: string) => void;
  timeOfDay: 'day' | 'night';
  showBucketList: boolean;
  setShowBucketList: (show: boolean) => void;
  undoStack: any[];
  onUndo: () => void;
}

const ITEM_TYPE = 'TODO';

interface DragItem {
  id: string;
  index: number;
  dateKey: string;
}

export const WebLayout = ({
  currentDate,
  setCurrentDate,
  todos,
  setTodos,
  newTodo,
  setNewTodo,
  editingId,
  setEditingId,
  editText,
  setEditText,
  dateKey,
  currentTodos,
  sortedTodos,
  meditationDates,
  dateOfBirth,
  expectedLifespan,
  weekNotes,
  setWeekNotes,
  bucketList,
  setBucketList,
  totalMeditationMinutes,
  meditationGlowActive,
  currentTime,
  timerModalTodoId,
  setTimerModalTodoId,
  accessToken,
  showSettings,
  setShowSettings,
  showAuth,
  setShowAuth,
  onToggle,
  onStartEdit,
  onSave,
  onKeyDown,
  onMove,
  onDelete,
  onPriorityToggle,
  onTimerClick,
  getTimeRemaining,
  setTaskTimer,
  clearTaskTimer,
  addTodo,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  onMonthChange,
  onSelectDate,
  onSaveWeekNote,
  timeOfDay,
  showBucketList,
  setShowBucketList,
  undoStack,
  onUndo,
}: WebLayoutProps) => {
  const [lifetimeViewWidth, setLifetimeViewWidth] = useState(400);
  const lifetimeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (lifetimeRef.current) {
        setLifetimeViewWidth(lifetimeRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isToday = dateKey === getLocalDateString(new Date());

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: timeOfDay === 'night' ? '#1a1a1a' : '#E9EAE5',
        color: timeOfDay === 'night' ? '#fdf5ed' : '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Left Column - Calendar */}
      <div style={{
        flex: '1 1 0',
        minWidth: '320px',
        borderRight: '0.54px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#E9EAE5',
      }}>
        <MonthViewInline
          currentDate={currentDate}
          todos={todos}
          onSelectDate={onSelectDate}
          meditationDates={meditationDates}
          onMonthChange={onMonthChange}
          onSettingsClick={() => setShowSettings(true)}
          accessToken={accessToken}
          onAuthClick={() => setShowAuth(true)}
        />
      </div>

      {/* Middle Column - Daily Tasks */}
      <div style={{
        flex: '1 1 0',
        minWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '0.54px solid rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FBF8E8',
        alignItems: 'center',
      }}>
        {/* Header Section */}
        <div style={{
          padding: '39px',
          paddingBottom: '0',
          width: '100%',
          maxWidth: '457px',
        }}>
          {/* dd Title */}
          <h2 style={{
            maxWidth: '379px',
            height: '19.5px',
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '15px',
            lineHeight: '19.5px',
            color: '#000000',
            margin: 0,
            marginBottom: '26px',
          }}>
            dd
          </h2>

          {/* Date Navigation Container */}
          <div style={{
            width: '100%',
            maxWidth: '379px',
            height: '19.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6.5px',
          }}>
            <button
              onClick={goToPreviousDay}
              style={{
                width: '19.5px',
                height: '19.5px',
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
              <ChevronLeft style={{ width: '19.5px', height: '19.5px', color: '#000000' }} />
            </button>

            <span style={{
              fontSize: '15px',
              fontWeight: 700,
              lineHeight: '19.5px',
              fontFamily: 'Courier New',
            }}>
              <span style={{ color: '#D84341' }}>
                {currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()}.
              </span>{' '}
              {isToday && (
                <span
                  style={{
                    width: '9.75px',
                    height: '9.75px',
                    borderRadius: '50%',
                    backgroundColor: '#D84341',
                    marginLeft: '6.5px',
                    marginRight: '6.5px',
                    display: 'inline-block',
                  }}
                />
              )}
              {(currentDate.getMonth() + 1).toString().padStart(2, '0')}/{currentDate.getDate().toString().padStart(2, '0')}/{currentDate.getFullYear()}
            </span>

            <button
              onClick={goToNextDay}
              style={{
                width: '19.5px',
                height: '19.5px',
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
              <ChevronRight style={{ width: '19.5px', height: '19.5px', color: '#000000' }} />
            </button>

            {!isToday && (
              <button
                onClick={goToToday}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontFamily: 'Courier New',
                  fontWeight: 400,
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '6.5px',
                }}
              >
                Today
              </button>
            )}

            {/* Undo Button */}
            {undoStack.length > 0 && (
              <button
                onClick={onUndo}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  marginLeft: 'auto',
                  width: '19.5px',
                  height: '19.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <img
                  src="/undo.svg"
                  alt="Undo"
                  style={{
                    width: '13px',
                    height: '13px',
                  }}
                />
              </button>
            )}
          </div>
        </div>

        {/* Tasks List Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '39px',
          paddingLeft: '39px',
          paddingTop: '13px',
          gap: '3.25px',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '457px',
          alignSelf: 'center',
        }}>
          {sortedTodos.length === 0 && (
            <div style={{
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '15px',
              lineHeight: '19.5px',
              color: 'rgba(0, 0, 0, 0.4)',
              paddingTop: '13px',
            }}>
              No tasks for this day
            </div>
          )}
          {sortedTodos.map((todo, index) => (
            <div
              key={todo.id}
              className="task-item"
              style={{
                width: '100%',
                maxWidth: '500px',
                height: '26px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Mark Dot */}
              <div
                style={{
                  width: '9.75px',
                  height: '9.75px',
                  borderRadius: '50%',
                  backgroundColor: '#707070',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                onClick={() => onToggle(todo.id)}
              >
                {todo.completed && (
                  <X style={{ color: '#FFFFFF', width: '6px', height: '6px' }} strokeWidth={3} />
                )}
              </div>

              {editingId === todo.id ? (
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={onSave}
                  onKeyDown={onKeyDown}
                  style={{
                    flex: 1,
                    height: '19.5px',
                    marginLeft: '9.75px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '0.54px solid rgba(0, 0, 0, 0.2)',
                    outline: 'none',
                    color: '#000000',
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '19.5px',
                    padding: 0,
                  }}
                />
              ) : (
                <ScrollingTaskText
                  text={todo.text}
                  timeRemaining={getTimeRemaining(todo.timerEnd)}
                  completed={todo.completed}
                  priority={todo.priority}
                  onClick={() => onStartEdit(todo)}
                />
              )}

              {/* Action Buttons Container - always visible */}
              <div
                style={{
                  width: '65px',
                  height: '19.5px',
                  gap: '3.25px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'absolute',
                  right: 0,
                }}
              >
                <button
                  onClick={() => onTimerClick(todo.id)}
                  style={{
                    width: '19.5px',
                    height: '19.5px',
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
                  <Clock style={{ color: '#000000', width: '15px', height: '15px' }} />
                </button>
                <button
                  onClick={() => onPriorityToggle(todo.id)}
                  style={{
                    width: '19.5px',
                    height: '19.5px',
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
                  <ArrowUp style={{ color: '#000000', width: '15px', height: '15px' }} />
                </button>
                <button
                  onClick={() => onDelete(todo.id)}
                  style={{
                    width: '19.5px',
                    height: '19.5px',
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
                  <Minus style={{ color: '#000000', width: '15px', height: '15px' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section - Add Task */}
        <div style={{
          width: '100%',
          height: '79px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          marginTop: 'auto',
          boxSizing: 'border-box',
        }}>
          {/* Add Task Box */}
          {!editingId && (
            <div style={{
              width: '100%',
              maxWidth: '500px',
              height: '26px',
              gap: '6.5px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '39px',
              paddingRight: '39px',
            }}>
              <Input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add task"
                style={{
                  flex: 1,
                  height: '26px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '0.54px solid rgba(0, 0, 0, 0.8)',
                  padding: 0,
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#000000',
                }}
              />
              <button
                onClick={addTodo}
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
                <Plus style={{ color: '#000000', width: '19.5px', height: '19.5px' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Life in Weeks */}
      <div
        ref={lifetimeRef}
        style={{
          flex: '1 1 0',
          minWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        }}
      >
        <LifetimeViewInline
          dateOfBirth={dateOfBirth}
          expectedLifespan={expectedLifespan}
          weekNotes={weekNotes}
          onSaveWeekNote={onSaveWeekNote}
          bucketList={bucketList}
          onSaveBucketList={setBucketList}
          totalMeditationMinutes={totalMeditationMinutes}
          containerWidth={lifetimeViewWidth}
          onBucketListClick={() => setShowBucketList(true)}
        />
      </div>
    </div>
  );
};

