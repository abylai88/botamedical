// Catalog categories linked from the menu, home page and footer. The value is the stored (Russian) category name.
export const COATS_CATEGORY = 'Халаты';
export const SCRUBS_CATEGORY = 'Хирургические костюмы';
export const categoryHref = (category: string) => `/catalog?category=${encodeURIComponent(category)}`;
