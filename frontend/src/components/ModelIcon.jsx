const icons = {
  google: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),

  openai: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#000"/>
      <path d="M12.89 3.78a4.37 4.37 0 00-3.73 2.11 4.37 4.37 0 00-4.04 2.05 4.37 4.37 0 00.54 5.13 4.37 4.37 0 00.37 3.57 4.37 4.37 0 004.73 2.1 4.37 4.37 0 003.27 1.46 4.37 4.37 0 004.19-3.04 4.37 4.37 0 002.91-2.11 4.37 4.37 0 00-.54-5.13 4.37 4.37 0 00-.37-3.57 4.37 4.37 0 00-4.73-2.1 4.37 4.37 0 00-2.6-.47zm.29 1.37a3 3 0 011.93.69l-.1.06-3.21 1.85a.52.52 0 00-.26.46v4.52l-1.36-.78a.05.05 0 01-.03-.04V8.17a3 3 0 013.03-3.02zm-5.58 2.7a3 3 0 011.55.43l-.1.06v3.7a.52.52 0 00.26.46l3.2 1.85-1.36.78a.05.05 0 01-.05 0L7.71 13.4a3 3 0 01-.11-5.55zm8.93.8l1.36.79a.05.05 0 01.03.04v3.74a3 3 0 01-4.93 2.3l.1-.06 3.21-1.85a.52.52 0 00.26-.46V8.65zm-1.09 2.43l1.43.82v1.64l-1.43.83-1.43-.83v-1.64l1.43-.82zm-2.11 1.21v1.62l-3.21 1.85a3 3 0 01-1.45-3.57l.1.06 3.3 1.9V11.1l1.26.72z" fill="white"/>
    </svg>
  ),

  anthropic: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#C4935F"/>
      <path d="M14.17 6h-2.04L8 18h2.06l.87-2.4h4.14L15.94 18H18L14.17 6zm-2.63 7.86l1.59-4.38 1.6 4.38h-3.19z" fill="white"/>
    </svg>
  ),

  meta: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#0866FF"/>
      <path d="M4 14.5C4 16.43 4.87 17.7 6.25 17.7c1.12 0 1.88-.66 2.97-2.46.87-1.44 1.86-3.5 2.53-4.79l.91-1.65c.63-1.14 1.36-1.8 2.14-1.8 1.26 0 2.46 1.2 2.46 3.5 0 1.38-.27 2.3-.68 2.79M4 14.5c0-2.3 1.13-4 2.58-4 .96 0 1.68.6 2.59 2.05L10.24 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M19.2 13.8c0 2.17-1.01 3.9-2.4 3.9-1.21 0-2.06-.96-2.06-2.53 0-1.64.93-3.25 2.09-3.25 1.18 0 2.37 1.3 2.37 3.88z" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),

  mistral: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#FA520F"/>
      <rect x="4" y="4" width="4" height="4" fill="white"/>
      <rect x="10" y="4" width="4" height="4" fill="white"/>
      <rect x="16" y="4" width="4" height="4" fill="white"/>
      <rect x="4" y="10" width="4" height="4" fill="white"/>
      <rect x="16" y="10" width="4" height="4" fill="white"/>
      <rect x="4" y="16" width="4" height="4" fill="white"/>
      <rect x="10" y="16" width="4" height="4" fill="white"/>
      <rect x="16" y="16" width="4" height="4" fill="white"/>
    </svg>
  ),

  groq: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#1a1a1a"/>
      <text x="12" y="16.5" textAnchor="middle" fill="#F97316" fontSize="11" fontWeight="bold" fontFamily="monospace">G</text>
    </svg>
  ),

  deepseek: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#4D6BFE"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">DS</text>
    </svg>
  ),

  xai: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#111"/>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">𝕏</text>
    </svg>
  ),

  perplexity: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#20B2AA"/>
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">P</text>
    </svg>
  ),

  cerebras: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#EC4899"/>
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">C</text>
    </svg>
  ),

  openrouter: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#7C3AED"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">OR</text>
    </svg>
  ),

  fireworks: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#EF4444"/>
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">fw</text>
    </svg>
  ),

  cohere: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#06B6D4"/>
      <circle cx="9" cy="12" r="3" fill="white"/>
      <circle cx="16" cy="9" r="2" fill="white" opacity="0.7"/>
      <circle cx="16" cy="15" r="2" fill="white" opacity="0.7"/>
    </svg>
  ),

  qwen: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#6D28D9"/>
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">QW</text>
    </svg>
  ),

  microsoft: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#fff"/>
      <rect x="4" y="4" width="7" height="7" fill="#F25022"/>
      <rect x="13" y="4" width="7" height="7" fill="#7FBA00"/>
      <rect x="4" y="13" width="7" height="7" fill="#00A4EF"/>
      <rect x="13" y="13" width="7" height="7" fill="#FFB900"/>
    </svg>
  ),
};

export default function ModelIcon({ logoProvider, size = 16 }) {
  const Icon = icons[logoProvider] || icons.epam;
  return <Icon size={size} />;
}
