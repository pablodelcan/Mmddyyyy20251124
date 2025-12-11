import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

// Scrolling text component for tasks with active timers
interface ScrollingTaskTextProps {
    text: string;
    timeRemaining: string | undefined;
    completed: boolean;
    priority: boolean;
    onClick: () => void;
}

export const ScrollingTaskText: React.FC<ScrollingTaskTextProps> = ({
    text,
    timeRemaining,
    completed,
    priority,
    onClick,
}) => {
    const [scrollDistance, setScrollDistance] = useState(0);
    const [repeatCount, setRepeatCount] = useState(2);
    const textMeasureRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (timeRemaining && textMeasureRef.current && containerRef.current) {
            requestAnimationFrame(() => {
                if (textMeasureRef.current && containerRef.current) {
                    const textWidth = textMeasureRef.current.scrollWidth;
                    const containerWidth = containerRef.current.offsetWidth;

                    // Calculate how many copies we need to fill the container + buffer
                    // We need enough copies so that when we scroll by (textWidth + 32),
                    // the content still covers the container.
                    const gap = 32;
                    const totalItemWidth = textWidth + gap;
                    const copiesNeeded = Math.ceil((containerWidth + totalItemWidth) / totalItemWidth) + 1;

                    setRepeatCount(Math.max(2, copiesNeeded));
                    setScrollDistance(-(textWidth + gap));
                }
            });
        } else {
            setScrollDistance(0);
            setRepeatCount(2);
        }
    }, [timeRemaining, text]);

    const displayText = timeRemaining ? `${text} • ${timeRemaining}` : text;

    if (!timeRemaining) {
        return (
            <div
                onClick={onClick}
                style={{
                    flex: 1,
                    height: '19.5px',
                    marginLeft: '9.75px',
                    marginRight: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    cursor: 'text',
                }}
            >
                <span
                    style={{
                        color: '#000000',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        lineHeight: '19.5px',
                        paddingTop: '2px',
                        textDecoration: completed ? 'line-through' : 'none',
                        opacity: completed ? 0.5 : 1,
                        background: completed
                            ? 'rgba(0,0,0,0.05)'
                            : priority
                                ? 'rgba(243, 235, 126, 0.4)'
                                : 'transparent',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-block',
                        maxWidth: '100%',
                    }}
                >
                    {text}
                </span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            onClick={onClick}
            style={{
                flex: 1,
                height: '19.5px',
                marginLeft: '9.75px',
                marginRight: '70px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'text',
                display: 'flex',
                alignItems: 'center',
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
                    lineHeight: '19.5px',
                    pointerEvents: 'none',
                }}
            >
                {displayText}
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
                    duration: scrollDistance !== 0 ? Math.abs(scrollDistance) / 20 : 0,
                    repeat: scrollDistance !== 0 ? Infinity : 0,
                    ease: "linear",
                }}
            >
                {Array.from({ length: repeatCount }).map((_, i) => (
                    <span
                        key={i}
                        style={{
                            color: '#000000',
                            fontFamily: 'Courier New',
                            fontWeight: 700,
                            fontSize: '15px',
                            lineHeight: '19.5px',
                            marginRight: '32px',
                            textDecoration: completed ? 'line-through' : 'none',
                            opacity: completed ? 0.5 : 1,
                            background: completed
                                ? 'rgba(0,0,0,0.05)'
                                : priority
                                    ? 'rgba(243, 235, 126, 0.4)'
                                    : 'transparent',
                        }}
                    >
                        {displayText}
                    </span>
                ))}
            </motion.div>
        </div>
    );
};
