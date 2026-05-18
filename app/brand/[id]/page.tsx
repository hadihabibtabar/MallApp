import { redirect } from "next/navigation";

interface BrandPageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandPage({ params }: BrandPageProps) {
  await params;
  redirect("/stores");
}
