import { notFound } from "next/navigation";
import type { HomepageDTO } from "@nuru/types";
import HomepageSections from "@/components/merchandising/HomepageSections";
import { getCollectionMerchandising } from "@/lib/data/merchandising";

export default async function CollectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const result = await getCollectionMerchandising(key).catch(() => null);
  if (!result?.collection) notFound();

  const homepage: HomepageDTO = {
    generatedAt: new Date().toISOString(),
    personalization: "global",
    experimentAssignments: {},
    sections: [{
      id: `collection-page:${result.collection.id}`,
      position: 0,
      device: "all",
      configuration: { layout: "grid" },
      collection: result.collection,
      products: result.products.items,
      nextCursor: result.products.nextCursor,
    }],
  };

  return <main className="min-h-screen bg-slate-50 py-8 dark:bg-black"><HomepageSections homepage={homepage} /></main>;
}

