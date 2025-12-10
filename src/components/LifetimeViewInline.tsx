import { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface LifetimeViewInlineProps {
  dateOfBirth: string | null;
  expectedLifespan: number;
  weekNotes: { [weekIndex: number]: string };
  onSaveWeekNote: (weekIndex: number, note: string) => void;
  bucketList: { id: string; text: string; completed: boolean }[];
  onSaveBucketList: (list: { id: string; text: string; completed: boolean }[]) => void;
  totalMeditationMinutes: number;
  containerWidth?: number;
  onBucketListClick?: () => void;
}

export const LifetimeViewInline = ({
  dateOfBirth,
  expectedLifespan,
  weekNotes,
  onSaveWeekNote,
  bucketList,
  onSaveBucketList,
  totalMeditationMinutes,
  containerWidth = 400,
  onBucketListClick
}: LifetimeViewInlineProps) => {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate responsive grid dimensions for 348px width
  const gridWidth = 348;
  const gapSize = 1;
  const totalGaps = 51; // 52 columns means 51 gaps
  const squareSize = Math.max(4, (gridWidth - totalGaps * gapSize) / 52);

  // Calculate lifetime stats
  const calculateLifetimeStats = () => {
    if (!dateOfBirth) return null;

    const birth = new Date(dateOfBirth);
    const today = new Date();
    const weeksInYear = 52;
    const totalWeeks = expectedLifespan * weeksInYear;

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksLived = Math.floor((today.getTime() - birth.getTime()) / msPerWeek);

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
    const yearsRemaining = Math.max(0, expectedLifespan - years);

    return {
      weeksLived,
      weeksRemaining,
      totalWeeks,
      years,
      months,
      days,
      yearsRemaining,
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

  const selectedWeekStats = selectedWeek !== null ? getWeekStats(selectedWeek) : null;

  // Show message for logged out users or users without date of birth
  if (!dateOfBirth || !stats) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '39px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* yyyy Title */}
          <h2 style={{
            width: '32px',
            height: '20px',
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '13px',
            lineHeight: '19.5px',
            color: '#000000',
            margin: 0,
            marginBottom: '26px',
          }}>
            yyyy
          </h2>
          <div style={{
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '13px',
            lineHeight: '19.5px',
            color: 'rgba(0, 0, 0, 0.6)',
          }}>
            Please set your date of birth in Settings to view your life in weeks
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#F5F5F5',
      position: 'relative',
      alignItems: 'center',
    }}>
      {/* Main Column Wrapper - Fixed max width to match design */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}>
        {/* yyyy Title */}
        <div style={{
          padding: '39px',
          paddingBottom: '26px',
          width: '100%',
        }}>
          <h2 style={{
            width: '322px',
            height: '19.5px',
            fontFamily: 'Courier New',
            fontWeight: 700,
            fontSize: '13px',
            lineHeight: '19.5px',
            letterSpacing: '0px',
            color: '#000000',
            margin: 0,
          }}>
            yyyy
          </h2>
        </div>

        {/* Content Box */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingLeft: '39px',
          }}
        >
          {/* Text Container with "Your life in weeks" */}
          <div style={{
            width: '100%',
            maxWidth: '322px',
            height: '19.5px',
            marginTop: '6.5px',
            // marginLeft: '19.5px', // This is now handled by paddingLeft on the parent
            display: 'flex',
            alignItems: 'center',
          }}>
            <span style={{
              width: '141px',
              height: '20px',
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '13px',
              lineHeight: '19.5px',
              letterSpacing: '0px',
              color: 'rgba(0, 0, 0, 0.6)',
            }}>
              Your life in weeks
            </span>
          </div>

          {/* Weeks Grid Container */}
          <div style={{
            width: '100%',
            maxWidth: '348px',
            minHeight: '536.75px',
            marginTop: '6.5px',
            marginLeft: '6.5px',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(52, ${squareSize}px)`,
              gridAutoRows: `${squareSize}px`,
              width: `${gridWidth}px`,
              gap: `${gapSize}px`,
            }}>
              {Array.from({ length: stats.totalWeeks }).map((_, index) => {
                const isLived = index < stats.weeksLived;
                const isCurrent = index === stats.weeksLived;
                const isSelected = selectedWeek === index;
                const hasNote = weekNotes[index] && weekNotes[index].trim().length > 0;

                let backgroundColor = 'rgba(0, 0, 0, 0.1)';
                if (isLived) {
                  backgroundColor = 'rgba(0, 0, 0, 0.8)';
                }
                if (hasNote) {
                  backgroundColor = '#be8bad';
                }
                if (isCurrent || isSelected) {
                  backgroundColor = '#D84341';
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedWeek(selectedWeek === index ? null : index)}
                    style={{
                      width: `${squareSize}px`,
                      height: `${squareSize}px`,
                      backgroundColor: backgroundColor,
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Week Detail Panel - shows when a week is selected */}
          {selectedWeek !== null && selectedWeekStats && (
            <div style={{
              width: '100%',
              maxWidth: '322px',
              marginTop: '19.5px',
              marginLeft: '19.5px',
              padding: '19.5px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}>
              {/* Header with week number and close button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '19.5px',
              }}>
                <span style={{
                  fontFamily: 'Courier New',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#000000',
                }}>
                  Week {selectedWeek + 1}
                </span>
                <button
                  onClick={() => setSelectedWeek(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#000000',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '13px',
                marginBottom: '19.5px',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'rgba(0, 0, 0, 0.6)',
                    marginBottom: '4px',
                  }}>Date</div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#000000',
                  }}>{selectedWeekStats.date}</div>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'rgba(0, 0, 0, 0.6)',
                    marginBottom: '4px',
                  }}>Age</div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#000000',
                  }}>{selectedWeekStats.age}</div>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'rgba(0, 0, 0, 0.6)',
                    marginBottom: '4px',
                  }}>Days lived</div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#000000',
                  }}>{selectedWeekStats.daysLived.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: 'rgba(0, 0, 0, 0.6)',
                    marginBottom: '4px',
                  }}>Percentage</div>
                  <div style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#000000',
                  }}>{selectedWeekStats.percentage}%</div>
                </div>
              </div>

              {/* Note Section */}
              <div>
                <div style={{
                  fontFamily: 'Courier New',
                  fontWeight: 400,
                  fontSize: '13px',
                  color: 'rgba(0, 0, 0, 0.6)',
                  marginBottom: '6.5px',
                }}>Note for this week</div>
                <textarea
                  placeholder="Add a memory or important moment..."
                  value={weekNotes[selectedWeek] || ''}
                  onChange={(e) => onSaveWeekNote(selectedWeek, e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '65px',
                    padding: '9.75px',
                    fontFamily: 'Courier New',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: '#000000',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    backgroundColor: '#F5F5F5',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats Text */}
          <div style={{
            width: '100%',
            maxWidth: '322px',
            height: '97.5px',
            marginTop: '19.5px',
            marginLeft: '19.5px',
          }}>
            <div style={{
              width: '320px',
              height: '98px',
              fontFamily: 'Courier New',
              fontWeight: 700,
              fontSize: '13px',
              lineHeight: '19.5px',
              letterSpacing: '0px',
              color: 'rgba(0, 0, 0, 0.6)',
            }}>
              You have lived {stats.years} years, {stats.months} months, and {stats.days} days ({stats.weeksLived.toLocaleString()} weeks). This represents {stats.percentageLived.toFixed(1)}% of an expected {expectedLifespan}-year lifespan. You have approximately {stats.yearsRemaining} years ({stats.weeksRemaining.toLocaleString()} weeks) remaining.
            </div>
          </div>
        </div>
      </div>

      {/* Bucket List Button Container - Outside max-width wrapper for full-width separator */}
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
        <button
          onClick={() => {
            onBucketListClick?.();
          }}
          style={{
            width: '322px',
            height: '26px',
            gap: '6.5px',
            paddingTop: '6.5px',
            paddingRight: '13px',
            paddingBottom: '6.5px',
            paddingLeft: '13px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            background: '#F5D5D8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{
            width: '76px',
            height: '17px',
            fontFamily: 'Courier New',
            fontWeight: 400,
            fontSize: '11.38px',
            lineHeight: '16.25px',
            letterSpacing: '0px',
            textAlign: 'center',
            color: '#000000',
          }}>
            Bucket list
          </span>
        </button>
      </div>
    </div>
  );
};
