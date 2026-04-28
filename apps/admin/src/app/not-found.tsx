import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Страница не найдена</p>
      <Link href="/dashboard" className="text-primary underline underline-offset-4">
        Вернуться на дашборд
      </Link>
    </div>
  );
}
