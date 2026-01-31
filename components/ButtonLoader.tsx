'use client';

import { motion } from 'framer-motion';

interface ButtonLoaderProps {
  loading: boolean;
  text: string;
  loadingText: string;
}

export default function ButtonLoader({ loading, text, loadingText }: ButtonLoaderProps) {
  return (
    <div className="relative flex items-center justify-center gap-3">
      {loading ? (
        <>
          {/* Orbiting Dots */}
          <div className="relative w-5 h-5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-current rounded-full"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.2,
                }}
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: '10px 10px',
                  marginTop: '-0.75px',
                  marginLeft: '-10.75px',
                }}
              />
            ))}
          </div>
          
          {/* Shimmer Text */}
          <motion.span
            className="relative overflow-hidden"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {loadingText}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.span>
        </>
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}
