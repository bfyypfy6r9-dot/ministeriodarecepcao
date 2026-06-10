import React from 'react';

export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cabeça */}
      <circle cx="50" cy="18" r="14" fill="#F97316"/>
      
      {/* Corpo e Braços (Acolhimento) */}
      <path 
        d="M 6 38 
           C 20 40 80 40 94 38 
           C 98 37 100 42 95 45 
           L 65 62 
           L 65 96 
           C 65 98 62 100 55 100 
           L 45 100 
           C 38 100 35 98 35 96 
           L 35 62 
           L 5 45 
           C 0 42 2 37 6 38 
           Z" 
        fill="#F97316"
      />
               
      {/* Coração */}
      <path 
        d="M 50 75 
           C 50 75 36 60 36 49 
           C 36 39 46 38 50 46 
           C 54 38 64 39 64 49 
           C 64 60 50 75 50 75 
           Z" 
        fill="#DC2626"
      />
    </svg>
  );
}
