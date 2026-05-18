interface PageTitleProps {
  title: string;
  subtitle: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <header className="space-y-1.5">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
      <p className="text-sm leading-7 text-slate-600">{subtitle}</p>
    </header>
  );
}
