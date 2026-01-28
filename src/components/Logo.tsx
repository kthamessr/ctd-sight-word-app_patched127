'use client';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 80, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="white" stroke="#9333EA" strokeWidth="3" />
      
      {/* Large "A" for Ausum */}
      <text
        x="50"
        y="55"
        fontSize="48"
        fontWeight="bold"
        fill="url(#gradient)"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        A
      </text>
      
      {/* Decorative smile/arc below */}
      <path
        d="M 25 70 Q 50 80 75 70"
        stroke="#EC4899"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Small sparkle/star accent */}
      <circle cx="75" cy="25" r="3" fill="#FCD34D" />
      <circle cx="70" cy="30" r="2" fill="#FCD34D" opacity="0.7" />
      <circle cx="80" cy="30" r="2" fill="#FCD34D" opacity="0.7" />
      
      {/* Gradient Definition */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}
