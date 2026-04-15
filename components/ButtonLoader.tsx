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
                className="absolute inset-0"
                initial={{ rotate: i * 120 }}
                animate={{ rotate: i * 120 + 360 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <div className="w-1.5 h-1.5 bg-current rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
              </motion.div>
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
