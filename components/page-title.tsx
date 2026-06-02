interface PageTitleProps {
  title: string;
  subtitle: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <header className="space-y-1.5 md:space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
        {title}
      </h1>
      <p className="text-sm leading-7 text-slate-600 md:text-base md:leading-8">{subtitle}</p>
    </header>
  );
}
