import React from 'react';
import { Coin } from '../types.ts';

interface CryptoIconProps {
  coin: Coin;
  className?: string;
  size?: number;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ coin, className = '', size = 24 }) => {
  switch (coin) {
    case 'BTC':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            d="M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1.1-.3l-2.3-.6-.5 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1l-.2-.1-1.1 4.5c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.8.5 4.9.3 5.8-2.2.7-2 0-3.2-1.5-3.9 1.1-.3 1.9-1.1 2.1-2.7zm-3.8 5.7c-.5 2-3.9.9-5 .6l.9-3.6c1.1.3 4.6.8 4.1 3zm.5-5.8c-.5 1.8-3.3.9-4.3.6l.8-3.3c1 .3 3.9.8 3.5 2.7z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'LTC':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="16" cy="16" r="16" fill="#345D9D" />
          <path
            d="M14.5 7h4l-3.3 12.5h5.3l-.9 3.5H9.5l4-15.5l1-.5z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <path
            d="M12.2 14.2l.8-3.2 4.6 1.2-.8 3.2-4.6-1.2z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'DOGE':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="16" cy="16" r="16" fill="#C2A633" />
          <path
            d="M12 8h5.2c4.3 0 7.3 2.8 7.3 8s-3 8-7.3 8H12V8zm4 12.6h1.3c2.3 0 3.8-1.7 3.8-4.6s-1.5-4.6-3.8-4.6H16v9.2z"
            fill="#FFFFFF"
          />
          <path
            d="M10 15h9v2h-9z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'USDT':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            d="M17.8 17.5c-.1 0-.7.1-1.8.1s-1.7 0-1.8-.1c-3.7-.2-6.5-.9-6.5-1.7 0-.9 2.8-1.6 6.5-1.7v2.7c.3 0 .9.1 1.8.1s1.5 0 1.8-.1v-2.7c3.7.2 6.5.9 6.5 1.7 0 .8-2.8 1.5-6.5 1.7zm0-4v-2.4h5.6V8.2H8.6v2.9h5.6v2.4c-4.2.2-7.4 1.1-7.4 2.2s3.2 2 7.4 2.2v6.9h3.6v-6.9c4.2-.2 7.4-1.1 7.4-2.2s-3.2-2-7.4-2.2z"
            fill="#FFFFFF"
          />
        </svg>
      );
  }
};
