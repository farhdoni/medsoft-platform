export function OrbBackground({ variant = 'default' }: { variant?: 'default' | 'pink-heavy' | 'minimal' }) {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-radial-blue blur-[80px] animate-drift-1" />
        <div className="absolute top-[20%] -right-[8%] w-[500px] h-[500px] rounded-full bg-radial-pink blur-[80px] animate-drift-2" />
        <div className="absolute -bottom-[5%] left-[30%] w-[400px] h-[400px] rounded-full bg-radial-mint blur-[80px] animate-drift-3" />
        {variant === 'pink-heavy' && (
          <div className="absolute bottom-[25%] right-[20%] w-[350px] h-[350px] rounded-full bg-radial-pink-light blur-[80px] animate-drift-4" />
        )}
      </div>
      <div className="fixed inset-0 pointer-events-none z-[1] bg-grid-pattern" />
    </>
  );
}
