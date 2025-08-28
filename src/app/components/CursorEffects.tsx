"use client";

import { useEffect, useState } from 'react';
import { usePerformance } from '@/context/PerformanceContext';

interface CursorEffectsProps {
  enabled?: boolean;
}

const CursorEffects: React.FC<CursorEffectsProps> = ({ enabled = true }) => {
  const { settings } = usePerformance();
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; life: number; id: string }>>([]);
  const [isOverSelected, setIsOverSelected] = useState(false);

  // Check if effects should be enabled based on performance settings
  const effectsEnabled = enabled && settings.cursorEffectsEnabled && !settings.highPerformanceMode;

  // Track mouse position with throttling
  useEffect(() => {
    if (!effectsEnabled) return;

    let lastMouseUpdate = 0;
    const MOUSE_THROTTLE = 16; // ~60fps limit for mouse updates

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      
      // Throttle mouse position updates
      if (now - lastMouseUpdate > MOUSE_THROTTLE) {
        setPosition({ x: e.clientX, y: e.clientY });
        lastMouseUpdate = now;
      }
      
      // Check if we're over a selectable element (less frequent)
      const target = e.target as HTMLElement;
      const isSelectable = target.classList.contains('section-selected') || 
                           target.closest('.section-selected') !== null ||
                           target.classList.contains('cursor-select') || 
                           target.closest('.cursor-select') !== null;
      
      const isSelected = target.classList.contains('section-selected') || 
                         target.closest('.section-selected') !== null;
      
      setIsOverSelected(isSelected);
      
      // Create particles when over selected elements (heavily throttled)
      if (isSelectable && particles.length < 10 && settings.particleEffectsEnabled) { // Limit max particles
        // More aggressive throttling for particle creation
        if (Math.random() > 0.9) {
          const newParticle = {
            x: e.clientX,
            y: e.clientY,
            size: Math.random() * 5 + 3,
            life: 1, // Life decreases from 1 to 0
            id: `particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          setParticles(prev => [...prev.slice(-5), newParticle]); // Keep only last 5 + new one
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [effectsEnabled, settings.particleEffectsEnabled]);

  // Update and remove particles using requestAnimationFrame instead of setInterval
  useEffect(() => {
    if (!effectsEnabled || particles.length === 0) return;
    
    let animationFrame: number;
    let lastUpdate = 0;
    
    const updateParticles = (timestamp: number) => {
      // Throttle to 60fps for smooth animations
      if (timestamp - lastUpdate > 16) {
        setParticles(prev => 
          prev
            .map(p => ({
              ...p,
              life: p.life - 0.05 // Decrease life
            }))
            .filter(p => p.life > 0) // Remove dead particles
        );
        lastUpdate = timestamp;
      }
      
      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(updateParticles);
      }
    };
    
    animationFrame = requestAnimationFrame(updateParticles);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [particles, effectsEnabled]);

  if (!effectsEnabled) return null;

  return (
    <>
      {/* Custom cursor */}
      <div 
        className={`fixed z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out ${
          isOverSelected ? 'scale-110' : 'scale-100'
        }`}
        style={{
          left: `${position.x}px`, 
          top: `${position.y}px`
        }}
      >
        {isOverSelected ? (
          <div className="w-8 h-8 rounded-full bg-purple-400/30 border-2 border-purple-400/60 backdrop-blur-sm" />
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-white opacity-50" />
        )}
      </div>
      
      {/* Particles */}
      {particles.map(particle => (
        <div 
          key={particle.id}
          className="fixed rounded-full pointer-events-none z-[99] bg-purple-400"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            opacity: particle.life,
            transform: `translate(-50%, -50%) scale(${particle.life})`,
            boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)'
          }}
        />
      ))}
    </>
  );
};

export default CursorEffects;
