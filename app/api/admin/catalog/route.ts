import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import type {
  AdminCatalog,
  AdminCategory,
  AdminDeal,
  AdminProduct,
  AdminStore,
} from "@/types/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDir = path.join(process.cwd(), "data");

const dataFiles = {
  stores: "stores.json",
  products: "products.json",
  deals: "deals.json",
  categories: "categories.json",
} as const;

type CatalogKey = keyof typeof dataFiles;

function unauthorizedResponse() {
  return NextResponse.json(
    {
      message: "Admin login is required.",
      requiresLogin: true,
    },
    { status: 401 },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureArray<T>(value: unknown, key: CatalogKey): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid "${key}" payload.`);
  }

  return value as T[];
}

async function readJsonFile<T>(key: CatalogKey): Promise<T> {
  const filePath = path.join(dataDir, dataFiles[key]);
  const content = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");

  return JSON.parse(content) as T;
}

async function writeJsonFile<T>(key: CatalogKey, data: T): Promise<void> {
  const filePath = path.join(dataDir, dataFiles[key]);
  const content = `${JSON.stringify(data, null, 2)}\n`;

  await fs.writeFile(filePath, content, "utf8");
}

function assertUniqueIds(items: Array<{ id: string }>, label: string) {
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.id?.trim()) {
      throw new Error(`${label} id cannot be empty.`);
    }

    if (seen.has(item.id)) {
      throw new Error(`${label} id "${item.id}" is duplicated.`);
    }

    seen.add(item.id);
  }
}

function normalizeStoreRelations(
  stores: AdminStore[],
  products: AdminProduct[],
  deals: AdminDeal[],
): AdminStore[] {
  return stores.map((store) => ({
    ...store,
    productIds: products
      .filter((product) => product.storeId === store.id)
      .map((product) => product.id),
    dealIds: deals.filter((deal) => deal.storeId === store.id).map((deal) => deal.id),
  }));
}

function normalizeCategoryRelations(
  categories: AdminCategory[],
  stores: AdminStore[],
): AdminCategory[] {
  return categories.map((category) => ({
    ...category,
    storeIds: stores
      .filter((store) => store.category === category.name)
      .map((store) => store.id),
  }));
}

function validateReferences(catalog: AdminCatalog) {
  const storeIds = new Set(catalog.stores.map((store) => store.id));
  const productIds = new Set(catalog.products.map((product) => product.id));

  for (const product of catalog.products) {
    if (!storeIds.has(product.storeId)) {
      throw new Error(`Product "${product.id}" points to a missing store.`);
    }
  }

  for (const deal of catalog.deals) {
    if (!storeIds.has(deal.storeId)) {
      throw new Error(`Deal "${deal.id}" points to a missing store.`);
    }

    if (!productIds.has(deal.productId)) {
      throw new Error(`Deal "${deal.id}" points to a missing product.`);
    }
  }
}

function normalizeCatalog(payload: unknown): AdminCatalog {
  if (!isRecord(payload)) {
    throw new Error("Invalid admin catalog payload.");
  }

  const products = ensureArray<AdminProduct>(payload.products, "products").map(
    (product) => ({
      ...product,
      price: Number(product.price) || 0,
      discount: Number(product.discount) || 0,
      isNew: Boolean(product.isNew),
    }),
  );
  const deals = ensureArray<AdminDeal>(payload.deals, "deals").map((deal) => ({
    ...deal,
    discount: Number(deal.discount) || 0,
    expiresInHours: Number(deal.expiresInHours) || 0,
  }));
  const stores = normalizeStoreRelations(
    ensureArray<AdminStore>(payload.stores, "stores"),
    products,
    deals,
  );
  const categories = normalizeCategoryRelations(
    ensureArray<AdminCategory>(payload.categories, "categories"),
    stores,
  );

  assertUniqueIds(stores, "Store");
  assertUniqueIds(products, "Product");
  assertUniqueIds(deals, "Deal");
  assertUniqueIds(categories, "Category");

  const catalog = { stores, products, deals, categories };

  validateReferences(catalog);

  return catalog;
}

async function readCatalog(): Promise<AdminCatalog> {
  const [stores, products, deals, categories] = await Promise.all([
    readJsonFile<AdminStore[]>("stores"),
    readJsonFile<AdminProduct[]>("products"),
    readJsonFile<AdminDeal[]>("deals"),
    readJsonFile<AdminCategory[]>("categories"),
  ]);

  return { stores, products, deals, categories };
}

export async function GET(request: NextRequest) {
  if (!hasAdminAccess(request)) {
    return unauthorizedResponse();
  }

  try {
    const catalog = await readCatalog();

    return NextResponse.json({
      ...catalog,
      requiresLogin: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read catalog.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!hasAdminAccess(request)) {
    return unauthorizedResponse();
  }

  try {
    const catalog = normalizeCatalog(await request.json());

    await Promise.all([
      writeJsonFile("stores", catalog.stores),
      writeJsonFile("products", catalog.products),
      writeJsonFile("deals", catalog.deals),
      writeJsonFile("categories", catalog.categories),
    ]);

    return NextResponse.json({
      ...catalog,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save catalog.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
