"use client";

import { useEffect, useState } from 'react';

interface CursorEffectsProps {
  enabled?: boolean;
}

const CursorEffects: React.FC<CursorEffectsProps> = ({ enabled = true }) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; life: number; id: string }>>([]);
  const [isOverSelected, setIsOverSelected] = useState(false);

  // Track mouse position
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if we're over a selectable element
      const target = e.target as HTMLElement;
      const isSelectable = target.classList.contains('section-selected') || 
                           target.closest('.section-selected') !== null ||
                           target.classList.contains('cursor-select') || 
                           target.closest('.cursor-select') !== null;
      
      const isSelected = target.classList.contains('section-selected') || 
                         target.closest('.section-selected') !== null;
      
      setIsOverSelected(isSelected);
      
      // Create particles when over selected elements
      if (isSelectable) {
        // Throttle particle creation
        if (Math.random() > 0.8) {
          const newParticle = {
            x: e.clientX,
            y: e.clientY,
            size: Math.random() * 5 + 3,
            life: 1, // Life decreases from 1 to 0
            id: `particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          setParticles(prev => [...prev, newParticle]);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled]);

  // Update and remove particles
  useEffect(() => {
    if (!enabled || particles.length === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            life: p.life - 0.05 // Decrease life
          }))
          .filter(p => p.life > 0) // Remove dead particles
      );
    }, 50);
    
    return () => clearInterval(interval);
  }, [particles, enabled]);

  if (!enabled) return null;

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
