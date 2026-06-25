
const Glass = ({ children, style = {}, accent, onClick }) => (
  <div onClick={onClick} style={{
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid rgba(255,255,255,0.09)`,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
    ...(onClick ? { cursor: 'pointer' } : {}),
    ...style,
  }}>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'rgba(255,255,255,0.12)', pointerEvents:'none' }} />
    {children}
  </div>
);

export default Glass;
