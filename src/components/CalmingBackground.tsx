import { motion } from 'motion/react';

export const CalmingBackground = () => {
  // Generate random positions for floating shapes
  const shapes = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    initialX: 20 + Math.random() * 60,
    initialY: 10 + Math.random() * 80,
    size: 150 + Math.random() * 250,
    duration: 25 + Math.random() * 25,
    delay: Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute rounded-full blur-3xl"
          style={{
            width: shape.size,
            height: shape.size,
            left: `${shape.initialX}%`,
            top: `${shape.initialY}%`,
            background: `radial-gradient(circle, ${
              shape.id % 3 === 0
                ? 'rgba(147,197,253,0.15)'
                : shape.id % 3 === 1
                ? 'rgba(190,139,173,0.15)'
                : 'rgba(251,191,36,0.15)'
            }, transparent)`,
          }}
          animate={{
            x: [0, Math.random() * 80 - 40, 0],
            y: [0, Math.random() * 80 - 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      
      {/* Subtle particles */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 60;
        const duration = 18 + Math.random() * 18;
        
        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-black/8"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
            animate={{
              y: [0, -120, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: duration,
              delay: Math.random() * 12,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      })}
    </div>
  );
};
