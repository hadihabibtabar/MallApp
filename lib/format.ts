const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const GOLD_PRODUCT_TAG = "طلا";

export function toPersianDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (digit) => persianDigits[Number(digit)]);
}

export function isGoldProductTag(tag: string | null | undefined): boolean {
  return tag?.trim() === GOLD_PRODUCT_TAG;
}

export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("fa-IR").format(amount);
  return `${formatted} تومان`;
}

export function formatRemainingTime(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return "مهلت این تخفیف تمام شده";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `فقط تا ${toPersianDigits(minutes)} دقیقه دیگر`;
  }

  if (minutes === 0) {
    return `فقط تا ${toPersianDigits(hours)} ساعت دیگر`;
  }

  return `فقط تا ${toPersianDigits(hours)} ساعت و ${toPersianDigits(minutes)} دقیقه دیگر`;
}

export function discountedPrice(price: number, discount: number | null): number {
  if (!discount) {
    return price;
  }

  return Math.round(price * ((100 - discount) / 100));
}
