"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import type {
  AdminCatalog,
  AdminDeal,
  AdminProduct,
  AdminStore,
} from "@/types/admin";
import { isGoldProductTag } from "@/lib/format";
import { useViewTransition } from "@/components/view-transition";

type AdminTab = "stores" | "products" | "deals";
type SaveState = "idle" | "saving" | "saved" | "error";
type AuthState = "checking" | "authenticated" | "unauthenticated";

type CatalogResponse = AdminCatalog & {
  requiresLogin?: boolean;
  savedAt?: string;
};

const emptyStore = (): AdminStore => ({
  id: "",
  name: "",
  brand: "",
  floor: "طبقه همکف",
  category: "پوشاک",
  locationHint: "",
  description: "",
  heroImage: "/images/fallback-image.svg",
  productIds: [],
  dealIds: [],
});

const emptyProduct = (storeId = ""): AdminProduct => ({
  id: "",
  name: "",
  price: 0,
  discount: 0,
  image: "/images/fallback-image.svg",
  storeId,
  isNew: true,
  tag: "",
  description: "",
});

const emptyDeal = (storeId = "", productId = ""): AdminDeal => ({
  id: "",
  storeId,
  productId,
  title: "",
  discount: 0,
  expiresInHours: 24,
  tag: "",
});

function createId(prefix: string, source: string): string {
  const slug = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || prefix}-${Date.now().toString(36)}`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value || 0)));
}

function toPositiveNumber(value: number): number {
  return Math.max(0, Math.round(value || 0));
}

function normalizeCatalog(catalog: AdminCatalog): AdminCatalog {
  const stores = catalog.stores.map((store) => ({
    ...store,
    productIds: catalog.products
      .filter((product) => product.storeId === store.id)
      .map((product) => product.id),
    dealIds: catalog.deals
      .filter((deal) => deal.storeId === store.id)
      .map((deal) => deal.id),
  }));
  const categories = catalog.categories.map((category) => ({
    ...category,
    storeIds: stores
      .filter((store) => store.category === category.name)
      .map((store) => store.id),
  }));

  return { ...catalog, stores, categories };
}

function pickCatalog(response: CatalogResponse): AdminCatalog {
  return {
    stores: response.stores,
    products: response.products,
    deals: response.deals,
    categories: response.categories,
  };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount || 0);
}

function formatDiscountLabel(discount: number): string {
  return discount > 0 ? `${discount}% تخفیف` : "بدون تخفیف";
}

function getProductDetail(product: AdminProduct): string {
  if (isGoldProductTag(product.tag)) {
    const description = product.description || "بدون توضیحات";

    return product.discount > 0
      ? `${description} - ${formatDiscountLabel(product.discount)}`
      : description;
  }

  return `${formatPrice(product.price)} تومان - ${formatDiscountLabel(product.discount)}`;
}

function getStoreName(stores: AdminStore[], storeId: string): string {
  return stores.find((store) => store.id === storeId)?.name || "فروشگاه نامشخص";
}

function getProductName(products: AdminProduct[], productId: string): string {
  return products.find((product) => product.id === productId)?.name || "محصول نامشخص";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "خطایی رخ داد. دوباره تلاش کنید.";
}

export default function AdminPage() {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("stores");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [storeDraft, setStoreDraft] = useState<AdminStore>(() => emptyStore());
  const [productDraft, setProductDraft] = useState<AdminProduct>(() => emptyProduct());
  const [dealDraft, setDealDraft] = useState<AdminDeal>(() => emptyDeal());
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const runViewTransition = useViewTransition();

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();

    catalog?.categories.forEach((category) => values.add(category.name));
    catalog?.stores.forEach((store) => values.add(store.category));

    return Array.from(values).filter(Boolean);
  }, [catalog]);

  const floorOptions = useMemo(() => {
    const values = new Set<string>();

    catalog?.categories.forEach((category) => {
      category.floors.forEach((floor) => values.add(floor));
    });
    catalog?.stores.forEach((store) => values.add(store.floor));

    return Array.from(values).filter(Boolean);
  }, [catalog]);

  const filteredDealProducts = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return catalog.products.filter(
      (product) => !dealDraft.storeId || product.storeId === dealDraft.storeId,
    );
  }, [catalog, dealDraft.storeId]);

  const stats = useMemo(() => {
    if (!catalog) {
      return [
        { label: "فروشگاه", value: 0 },
        { label: "محصول", value: 0 },
        { label: "تخفیف فعال", value: 0 },
      ];
    }

    return [
      { label: "فروشگاه", value: catalog.stores.length },
      { label: "محصول", value: catalog.products.length },
      { label: "تخفیف فعال", value: catalog.deals.length },
    ];
  }, [catalog]);

  const applyLoadedCatalog = (nextCatalog: AdminCatalog) => {
    const normalizedCatalog = normalizeCatalog(nextCatalog);
    const firstStore = normalizedCatalog.stores[0] ?? emptyStore();
    const firstProduct = normalizedCatalog.products[0] ?? emptyProduct(firstStore.id);
    const firstDeal =
      normalizedCatalog.deals[0] ?? emptyDeal(firstProduct.storeId, firstProduct.id);

    setCatalog(normalizedCatalog);
    setSelectedStoreId(firstStore.id || null);
    setSelectedProductId(firstProduct.id || null);
    setSelectedDealId(firstDeal.id || null);
    setStoreDraft(firstStore);
    setProductDraft(firstProduct);
    setDealDraft(firstDeal);
    setIsDirty(false);
  };

  const fetchCatalog = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/catalog", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json()) as Partial<CatalogResponse> & {
        message?: string;
      };

      if (response.status === 401) {
        setAuthState("unauthenticated");
        setCatalog(null);
        setStatusMessage("برای ورود به پنل، نام کاربری و رمز عبور را وارد کنید.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "خواندن اطلاعات پنل ممکن نشد.");
      }

      setAuthState("authenticated");
      applyLoadedCatalog(data as CatalogResponse);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      setSaveState("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCatalog();
  }, []);

  const updateCatalog = (updater: (current: AdminCatalog) => AdminCatalog) => {
    setCatalog((current) => {
      if (!current) {
        return current;
      }

      return normalizeCatalog(updater(current));
    });
    setIsDirty(true);
    setSaveState("idle");
  };

  const applyStoreSelection = (store: AdminStore) => {
    setSelectedStoreId(store.id);
    setStoreDraft(store);
  };

  const selectStore = (store: AdminStore) => {
    if (selectedStoreId === store.id) {
      return;
    }

    runViewTransition(() => applyStoreSelection(store));
  };

  const applyProductSelection = (product: AdminProduct) => {
    setSelectedProductId(product.id);
    setProductDraft(product);
  };

  const selectProduct = (product: AdminProduct) => {
    if (selectedProductId === product.id) {
      return;
    }

    runViewTransition(() => applyProductSelection(product));
  };

  const applyDealSelection = (deal: AdminDeal) => {
    setSelectedDealId(deal.id);
    setDealDraft(deal);
  };

  const selectDeal = (deal: AdminDeal) => {
    if (selectedDealId === deal.id) {
      return;
    }

    runViewTransition(() => applyDealSelection(deal));
  };

  const applyNewStore = () => {
    setSelectedStoreId(null);
    setStoreDraft(emptyStore());
  };

  const startNewStore = () => {
    runViewTransition(applyNewStore);
  };

  const applyNewProduct = () => {
    const defaultStoreId = catalog?.stores[0]?.id || "";

    setSelectedProductId(null);
    setProductDraft(emptyProduct(defaultStoreId));
  };

  const startNewProduct = () => {
    runViewTransition(applyNewProduct);
  };

  const applyNewDeal = () => {
    const defaultProduct = catalog?.products[0];

    setSelectedDealId(null);
    setDealDraft(emptyDeal(defaultProduct?.storeId || "", defaultProduct?.id || ""));
  };

  const startNewDeal = () => {
    runViewTransition(applyNewDeal);
  };

  const selectAdminTab = (tab: AdminTab) => {
    if (activeTab === tab) {
      return;
    }

    runViewTransition(() => setActiveTab(tab));
  };

  const saveStoreDraft = () => {
    const id = storeDraft.id.trim() || createId("store", storeDraft.brand || storeDraft.name);
    const nextStore: AdminStore = {
      ...storeDraft,
      id,
      name: storeDraft.name.trim(),
      brand: storeDraft.brand.trim() || storeDraft.name.trim(),
      category: storeDraft.category.trim() || "بدون دسته",
      floor: storeDraft.floor.trim() || "بدون طبقه",
      locationHint: storeDraft.locationHint.trim(),
      description: storeDraft.description.trim(),
      heroImage: storeDraft.heroImage.trim() || "/images/fallback-image.svg",
    };
    const previousId = selectedStoreId;

    updateCatalog((current) => {
      const exists = previousId
        ? current.stores.some((store) => store.id === previousId)
        : false;
      const stores = exists
        ? current.stores.map((store) => (store.id === previousId ? nextStore : store))
        : [nextStore, ...current.stores];
      const products = previousId
        ? current.products.map((product) =>
            product.storeId === previousId ? { ...product, storeId: id } : product,
          )
        : current.products;
      const deals = previousId
        ? current.deals.map((deal) =>
            deal.storeId === previousId ? { ...deal, storeId: id } : deal,
          )
        : current.deals;

      return { ...current, stores, products, deals };
    });

    setSelectedStoreId(id);
    setStoreDraft(nextStore);
    setStatusMessage("فروشگاه در پیش‌نویس پنل به‌روزرسانی شد.");
  };

  const deleteStore = (storeId: string) => {
    if (!window.confirm("این فروشگاه و محصولات و تخفیف‌های وابسته حذف شوند؟")) {
      return;
    }

    updateCatalog((current) => {
      const productsToRemove = new Set(
        current.products
          .filter((product) => product.storeId === storeId)
          .map((product) => product.id),
      );

      return {
        ...current,
        stores: current.stores.filter((store) => store.id !== storeId),
        products: current.products.filter((product) => product.storeId !== storeId),
        deals: current.deals.filter(
          (deal) => deal.storeId !== storeId && !productsToRemove.has(deal.productId),
        ),
      };
    });

    startNewStore();
    startNewProduct();
    startNewDeal();
  };

  const saveProductDraft = () => {
    const id = productDraft.id.trim() || createId("product", productDraft.name);
    const selectedStore = productDraft.storeId || catalog?.stores[0]?.id || "";
    const nextProduct: AdminProduct = {
      ...productDraft,
      id,
      name: productDraft.name.trim(),
      price: toPositiveNumber(Number(productDraft.price)),
      discount: clampPercent(Number(productDraft.discount)),
      image: productDraft.image.trim() || "/images/fallback-image.svg",
      storeId: selectedStore,
      tag: productDraft.tag?.trim() || "",
      description: productDraft.description.trim(),
    };
    const previousId = selectedProductId;

    updateCatalog((current) => {
      const exists = previousId
        ? current.products.some((product) => product.id === previousId)
        : false;
      const products = exists
        ? current.products.map((product) =>
            product.id === previousId ? nextProduct : product,
          )
        : [nextProduct, ...current.products];
      const deals = previousId
        ? current.deals.map((deal) =>
            deal.productId === previousId
              ? { ...deal, productId: id, storeId: nextProduct.storeId }
              : deal,
          )
        : current.deals;

      return { ...current, products, deals };
    });

    setSelectedProductId(id);
    setProductDraft(nextProduct);
    setStatusMessage("محصول در پیش‌نویس پنل به‌روزرسانی شد.");
  };

  const deleteProduct = (productId: string) => {
    if (!window.confirm("این محصول و تخفیف‌های وابسته حذف شوند؟")) {
      return;
    }

    updateCatalog((current) => ({
      ...current,
      products: current.products.filter((product) => product.id !== productId),
      deals: current.deals.filter((deal) => deal.productId !== productId),
    }));

    startNewProduct();
    startNewDeal();
  };

  const saveDealDraft = () => {
    const linkedProduct = catalog?.products.find(
      (product) => product.id === dealDraft.productId,
    );
    const id = dealDraft.id.trim() || createId("deal", dealDraft.title || dealDraft.tag);
    const nextDeal: AdminDeal = {
      ...dealDraft,
      id,
      storeId: linkedProduct?.storeId || dealDraft.storeId,
      productId: dealDraft.productId,
      title: dealDraft.title.trim(),
      discount: clampPercent(Number(dealDraft.discount)),
      expiresInHours: Math.max(1, Math.round(Number(dealDraft.expiresInHours) || 1)),
      tag: dealDraft.tag.trim(),
    };
    const previousId = selectedDealId;

    updateCatalog((current) => {
      const exists = previousId
        ? current.deals.some((deal) => deal.id === previousId)
        : false;
      const deals = exists
        ? current.deals.map((deal) => (deal.id === previousId ? nextDeal : deal))
        : [nextDeal, ...current.deals];

      return { ...current, deals };
    });

    setSelectedDealId(id);
    setDealDraft(nextDeal);
    setStatusMessage("تخفیف در پیش‌نویس پنل به‌روزرسانی شد.");
  };

  const deleteDeal = (dealId: string) => {
    if (!window.confirm("این تخفیف حذف شود؟")) {
      return;
    }

    updateCatalog((current) => ({
      ...current,
      deals: current.deals.filter((deal) => deal.id !== dealId),
    }));

    startNewDeal();
  };

  const saveCatalog = async () => {
    if (!catalog) {
      return;
    }

    setSaveState("saving");
    setStatusMessage("در حال ذخیره‌سازی روی فایل‌های JSON...");

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(normalizeCatalog(catalog)),
      });
      const data = (await response.json()) as Partial<CatalogResponse> & {
        message?: string;
      };

      if (response.status === 401) {
        setAuthState("unauthenticated");
        setCatalog(null);
        throw new Error("برای ذخیره تغییرات باید دوباره وارد پنل شوید.");
      }

      if (!response.ok) {
        throw new Error(data.message || "ذخیره اطلاعات ممکن نشد.");
      }

      const savedCatalog = data as CatalogResponse;

      applyLoadedCatalog(savedCatalog);
      setLastSavedAt(savedCatalog.savedAt || new Date().toISOString());
      setSaveState("saved");
      setStatusMessage("ذخیره شد. فایل‌های JSON پروژه به‌روزرسانی شدند.");
    } catch (error) {
      setSaveState("error");
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "ورود انجام نشد.");
      }

      setPassword("");
      setAuthState("authenticated");
      await fetchCatalog();
    } catch (error) {
      setAuthState("unauthenticated");
      setSaveState("error");
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    if (
      isDirty &&
      !window.confirm("تغییرات ذخیره‌نشده دارید. بدون ذخیره از پنل خارج شوید؟")
    ) {
      return;
    }

    await fetch("/api/admin/login", {
      method: "DELETE",
      credentials: "same-origin",
    });
    setCatalog(null);
    setAuthState("unauthenticated");
    setPassword("");
    setStatusMessage("از پنل خارج شدید.");
  };

  const copyCatalogJson = async () => {
    if (!catalog) {
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(normalizeCatalog(catalog), null, 2));
    setStatusMessage("نسخه JSON کاتالوگ در کلیپ‌بورد کپی شد.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_42%,_#f8fafc_42%,_#eef2ff_100%)] px-4 py-6 text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                مسیر مستقیم: /Admin
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                پنل مدیریت همیلا سنتر
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                این صفحه داخل ناوبری اپ لینک نشده و فقط با وارد کردن آدرس مستقیم
                باز می‌شود. تغییرات را اول اینجا بسازید و در پایان روی فایل‌های
                JSON ذخیره کنید.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => void fetchCatalog()} variant="secondary">
                بارگذاری دوباره
              </ActionButton>
              <ActionButton
                onClick={() => void copyCatalogJson()}
                variant="ghost"
                disabled={!catalog}
              >
                کپی JSON
              </ActionButton>
              <ActionButton
                onClick={() => void saveCatalog()}
                disabled={!catalog || saveState === "saving"}
              >
                {saveState === "saving" ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </ActionButton>
              {authState === "authenticated" && (
                <ActionButton onClick={() => void logout()} variant="danger">
                  خروج
                </ActionButton>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-bold text-slate-500">{item.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {new Intl.NumberFormat("fa-IR").format(item.value)}
                </p>
              </div>
            ))}
          </div>

          {(statusMessage || lastSavedAt || isDirty) && (
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-7 ${
                saveState === "error"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {statusMessage || "آماده ویرایش"}
              {isDirty && " تغییرات ذخیره‌نشده دارید."}
              {lastSavedAt && !isDirty && (
                <span className="block text-xs text-emerald-700">
                  آخرین ذخیره: {new Date(lastSavedAt).toLocaleString("fa-IR")}
                </span>
              )}
            </div>
          )}
        </header>

        {authState === "unauthenticated" && !catalog && (
          <form
            onSubmit={handleLoginSubmit}
            className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-soft"
          >
            <h2 className="text-xl font-black text-slate-950">ورود به پنل ادمین</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              برای مدیریت فروشگاه‌ها و محصولات، اطلاعات ادمین را وارد کنید.
            </p>
            <Field
              label="نام کاربری"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              placeholder="Admin"
            />
            <Field
              label="رمز عبور"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <div className="mt-4 flex gap-2">
              <ActionButton type="submit" disabled={isLoggingIn} className="flex-1">
                {isLoggingIn ? "در حال ورود..." : "ورود"}
              </ActionButton>
            </div>
          </form>
        )}

        {isLoading && !catalog && authState !== "unauthenticated" && (
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 text-center text-sm font-bold text-slate-600 shadow-soft">
            در حال خواندن اطلاعات پنل...
          </div>
        )}

        {catalog && (
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="h-fit rounded-[2rem] border border-white/70 bg-white/90 p-3 shadow-soft backdrop-blur">
              <nav className="grid gap-2">
                <TabButton
                  active={activeTab === "stores"}
                  label="فروشگاه‌ها"
                  detail={`${catalog.stores.length} مورد`}
                  onClick={() => setActiveTab("stores")}
                />
                <TabButton
                  active={activeTab === "products"}
                  label="محصولات و قیمت‌ها"
                  detail={`${catalog.products.length} مورد`}
                  onClick={() => setActiveTab("products")}
                />
                <TabButton
                  active={activeTab === "deals"}
                  label="تخفیف‌ها"
                  detail={`${catalog.deals.length} مورد`}
                  onClick={() => setActiveTab("deals")}
                />
              </nav>

              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-xs font-bold text-white/60">نکته کوچک</p>
                <p className="mt-2 text-sm leading-7 text-white/85">
                  تا وقتی دکمه ذخیره را نزنید، تغییرات فقط پیش‌نویس همین صفحه
                  هستند.
                </p>
              </div>

              {authState === "authenticated" && (
                <ActionButton onClick={() => void logout()} variant="ghost" className="mt-3 w-full">
                  خروج از پنل
                </ActionButton>
              )}
            </aside>

            <section className="min-w-0">
              {activeTab === "stores" && (
                <StoresManager
                  catalog={catalog}
                  draft={storeDraft}
                  floorOptions={floorOptions}
                  categoryOptions={categoryOptions}
                  selectedId={selectedStoreId}
                  onDraftChange={setStoreDraft}
                  onSelect={selectStore}
                  onNew={startNewStore}
                  onSave={saveStoreDraft}
                  onDelete={deleteStore}
                />
              )}

              {activeTab === "products" && (
                <ProductsManager
                  catalog={catalog}
                  draft={productDraft}
                  selectedId={selectedProductId}
                  onDraftChange={setProductDraft}
                  onSelect={selectProduct}
                  onNew={startNewProduct}
                  onSave={saveProductDraft}
                  onDelete={deleteProduct}
                />
              )}

              {activeTab === "deals" && (
                <DealsManager
                  catalog={catalog}
                  draft={dealDraft}
                  filteredProducts={filteredDealProducts}
                  selectedId={selectedDealId}
                  onDraftChange={setDealDraft}
                  onSelect={selectDeal}
                  onNew={startNewDeal}
                  onSave={saveDealDraft}
                  onDelete={deleteDeal}
                />
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

interface StoresManagerProps {
  catalog: AdminCatalog;
  draft: AdminStore;
  selectedId: string | null;
  floorOptions: string[];
  categoryOptions: string[];
  onDraftChange: (draft: AdminStore) => void;
  onSelect: (store: AdminStore) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: (storeId: string) => void;
}

function StoresManager({
  catalog,
  draft,
  selectedId,
  floorOptions,
  categoryOptions,
  onDraftChange,
  onSelect,
  onNew,
  onSave,
  onDelete,
}: StoresManagerProps) {
  return (
    <ManagerShell
      title="مدیریت فروشگاه‌ها"
      description="نام، طبقه، دسته‌بندی، تصویر و توضیحات فروشگاه را اینجا تغییر دهید."
      actionLabel="فروشگاه جدید"
      onNew={onNew}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="grid gap-3">
          {catalog.stores.map((store) => (
            <ListCard
              key={store.id}
              active={selectedId === store.id}
              title={store.name}
              eyebrow={store.category}
              detail={`${store.floor} - ${store.locationHint || "بدون راهنما"}`}
              meta={`${store.productIds.length} محصول / ${store.dealIds.length} تخفیف`}
              onClick={() => onSelect(store)}
              onDelete={() => onDelete(store.id)}
            />
          ))}
        </div>

        <EditorCard title={selectedId ? "ویرایش فروشگاه" : "فروشگاه تازه"}>
          <Field
            label="شناسه"
            value={draft.id}
            onChange={(id) => onDraftChange({ ...draft, id })}
            placeholder="مثلاً coleen-store"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="نام فروشگاه"
              value={draft.name}
              onChange={(name) => onDraftChange({ ...draft, name })}
            />
            <Field
              label="برند"
              value={draft.brand}
              onChange={(brand) => onDraftChange({ ...draft, brand })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ComboField
              label="دسته‌بندی"
              value={draft.category}
              options={categoryOptions}
              onChange={(category) => onDraftChange({ ...draft, category })}
            />
            <ComboField
              label="طبقه"
              value={draft.floor}
              options={floorOptions}
              onChange={(floor) => onDraftChange({ ...draft, floor })}
            />
          </div>
          <Field
            label="آدرس تصویر فروشگاه"
            value={draft.heroImage}
            onChange={(heroImage) => onDraftChange({ ...draft, heroImage })}
            placeholder="/images/stores/example.jpg"
          />
          <Field
            label="راهنمای موقعیت"
            value={draft.locationHint}
            onChange={(locationHint) => onDraftChange({ ...draft, locationHint })}
          />
          <TextAreaField
            label="توضیحات"
            value={draft.description}
            onChange={(description) => onDraftChange({ ...draft, description })}
          />
          <ActionButton onClick={onSave} className="w-full">
            ثبت فروشگاه در پیش‌نویس
          </ActionButton>
        </EditorCard>
      </div>
    </ManagerShell>
  );
}

interface ProductsManagerProps {
  catalog: AdminCatalog;
  draft: AdminProduct;
  selectedId: string | null;
  onDraftChange: (draft: AdminProduct) => void;
  onSelect: (product: AdminProduct) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: (productId: string) => void;
}

function ProductsManager({
  catalog,
  draft,
  selectedId,
  onDraftChange,
  onSelect,
  onNew,
  onSave,
  onDelete,
}: ProductsManagerProps) {
  const isGoldDraft = isGoldProductTag(draft.tag);

  return (
    <ManagerShell
      title="مدیریت محصولات و قیمت‌ها"
      description="قیمت، درصد تخفیف، فروشگاه وابسته، تصویر و وضعیت محصول جدید را مدیریت کنید."
      actionLabel="محصول جدید"
      onNew={onNew}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="grid gap-3">
          {catalog.products.map((product) => (
            <ListCard
              key={product.id}
              active={selectedId === product.id}
              title={product.name}
              eyebrow={getStoreName(catalog.stores, product.storeId)}
              detail={getProductDetail(product)}
              meta={product.isNew ? "کالکشن جدید" : "معمولی"}
              onClick={() => onSelect(product)}
              onDelete={() => onDelete(product.id)}
            />
          ))}
        </div>

        <EditorCard title={selectedId ? "ویرایش محصول" : "محصول تازه"}>
          <Field
            label="شناسه"
            value={draft.id}
            onChange={(id) => onDraftChange({ ...draft, id })}
            placeholder="مثلاً coleen-4"
          />
          <Field
            label="نام محصول"
            value={draft.name}
            onChange={(name) => onDraftChange({ ...draft, name })}
          />
          <SelectField
            label="فروشگاه"
            value={draft.storeId}
            onChange={(storeId) => onDraftChange({ ...draft, storeId })}
            options={catalog.stores.map((store) => ({
              label: store.name,
              value: store.id,
            }))}
          />
          {isGoldDraft ? (
            <Field
              label="درصد تخفیف"
              value={draft.discount}
              onChange={(discount) =>
                onDraftChange({ ...draft, discount: clampPercent(Number(discount)) })
              }
              type="number"
              min={0}
              max={100}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="قیمت تومان"
                value={draft.price}
                onChange={(price) =>
                  onDraftChange({ ...draft, price: toPositiveNumber(Number(price)) })
                }
                type="number"
              />
              <Field
                label="درصد تخفیف"
                value={draft.discount}
                onChange={(discount) =>
                  onDraftChange({ ...draft, discount: clampPercent(Number(discount)) })
                }
                type="number"
                min={0}
                max={100}
              />
            </div>
          )}
          <Field
            label="آدرس تصویر محصول"
            value={draft.image}
            onChange={(image) => onDraftChange({ ...draft, image })}
            placeholder="/images/products/example.jpg"
          />
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            کالکشن جدید است؟
            <input
              type="checkbox"
              checked={draft.isNew}
              onChange={(event) =>
                onDraftChange({ ...draft, isNew: event.target.checked })
              }
              className="h-5 w-5 accent-slate-950"
            />
          </label>
          <TextAreaField
            label="توضیحات"
            value={draft.description}
            onChange={(description) => onDraftChange({ ...draft, description })}
          />
          <ActionButton onClick={onSave} className="w-full">
            ثبت محصول در پیش‌نویس
          </ActionButton>
        </EditorCard>
      </div>
    </ManagerShell>
  );
}

interface DealsManagerProps {
  catalog: AdminCatalog;
  draft: AdminDeal;
  filteredProducts: AdminProduct[];
  selectedId: string | null;
  onDraftChange: (draft: AdminDeal) => void;
  onSelect: (deal: AdminDeal) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: (dealId: string) => void;
}

function DealsManager({
  catalog,
  draft,
  filteredProducts,
  selectedId,
  onDraftChange,
  onSelect,
  onNew,
  onSave,
  onDelete,
}: DealsManagerProps) {
  const handleStoreChange = (storeId: string) => {
    const firstProduct = catalog.products.find((product) => product.storeId === storeId);

    onDraftChange({
      ...draft,
      storeId,
      productId: firstProduct?.id || "",
    });
  };

  return (
    <ManagerShell
      title="مدیریت تخفیف‌ها"
      description="پیشنهادهای لحظه‌ای، درصد تخفیف، محصول وابسته و زمان انقضا را تنظیم کنید."
      actionLabel="تخفیف جدید"
      onNew={onNew}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="grid gap-3">
          {catalog.deals.map((deal) => (
            <ListCard
              key={deal.id}
              active={selectedId === deal.id}
              title={deal.title || "تخفیف بدون عنوان"}
              eyebrow={getStoreName(catalog.stores, deal.storeId)}
              detail={`${getProductName(catalog.products, deal.productId)} - ${deal.discount}%`}
              meta={`${deal.expiresInHours} ساعت / ${deal.tag || "بدون تگ"}`}
              onClick={() => onSelect(deal)}
              onDelete={() => onDelete(deal.id)}
            />
          ))}
        </div>

        <EditorCard title={selectedId ? "ویرایش تخفیف" : "تخفیف تازه"}>
          <Field
            label="شناسه"
            value={draft.id}
            onChange={(id) => onDraftChange({ ...draft, id })}
            placeholder="مثلاً coleen-deal-3"
          />
          <Field
            label="عنوان"
            value={draft.title}
            onChange={(title) => onDraftChange({ ...draft, title })}
          />
          <SelectField
            label="فروشگاه"
            value={draft.storeId}
            onChange={handleStoreChange}
            options={catalog.stores.map((store) => ({
              label: store.name,
              value: store.id,
            }))}
          />
          <SelectField
            label="محصول"
            value={draft.productId}
            onChange={(productId) => {
              const product = catalog.products.find((item) => item.id === productId);

              onDraftChange({
                ...draft,
                productId,
                storeId: product?.storeId || draft.storeId,
              });
            }}
            options={filteredProducts.map((product) => ({
              label: product.name,
              value: product.id,
            }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="درصد تخفیف"
              value={draft.discount}
              onChange={(discount) =>
                onDraftChange({ ...draft, discount: clampPercent(Number(discount)) })
              }
              type="number"
              min={0}
              max={100}
            />
            <Field
              label="اعتبار به ساعت"
              value={draft.expiresInHours}
              onChange={(expiresInHours) =>
                onDraftChange({
                  ...draft,
                  expiresInHours: Math.max(1, Math.round(Number(expiresInHours) || 1)),
                })
              }
              type="number"
              min={1}
            />
          </div>
          <Field
            label="تگ"
            value={draft.tag}
            onChange={(tag) => onDraftChange({ ...draft, tag })}
            placeholder="مثلاً پرفروش"
          />
          <ActionButton onClick={onSave} className="w-full">
            ثبت تخفیف در پیش‌نویس
          </ActionButton>
        </EditorCard>
      </div>
    </ManagerShell>
  );
}

interface ManagerShellProps {
  title: string;
  description: string;
  actionLabel: string;
  onNew: () => void;
  children: ReactNode;
}

function ManagerShell({
  title,
  description,
  actionLabel,
  onNew,
  children,
}: ManagerShellProps) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <ActionButton onClick={onNew} variant="secondary">
          {actionLabel}
        </ActionButton>
      </div>
      {children}
    </div>
  );
}

interface ListCardProps {
  active: boolean;
  title: string;
  eyebrow: string;
  detail: string;
  meta: string;
  onClick: () => void;
  onDelete: () => void;
}

function ListCard({
  active,
  title,
  eyebrow,
  detail,
  meta,
  onClick,
  onDelete,
}: ListCardProps) {
  return (
    <article
      className={`rounded-3xl border p-3 transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-soft"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-right">
          <p
            className={`text-xs font-bold ${
              active ? "text-white/60" : "text-slate-500"
            }`}
          >
            {eyebrow}
          </p>
          <h3 className="mt-1 truncate text-lg font-black">{title || "بدون نام"}</h3>
          <p
            className={`mt-1 truncate text-xs ${
              active ? "text-white/70" : "text-slate-500"
            }`}
          >
            {detail}
          </p>
        </button>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {meta}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              active
                ? "bg-rose-400 text-white hover:bg-rose-300"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            حذف
          </button>
        </div>
      </div>
    </article>
  );
}

function EditorCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
}

function Field({ label, value, onChange, className = "", ...props }: FieldProps) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900"
      />
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextAreaField({ label, value, onChange }: TextAreaFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
      >
        <option value="">انتخاب کنید</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ComboFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function ComboField({ label, value, options, onChange }: ComboFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={`${label}-options`}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
      />
      <datalist id={`${label}-options`}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}

function TabButton({ active, label, detail, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-right transition ${
        active
          ? "bg-slate-950 text-white shadow-soft"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="block text-sm font-black">{label}</span>
      <span className={`mt-1 block text-xs ${active ? "text-white/55" : "text-slate-400"}`}>
        {detail}
      </span>
    </button>
  );
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

function ActionButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  const variantClass = {
    primary: "bg-slate-950 text-white hover:bg-slate-700 disabled:bg-slate-300",
    secondary: "bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-300",
    ghost: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:text-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300",
  }[variant];

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-extrabold transition disabled:cursor-not-allowed ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}
