import Auth from '@/components/Auth';

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">ログイン</h1>
      <Auth />
    </div>
  );
} 