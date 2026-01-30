export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-6xl font-black tracking-tighter mb-4">404</h1>
      <p className="text-xl text-slate-500 font-bold mb-8 uppercase tracking-widest">Protocol Not Found</p>
      <a href="/" className="bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest">
        Return to Base
      </a>
    </div>
  );
}
