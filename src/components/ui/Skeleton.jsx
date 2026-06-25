// Skeleton Loaders for HAIF1
// Designed with Glassmorphism and Pulse animation

const SkeletonBase = ({ style, className = '' }) => (
  <div 
    className={`skeleton ${className}`}
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style
    }} 
  />
);

export const SkeletonText = ({ width = '100%', height = 16, style }) => (
  <SkeletonBase style={{ width, height, borderRadius: 8, ...style }} />
);

export const SkeletonAvatar = ({ size = 40, style }) => (
  <SkeletonBase style={{ width: size, height: size, borderRadius: '50%', ...style }} />
);

export const SkeletonCard = ({ height = 150, style }) => (
  <SkeletonBase style={{ width: '100%', height, borderRadius: 24, ...style }} />
);

export const SkeletonList = ({ rows = 5,  }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
        <SkeletonAvatar size={36} style={{ animationDelay: `${i * 0.1}s` }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonText width="60%" height={14} style={{ animationDelay: `${i * 0.15}s` }} />
          <SkeletonText width="40%" height={10} style={{ animationDelay: `${i * 0.2}s` }} />
        </div>
        <SkeletonText width={30} height={20} style={{ borderRadius: 6, animationDelay: `${i * 0.1}s` }} />
      </div>
    ))}
  </div>
);

// Unified Page Loader (To replace App.jsx global loader)
export const SkeletonPage = () => (
  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <SkeletonText width={120} height={24} />
      <SkeletonAvatar size={32} />
    </div>
    <SkeletonCard height={180} />
    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
      <SkeletonCard height={100} style={{ flex: 1 }} />
      <SkeletonCard height={100} style={{ flex: 1 }} />
    </div>
    <SkeletonList rows={3} />
  </div>
);
