export function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M8 3C4.5 3 1.73 5.61 1 8c.73 2.39 3.5 5 7 5s6.27-2.61 7-5c-.73-2.39-3.5-5-7-5z" 
        stroke="currentColor" 
        strokeWidth="1.2"
        fill="none"
      />
      <circle 
        cx="8" 
        cy="8" 
        r="2" 
        stroke="currentColor" 
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}

export function EyeClosedIcon({ className }: { className?: string }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M1 8C1.73 5.61 4.5 3 8 3s6.27 2.61 7 5" 
        stroke="currentColor" 
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}
