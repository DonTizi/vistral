'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { VistralLogo } from '@/components/ui/VistralLogo';


const LINES = [
  'Mistral AI Hackathon',
  'Video World-State Intelligence',
  'Temporal Knowledge Graphs',
  'By Elyes Rayane Melbouci',
];

/* Mistral rainbow colors for the staircase panels */
const RAINBOW = ['#FFD800', '#FFAF00', '#FF8205', '#FA500F', '#E10500'];

function PreloaderOverlay() {
  const [lineIndex, setLineIndex] = useState(0);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimension({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    if (lineIndex >= LINES.length - 1) return;
    const timeout = setTimeout(() => setLineIndex(lineIndex + 1), lineIndex === 0 ? 800 : 550);
    return () => clearTimeout(timeout);
  }, [lineIndex]);

  const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height} L0 0`;
  const targetPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height} L0 0`;

  return (
    <motion.div
      variants={{
        initial: { top: 0 },
        exit: {
          top: '-100vh',
          transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.2 },
        },
      }}
      initial="initial"
      exit="exit"
      className="fixed inset-0 z-[99] flex flex-col items-center justify-center bg-[#1A1A1A]"
    >
      {dimension.width > 0 && (
        <>
          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* VISTRAL logo — larger, with subtle pulse */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
            >
              <VistralLogo className="w-20 h-20" />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-2xl font-bold tracking-tight text-[#FFFAEB]"
            >
              <span className="text-[#FA500F]">V</span>ISTRAL
            </motion.h1>

            {/* Cycling text — smaller, secondary */}
            <div className="h-7 flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm tracking-wide text-[#FFFAEB] text-center"
                >
                  {LINES[lineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Powered label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-[11px] text-[#FFFAEB] tracking-wide"
            >
              Powered by Mistral AI
            </motion.p>
          </div>

          {/* Rainbow staircase panels behind content — for the exit reveal */}
          <motion.div className="pointer-events-none fixed inset-0 z-[1] flex">
            {RAINBOW.map((color, i) => (
              <motion.div
                key={i}
                initial={{ height: '100%' }}
                exit={{ height: 0 }}
                transition={{
                  duration: 0.45,
                  delay: 0.08 + 0.05 * (4 - i),
                  ease: [0.33, 1, 0.68, 1],
                }}
                className="h-full w-[20vw]"
                style={{ backgroundColor: color }}
              />
            ))}
          </motion.div>

          {/* Dark layer on top of rainbow (so content is readable), exits to reveal rainbow briefly */}
          <motion.div
            className="pointer-events-none fixed inset-0 z-[2] bg-[#1A1A1A]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
          />

          {/* SVG curve mask at bottom */}
          <svg className="absolute top-0 z-[3] h-[calc(100%+300px)] w-full pointer-events-none">
            <motion.path
              variants={{
                initial: {
                  d: initialPath,
                  transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] },
                },
                exit: {
                  d: targetPath,
                  transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.2 },
                },
              }}
              initial="initial"
              exit="exit"
              className="fill-[#1A1A1A]"
            />
          </svg>
        </>
      )}
    </motion.div>
  );
}

export function Preloader({ children }: { children: React.ReactNode }) {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreloader(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {showPreloader && <PreloaderOverlay />}
      </AnimatePresence>
      {children}
    </>
  );
}
