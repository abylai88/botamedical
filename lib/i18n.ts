// Storefront copy in Russian and English. The admin panel stays in Russian.
export type Locale = 'ru' | 'en';
export const LOCALES: Locale[] = ['ru', 'en'];
export const LOCALE_COOKIE = 'bota_lang';
export function toLocale(value?: string | null): Locale { return value === 'en' ? 'en' : 'ru'; }

const ru = {
  meta: { title: 'BOTA — медицинская одежда', description: 'Медицинские халаты и комплекты BOTA.' },
  announce: 'Форма для всего отделения — соберите заказ на команду в одной корзине',
  announceDemo: 'Онлайн-заказы на сайте временно не принимаются',
  nav: { catalog: 'Каталог', coats: 'Халаты', looks: 'Образы', about: 'О бренде', info: 'Заказ и контакты', home: 'BOTA — главная', main: 'Главная навигация', menu: 'Меню', close: 'Закрыть', cart: (n: number) => `Корзина, товаров: ${n}`, language: 'Язык сайта' },
  footer: { infoTitle: 'О компании', infoText: 'Здесь будет информация о BOTA: адрес шоурума, телефон, график работы и реквизиты.\nЭто демонстрационный текст — замените его в панели управления, вкладка «Сайт».', contactsTitle: 'Информация', tagline: 'Медицинская одежда для тех, кто работает в движении.', nav: 'Навигация в подвале', privacy: 'Данные и конфиденциальность', admin: 'Управление магазином', note: 'Оплата на сайте не производится. Наличие, размер и сроки подтверждает магазин после оформления заказа.' },
  home: {
    kicker: 'Медицинская одежда BOTA',
    title: 'Форма,\nв которой\nвас узнают.',
    lead: 'Халаты и комплекты для врачей, медсестёр и всех, кто проводит смену на ногах.',
    shopCoats: 'Смотреть халаты', shopLooks: 'Смотреть образы',
    lineupAlt: 'Медики в форме BOTA',
    categories: 'Категории', categoryCta: 'Перейти',
    coatsTile: 'Белый халат', coatsText: 'Классика приёма и обхода.',
    looksTile: 'Образы', looksText: 'Халат и комплект — готовое сочетание на смену.',
    popular: 'Популярные модели', all: 'Весь каталог',
    teamKicker: 'Для клиник и отделений',
    teamTitle: 'Одна форма\nдля всей команды.',
    teamText: 'Добавьте нужные модели в корзину — до 20 единиц каждой — и укажите размеры сотрудников в комментарии к заказу.',
    teamCta: 'Собрать заказ',
    reviews: 'Отзывы', reviewsLead: 'Что говорят о форме BOTA',
    brandKicker: 'О бренде',
    brandTitle: 'За формой\nвсегда человек.',
    brandText: 'Рабочий день начинается с вас. С вашего движения, внимания, отношения к делу. Одежда становится частью этого ритма.',
    brandCta: 'Найти свой образ',
    brandAlt: 'Образ BOTA: белые халаты и тёмно-синие комплекты',
    empty: 'Коллекция готовится. Загляните позже.',
  },
  card: { open: (name: string) => `Открыть ${name}`, quick: 'Подробнее', sizes: (s: string) => `Размеры: ${s}`, sizesSoon: 'Размеры уточняются' },
  catalog: {
    title: 'Каталог', heading: 'Медицинская одежда', lead: 'Халаты и образы BOTA.', home: 'Главная',
    search: 'Поиск', searchPlaceholder: 'Название модели…', category: 'Категория', allCategories: 'Все категории',
    sort: 'Порядок', sortDefault: 'По умолчанию', sortAsc: 'Сначала дешевле', sortDesc: 'Сначала дороже', apply: 'Показать',
    found: (n: number) => `Найдено моделей: ${n}`, reset: 'Сбросить фильтры',
    emptyTitle: 'Пока ничего не нашлось', emptyText: 'Попробуйте другое название или откройте все категории.', emptyCta: 'Все модели',
  },
  product: {
    notFound: 'Товар не найден', important: 'Что важно знать',
    importantText: 'Наличие и сроки подтверждает магазин после оформления заказа. Если нужного размера нет в списке, укажите его в комментарии к заказу.',
    photos: 'Фотографии и характеристики',
    photosMany: 'Выберите снимок под основным изображением.', photosOne: 'Нажмите на фото, чтобы рассмотреть детали.',
    specs: 'Состав ткани и таблица размеров появятся в карточке.',
    ordering: 'Оформление заказа', orderingText: 'Оплата на сайте не производится: магазин подтверждает заказ и согласует оплату и доставку.', more: 'Подробнее',
  },
  purchase: {
    size: 'Размер', chooseSize: 'Выберите размер', color: 'Цвет', chooseColor: 'Выберите цвет',
    noSizes: 'Размер можно указать в комментарии к заказу.', noColors: 'Цвет — как на фото.',
    quantity: 'Количество', add: 'В корзину', added: 'Товар добавлен в корзину.', failed: 'Не удалось добавить товар: проверьте лимит корзины.', goCart: 'Перейти в корзину',
    limit: 'Лимит: 30 позиций и 20 единиц каждого варианта.', storage: 'Хранилище браузера недоступно: корзина сохранится только до закрытия страницы.', saveFailed: 'Не удалось сохранить корзину в браузере.',
  },
  gallery: { zoom: (n: string) => `Увеличить фотографию: ${n}`, hint: 'Рассмотреть ближе', view: (i: number) => `Ракурс ${i}`, enlarge: 'Увеличить ×2', whole: 'Весь снимок', close: 'Закрыть ×', closeLabel: 'Закрыть увеличенное фото', scroll: 'Увеличенное фото: прокручивайте для просмотра деталей', detail: (n: string) => `${n}, подробный вид`, count: (i: number, n: number) => `Фото ${i} из ${n}.`, single: 'Дополнительные ракурсы появятся позже.', none: (n: string) => `Нет фотографии: ${n}`, soon: 'Фотография появится позже' },
  comments: {
    title: 'Отзывы', none: 'Пока нет', first: 'Станьте первым, кто поделится впечатлением об этой модели.', name: 'Ваше имя', body: 'Отзыв', placeholder: 'Посадка, размер, впечатления от ткани…',
    rules: 'Имя и текст увидят все посетители. Ссылки не публикуются. Магазин может скрыть отзыв.', send: 'Оставить отзыв', sending: 'Отправляем…', thanks: 'Спасибо! Отзыв опубликован.', failed: 'Не удалось отправить отзыв.',
    closed: 'Сейчас новые комментарии не принимаются.', staff: 'BOTA', trap: 'Сайт',
  },
  cart: {
    title: 'Корзина', kicker: 'Ваш выбор', loading: 'Загружаем корзину…', emptyTitle: 'Здесь будет ваш выбор', emptyText: 'Рассмотрите модели и добавьте понравившиеся в корзину.', open: 'Открыть каталог',
    removed: 'Удалённый товар', unavailable: 'Товар недоступен', noVariants: 'Варианты не указаны', removeToContinue: 'Удалите позицию, чтобы продолжить', remove: 'Удалить', removeLabel: (n: string) => `Удалить ${n} из корзины`,
    quantity: 'Количество', quantityLabel: (n: string) => `Количество: ${n}`, item: 'товар', summary: 'Ваш заказ', units: 'Единиц', total: 'Итого',
    payNote: 'Оплата на сайте не производится — магазин согласует её после подтверждения заказа.', checkout: 'Оформить заказ', checkoutClosed: 'Об оформлении заказа',
    changed: 'Варианты или доступность изменились. Удалите недоступные позиции и добавьте нужные товары заново.', continue: 'Продолжить выбор',
    priceNote: 'В корзине показаны текущие цены каталога. Сервер повторно проверит их при оформлении.', closedNote: 'Онлайн-заказы и контактные данные на этом сайте пока не принимаются.',
  },
  checkout: {
    title: 'Оформление заказа', kicker: 'Последний шаг', closedTitle: 'Пока только знакомство', closedText: 'Каталог и корзина доступны, но онлайн-заказы и контактные данные здесь пока не принимаются.', back: 'Вернуться в корзину',
    contacts: 'Контактные данные', contactsText: 'Магазин свяжется с вами, чтобы подтвердить размеры, оплату и доставку.',
    name: 'Имя *', phone: 'Телефон *', email: 'Электронная почта (необязательно)', note: 'Комментарий (размеры для команды, пожелания)',
    consent: 'Согласен на обработку указанных данных для оформления заказа.', howStored: 'Как хранятся данные',
    errPhone: 'Укажите номер: минимум 7 цифр, допустимы +, пробелы, скобки и дефисы.', errName: 'Укажите имя от 2 до 100 символов.', errConsent: 'Подтвердите согласие на обработку данных.', errValue: 'Проверьте значение.',
    network: 'Нет связи с сервером. Повторите попытку.', openCart: 'Открыть корзину', saving: 'Отправляем…', submit: 'Оформить заказ', submitNote: 'Оплата при оформлении не списывается.',
    summary: 'Состав заказа', pcs: 'шт.', deliveryNote: 'Стоимость доставки рассчитывается при подтверждении.', editCart: 'Изменить корзину',
    doneTitle: 'Заказ оформлен', doneNumber: 'Номер', doneText: 'Заказ передан в магазин. Оплата не списывалась.', doneBack: 'Вернуться в каталог',
    emptyTitle: 'Корзина пока пуста', emptyCta: 'Выбрать модель', staleTitle: 'Корзина требует обновления', staleText: 'Доступность или варианты товара изменились.',
  },
  info: {
    title: 'Заказ и контакты', home: 'Главная', crumb: 'Информация', lead: 'Как оформить заказ в BOTA.', leadClosed: 'Сейчас сайт работает как витрина: онлайн-заказы временно не принимаются.',
    howTitle: 'Как оформить заказ', how: 'Выберите модель, добавьте её в корзину и заполните контактные данные. Магазин получит заказ и свяжется с вами для подтверждения.', howClosed: 'Выберите модель и добавьте её в корзину. Приём заказов и контактных данных на сайте пока отключён.',
    payTitle: 'Оплата и доставка', pay: 'Оплата на сайте не производится. Способ оплаты, доставка, сроки и условия возврата согласуются при подтверждении заказа.',
    teamTitle: 'Заказ для команды', team: 'Добавьте до 20 единиц каждой модели и перечислите размеры сотрудников в комментарии к заказу.',
    contactsTitle: 'Контакты', contacts: 'Телефон, электронная почта и социальные сети BOTA появятся в этом разделе.', cta: 'Открыть каталог',
  },
  privacy: {
    title: 'Данные и конфиденциальность', lead: 'Как сайт BOTA обращается с вашими данными.',
    cartTitle: 'Корзина', cart: 'В браузере сохраняются только идентификаторы товаров, выбранные варианты и количество. Имя, телефон и данные заказа в хранилище браузера не записываются. Выбранный язык хранится в cookie.',
    ordersTitle: 'Заказы', orders: 'Имя, телефон, необязательная почта и комментарий хранятся в зашифрованном виде на сервере магазина. Доступ к ним есть только у администратора. Внешним почтовым, платёжным или аналитическим сервисам эти данные не передаются.',
    commentsTitle: 'Отзывы', comments: 'Имя и текст отзыва показываются всем посетителям страницы товара. Почта и телефон не запрашиваются. Магазин может скрыть или удалить отзыв.',
    sessionTitle: 'Вход администратора', session: 'Для входа используется служебный cookie, недоступный JavaScript. Сессия действует до восьми часов и прекращается при выходе.',
    closedTitle: 'Режим витрины', closed: 'Каталог и корзина доступны без регистрации. Административная панель и приём заказов отключены. Хостинг может обрабатывать технические журналы запросов.',
    operatorTitle: 'Оператор данных', operator: 'Сведения об операторе данных, сроках хранения и порядке обращений будут опубликованы на этой странице.',
  },
  notFound: { title: 'Страница не найдена', text: 'Возможно, товар был удалён или адрес изменился.', cta: 'Открыть каталог' },
  error: { title: 'Не удалось загрузить страницу', text: 'Попробуйте ещё раз через несколько секунд.', retry: 'Повторить' },
};

