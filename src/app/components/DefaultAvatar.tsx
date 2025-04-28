import React from 'react';

interface DefaultAvatarProps {
  displayName?: string | null;
  size?: number;
  className?: string;
}

export default function DefaultAvatar({ displayName, size = 40, className = '' }: DefaultAvatarProps) {
  // ユーザー名から頭文字を取得
  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // ユーザー名から一貫した色を生成
  const getColorFromName = (name: string) => {
    const colors = [
      '#F87171', // red-400
      '#FB923C', // orange-400
      '#FBBF24', // amber-400
      '#34D399', // emerald-400
      '#60A5FA', // blue-400
      '#A78BFA', // violet-400
      '#F472B6', // pink-400
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = displayName ? getInitials(displayName) : '?';
  const backgroundColor = displayName ? getColorFromName(displayName) : '#9CA3AF';

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-medium ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initials}
    </div>
  );
} 