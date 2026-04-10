import CollectionDetailClient from "./CollectionDetailClient";

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CollectionDetailClient slug={slug} />;
}
