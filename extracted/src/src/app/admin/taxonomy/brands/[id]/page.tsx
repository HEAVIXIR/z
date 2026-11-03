import BrandControlCenter from "./BrandControlCenter";

export const dynamic = "force-dynamic";

export default async function BrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BrandControlCenter brandId={id} />;
}