export type Dictionary = typeof ru;

const en: Dictionary = {
  meta: { title: 'BOTA — medical apparel', description: 'BOTA medical lab coats and uniform looks.' },
  announce: 'Uniforms for the whole department — build your team order in one cart',
  announceDemo: 'Online orders are temporarily unavailable',
  nav: { catalog: 'Shop', coats: 'Lab coats', looks: 'Looks', about: 'About', info: 'Ordering & contact', home: 'BOTA — home', main: 'Main navigation', menu: 'Menu', close: 'Close', cart: (n: number) => `Cart, items: ${n}`, language: 'Site language' },
  footer: { infoTitle: 'About the company', infoText: 'Information about BOTA will appear here: showroom address, phone, opening hours and company details.\nThis is placeholder text — replace it in the admin panel, “Site” tab.', contactsTitle: 'Information', tagline: 'Medical apparel for people who work on the move.', nav: 'Footer navigation', privacy: 'Data & privacy', admin: 'Store admin', note: 'No payment is taken on the site. The store confirms availability, size and timing after you place an order.' },
  home: {
    kicker: 'BOTA medical apparel',
    title: 'The uniform\nthey know you by.',
    lead: 'Lab coats and uniform looks for doctors, nurses and everyone who spends the shift on their feet.',
    shopCoats: 'Shop lab coats', shopLooks: 'Shop looks',
    lineupAlt: 'Medical professionals wearing BOTA',
    categories: 'Categories', categoryCta: 'Explore',
    coatsTile: 'White lab coat', coatsText: 'The classic for rounds and appointments.',
    looksTile: 'Looks', looksText: 'Coat and set — a ready combination for the shift.',
    popular: 'Popular styles', all: 'View all',
    teamKicker: 'For clinics and departments',
    teamTitle: 'One uniform\nfor the whole team.',
    teamText: 'Add the styles you need to the cart — up to 20 of each — and list your team’s sizes in the order comment.',
    teamCta: 'Build an order',
    reviews: 'Reviews', reviewsLead: 'What people say about BOTA',
    brandKicker: 'About BOTA',
    brandTitle: 'Behind every uniform\nis a person.',
    brandText: 'Your working day starts with you — your movement, your attention, your care. Clothing becomes part of that rhythm.',
    brandCta: 'Find your look',
    brandAlt: 'BOTA look: white lab coats and navy sets',
    empty: 'The collection is on its way. Check back soon.',
  },
  card: { open: (name: string) => `Open ${name}`, quick: 'View', sizes: (s: string) => `Sizes: ${s}`, sizesSoon: 'Sizes to be confirmed' },
  catalog: {
    title: 'Shop', heading: 'Medical apparel', lead: 'BOTA lab coats and looks.', home: 'Home',
    search: 'Search', searchPlaceholder: 'Style name…', category: 'Category', allCategories: 'All categories',
    sort: 'Sort', sortDefault: 'Featured', sortAsc: 'Price: low to high', sortDesc: 'Price: high to low', apply: 'Apply',
    found: (n: number) => `Styles found: ${n}`, reset: 'Clear filters',
    emptyTitle: 'Nothing found yet', emptyText: 'Try another name or browse all categories.', emptyCta: 'All styles',
  },
  product: {
    notFound: 'Product not found', important: 'Good to know',
    importantText: 'The store confirms availability and timing after you order. If your size is not listed, add it to the order comment.',
    photos: 'Photos & details',
    photosMany: 'Choose a view below the main image.', photosOne: 'Tap the photo to see the details.',
    specs: 'Fabric composition and the size chart will be added to this page.',
    ordering: 'Ordering', orderingText: 'No payment is taken on the site: the store confirms your order and arranges payment and delivery.', more: 'Learn more',
  },
  purchase: {
    size: 'Size', chooseSize: 'Choose a size', color: 'Colour', chooseColor: 'Choose a colour',
    noSizes: 'You can specify your size in the order comment.', noColors: 'Colour as shown.',
    quantity: 'Quantity', add: 'Add to cart', added: 'Added to your cart.', failed: 'Could not add the item: check the cart limit.', goCart: 'Go to cart',
    limit: 'Limit: 30 lines and 20 units of each option.', storage: 'Browser storage is unavailable: the cart lasts until you close the page.', saveFailed: 'Could not save the cart in your browser.',
  },
  gallery: { zoom: (n: string) => `Enlarge photo: ${n}`, hint: 'Take a closer look', view: (i: number) => `View ${i}`, enlarge: 'Zoom ×2', whole: 'Full photo', close: 'Close ×', closeLabel: 'Close enlarged photo', scroll: 'Enlarged photo: scroll to explore details', detail: (n: string) => `${n}, detailed view`, count: (i: number, n: number) => `Photo ${i} of ${n}.`, single: 'More views coming soon.', none: (n: string) => `No photo: ${n}`, soon: 'Photo coming soon' },
  comments: {
    title: 'Reviews', none: 'None yet', first: 'Be the first to share your impression of this style.', name: 'Your name', body: 'Review', placeholder: 'Fit, size, how the fabric feels…',
    rules: 'Your name and text are visible to everyone. Links are not published. The store may hide a review.', send: 'Post review', sending: 'Sending…', thanks: 'Thank you! Your review is live.', failed: 'Could not send the review.',
    closed: 'New reviews are not being accepted right now.', staff: 'BOTA', trap: 'Website',
  },
  cart: {
    title: 'Cart', kicker: 'Your selection', loading: 'Loading your cart…', emptyTitle: 'Your cart is empty', emptyText: 'Browse the styles and add your favourites to the cart.', open: 'Go to shop',
    removed: 'Removed product', unavailable: 'Product unavailable', noVariants: 'No options selected', removeToContinue: 'Remove this line to continue', remove: 'Remove', removeLabel: (n: string) => `Remove ${n} from cart`,
    quantity: 'Quantity', quantityLabel: (n: string) => `Quantity: ${n}`, item: 'item', summary: 'Your order', units: 'Units', total: 'Total',
    payNote: 'No payment is taken on the site — the store arranges it after confirming your order.', checkout: 'Check out', checkoutClosed: 'About ordering',
    changed: 'Options or availability have changed. Remove unavailable lines and add the products again.', continue: 'Keep shopping',
    priceNote: 'The cart shows current catalogue prices. The server checks them again at checkout.', closedNote: 'Online orders and contact details are not accepted on this site yet.',
  },
  checkout: {
    title: 'Checkout', kicker: 'Final step', closedTitle: 'Just browsing for now', closedText: 'The shop and cart are available, but online orders and contact details are not accepted here yet.', back: 'Back to cart',
    contacts: 'Contact details', contactsText: 'The store will contact you to confirm sizes, payment and delivery.',
    name: 'Name *', phone: 'Phone *', email: 'Email (optional)', note: 'Comment (team sizes, requests)',
    consent: 'I agree to the processing of these details to place my order.', howStored: 'How data is stored',
    errPhone: 'Enter a number with at least 7 digits; +, spaces, brackets and hyphens are allowed.', errName: 'Enter a name of 2 to 100 characters.', errConsent: 'Please confirm your consent to data processing.', errValue: 'Please check this value.',
    network: 'No connection to the server. Please try again.', openCart: 'Open cart', saving: 'Sending…', submit: 'Place order', submitNote: 'No payment is charged when you place the order.',
    summary: 'Order summary', pcs: 'pcs', deliveryNote: 'Delivery cost is calculated on confirmation.', editCart: 'Edit cart',
    doneTitle: 'Order placed', doneNumber: 'Number', doneText: 'Your order has been sent to the store. No payment was taken.', doneBack: 'Back to shop',
    emptyTitle: 'Your cart is empty', emptyCta: 'Choose a style', staleTitle: 'Your cart needs updating', staleText: 'Product availability or options have changed.',
  },
  info: {
    title: 'Ordering & contact', home: 'Home', crumb: 'Information', lead: 'How to order from BOTA.', leadClosed: 'The site is currently a showcase: online orders are temporarily unavailable.',
    howTitle: 'How to order', how: 'Choose a style, add it to the cart and fill in your contact details. The store receives the order and contacts you to confirm it.', howClosed: 'Choose a style and add it to the cart. Orders and contact details are not accepted on the site yet.',
    payTitle: 'Payment & delivery', pay: 'No payment is taken on the site. Payment method, delivery, timing and returns are agreed when the order is confirmed.',
    teamTitle: 'Team orders', team: 'Add up to 20 units of each style and list your team’s sizes in the order comment.',
    contactsTitle: 'Contact', contacts: 'BOTA phone, email and social media will appear in this section.', cta: 'Go to shop',
  },
  privacy: {
    title: 'Data & privacy', lead: 'How the BOTA website handles your data.',
    cartTitle: 'Cart', cart: 'Your browser stores only product IDs, selected options and quantities. Your name, phone and order details are never written to browser storage. Your language choice is kept in a cookie.',
    ordersTitle: 'Orders', orders: 'Name, phone, optional email and comment are stored encrypted on the store’s server and are accessible only to the administrator. They are not shared with external email, payment or analytics services.',
    commentsTitle: 'Reviews', comments: 'Your name and review text are shown to all visitors of the product page. Email and phone are never requested. The store may hide or delete a review.',
    sessionTitle: 'Admin sign-in', session: 'Sign-in uses an HTTP-only cookie that JavaScript cannot read. A session lasts up to eight hours and ends when you sign out.',
    closedTitle: 'Showcase mode', closed: 'The shop and cart work without registration. The admin panel and order intake are disabled. The host may process technical request logs.',
    operatorTitle: 'Data controller', operator: 'Details about the data controller, retention periods and how to make requests will be published on this page.',
  },
  notFound: { title: 'Page not found', text: 'The product may have been removed or the address has changed.', cta: 'Go to shop' },
  error: { title: 'The page could not be loaded', text: 'Please try again in a few seconds.', retry: 'Try again' },
};

export const dictionaries: Record<Locale, Dictionary> = { ru, en };

// Prices are stored in tiyn (1/100 of a tenge) and shown in Kazakhstani tenge.
export function money(cents: number, locale: Locale = 'ru') {
  const value = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ru-RU', { maximumFractionDigits: 2 }).format(cents / 100);
  return `${value} ₸`;
}

type Localizable = { name: string; description: string; category: string; nameEn?: string; descriptionEn?: string; categoryEn?: string };
export function localized(product: Localizable, locale: Locale) {
  if (locale === 'ru') return { name: product.name, description: product.description, category: product.category };
  return { name: product.nameEn || product.name, description: product.descriptionEn || product.description, category: product.categoryEn || product.category };
}
