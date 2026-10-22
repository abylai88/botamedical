// Storefront copy in Russian and English. The admin panel stays in Russian.
export type Locale = 'ru' | 'en';
export const LOCALES: Locale[] = ['ru', 'en'];
export const LOCALE_COOKIE = 'bota_lang';
export function toLocale(value?: string | null): Locale { return value === 'en' ? 'en' : 'ru'; }
// Edition of the privacy policy. Saved with every order next to the time of consent; change it when the policy text changes.
export const PRIVACY_VERSION = '2026-10-22';
// A policy section; "orders" sections apply only while the site takes orders, "demo" ones only in the public showcase.
type PrivacySection = { title: string; text: string[]; only?: 'orders' | 'demo' };

const ru = {
  meta: { title: 'BOTA — медицинская одежда', description: 'Медицинские халаты и комплекты BOTA.' },
  announce: 'Форма для всего отделения — соберите заказ на команду в одной корзине',
  announceDemo: 'Онлайн-заказы на сайте временно не принимаются',
  nav: { catalog: 'Каталог', coats: 'Халаты', looks: 'Образы', about: 'О бренде', info: 'Заказ и контакты', home: 'BOTA — главная', main: 'Главная навигация', menu: 'Меню', close: 'Закрыть', cart: (n: number) => `Корзина, товаров: ${n}`, language: 'Язык сайта' },
  footer: { infoTitle: 'О компании', infoText: 'Здесь будет информация о BOTA: адрес шоурума, телефон, график работы и реквизиты.\nЭто демонстрационный текст — замените его в панели управления, вкладка «Сайт».', contactsTitle: 'Информация', tagline: 'Медицинская одежда для тех, кто работает в движении.', nav: 'Навигация в подвале', privacy: 'Политика конфиденциальности', admin: 'Управление магазином', note: 'Оплата на сайте не производится. Наличие, размер и сроки подтверждает магазин после оформления заказа.' },
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
    consent: 'Согласен на сбор и обработку персональных данных в соответствии с', policyLink: 'политикой конфиденциальности',
    errPhone: 'Укажите номер: минимум 7 цифр, допустимы +, пробелы, скобки и дефисы.', errName: 'Укажите имя от 2 до 100 символов.', errConsent: 'Без согласия на сбор и обработку персональных данных заказ не отправить.', errValue: 'Проверьте значение.',
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
    title: 'Политика конфиденциальности', lead: 'Как BOTA собирает, использует и хранит персональные данные покупателей сайта.', updated: 'Редакция от 22 октября 2026 г.',
    sections: [
      { title: 'Кто обрабатывает данные', text: ['Оператор персональных данных: [ЗАПОЛНИТЬ: название компании или ИП, БИН/ИИН].', 'Адрес: [ЗАПОЛНИТЬ].', 'Контакты: WhatsApp [ЗАПОЛНИТЬ: номер], электронная почта [ЗАПОЛНИТЬ].'] },
      { title: 'Какие данные мы собираем', only: 'orders', text: ['При оформлении заказа: имя, номер телефона, адрес доставки (если вы указали его в комментарии или сообщили нам при подтверждении), состав заказа — товары, размеры, цвета, количество и сумма. Электронная почта и комментарий — по желанию.', 'Вместе с заказом сохраняются дата и время вашего согласия на обработку персональных данных.', 'Для защиты от спама сайт временно учитывает IP-адрес отправителя в обезличенном виде. Он не сохраняется в заказе и удаляется автоматически.'] },
      { title: 'Зачем мы их используем', only: 'orders', text: ['Чтобы выполнить заказ: подтвердить наличие и размер, договориться об оплате и доставке.', 'Чтобы связаться с вами по этому заказу — по телефону, в WhatsApp или по электронной почте.', 'Мы не делаем рекламных рассылок по этим данным, не продаём их и не передаём третьим лицам, кроме службы доставки (только то, что нужно для доставки) и случаев, прямо предусмотренных законодательством Республики Казахстан.'] },
      { title: 'Где хранятся данные', only: 'orders', text: ['Данные хранятся на сервере, расположенном на территории Республики Казахстан.', 'Контакты в заказах хранятся в зашифрованном виде, доступ к ним есть только у администратора магазина. Резервные копии тоже зашифрованы и хранятся в Казахстане.', 'Внешним почтовым, платёжным и аналитическим сервисам данные не передаются.'] },
      { title: 'Сколько хранятся данные', only: 'orders', text: ['Данные заказа хранятся 3 года после его выполнения — для учёта, гарантийных вопросов и повторных заказов, — затем удаляются.', 'Заказы, которые система приняла за спам, удаляются автоматически через 30 дней.', 'Зашифрованные резервные копии хранятся не дольше 30 дней.'] },
      { title: 'Как узнать, исправить или удалить свои данные', only: 'orders', text: ['Вы можете узнать, какие ваши данные мы храним, исправить их, отозвать согласие или попросить удалить их.', 'Напишите нам в WhatsApp: [ЗАПОЛНИТЬ: номер]. Укажите имя и номер телефона, с которого оформляли заказ.', 'Мы удалим данные из базы сайта; из резервных копий они исчезнут в течение 30 дней. Если закон обязывает хранить какие-то сведения дольше (например, для бухгалтерского учёта), они удаляются по окончании этого срока.'] },
      { title: 'Корзина и cookie', text: ['Корзина хранится только в вашем браузере: идентификаторы товаров, выбранные варианты и количество. Имя, телефон и данные заказа туда не записываются.', 'Cookie используются только для выбранного языка и для входа администратора магазина (служебный cookie, недоступный JavaScript, действует до восьми часов). Рекламных и аналитических cookie нет.'] },
      { title: 'Отзывы', only: 'orders', text: ['Имя и текст отзыва видны всем посетителям страницы товара. Почта и телефон не запрашиваются. Магазин может скрыть или удалить отзыв, в том числе по вашей просьбе.'] },
      { title: 'Режим витрины', only: 'demo', text: ['Каталог и корзина доступны без регистрации. Административная панель и приём заказов отключены, персональные данные на сайте не собираются. Хостинг может обрабатывать технические журналы запросов.'] },
      { title: 'Изменения политики', text: ['Мы можем обновлять эту политику. Действующая редакция всегда опубликована на этой странице, дата редакции указана вверху.'] },
    ] as PrivacySection[],
    legal: 'Черновик: текст нужно проверить у юриста перед началом приёма заказов.',
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
  footer: { infoTitle: 'About the company', infoText: 'Information about BOTA will appear here: showroom address, phone, opening hours and company details.\nThis is placeholder text — replace it in the admin panel, “Site” tab.', contactsTitle: 'Information', tagline: 'Medical apparel for people who work on the move.', nav: 'Footer navigation', privacy: 'Privacy policy', admin: 'Store admin', note: 'No payment is taken on the site. The store confirms availability, size and timing after you place an order.' },
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
    consent: 'I agree to the collection and processing of my personal data under the', policyLink: 'privacy policy',
    errPhone: 'Enter a number with at least 7 digits; +, spaces, brackets and hyphens are allowed.', errName: 'Enter a name of 2 to 100 characters.', errConsent: 'We cannot send the order without your consent to the collection and processing of personal data.', errValue: 'Please check this value.',
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
    title: 'Privacy policy', lead: 'How BOTA collects, uses and stores the personal data of website customers.', updated: 'Version of 22 October 2026',
    sections: [
      { title: 'Who processes the data', text: ['Data controller: [ЗАПОЛНИТЬ: company or sole proprietor name, BIN/IIN].', 'Address: [ЗАПОЛНИТЬ].', 'Contact: WhatsApp [ЗАПОЛНИТЬ: number], email [ЗАПОЛНИТЬ].'] },
      { title: 'What data we collect', only: 'orders', text: ['When you place an order: your name, phone number, delivery address (if you put it in the comment or tell us when we confirm the order) and the order itself — products, sizes, colours, quantities and total. Email and comment are optional.', 'The date and time of your consent to personal data processing are saved with the order.', 'To protect against spam, the site briefly counts the sender’s IP address in anonymised form. It is not saved with the order and is deleted automatically.'] },
      { title: 'Why we use it', only: 'orders', text: ['To fulfil your order: confirm availability and size, and agree on payment and delivery.', 'To contact you about this order — by phone, WhatsApp or email.', 'We do not send advertising using this data, do not sell it and do not share it with third parties, except the delivery service (only what delivery needs) and cases expressly required by the laws of the Republic of Kazakhstan.'] },
      { title: 'Where the data is stored', only: 'orders', text: ['The data is stored on a server located in the Republic of Kazakhstan.', 'Contact details in orders are stored encrypted and only the store administrator can access them. Backups are encrypted too and kept in Kazakhstan.', 'The data is not shared with external email, payment or analytics services.'] },
      { title: 'How long we keep it', only: 'orders', text: ['Order data is kept for 3 years after the order is fulfilled — for accounting, warranty questions and repeat orders — and then deleted.', 'Orders the system flagged as spam are deleted automatically after 30 days.', 'Encrypted backups are kept for no longer than 30 days.'] },
      { title: 'How to access, correct or delete your data', only: 'orders', text: ['You can ask what data we hold about you, correct it, withdraw your consent or ask us to delete it.', 'Message us on WhatsApp: [ЗАПОЛНИТЬ: number]. Include your name and the phone number you used for the order.', 'We will delete the data from the site database; it disappears from backups within 30 days. If the law requires us to keep some records longer (for example, for accounting), they are deleted when that period ends.'] },
      { title: 'Cart and cookies', text: ['Your cart is stored only in your browser: product IDs, selected options and quantities. Your name, phone and order details are never written there.', 'Cookies are used only for your language choice and for the store administrator’s sign-in (an HTTP-only cookie that lasts up to eight hours). There are no advertising or analytics cookies.'] },
      { title: 'Reviews', only: 'orders', text: ['Your name and review text are visible to everyone on the product page. Email and phone are never requested. The store may hide or delete a review, including at your request.'] },
      { title: 'Showcase mode', only: 'demo', text: ['The shop and cart work without registration. The admin panel and order intake are disabled, and no personal data is collected on the site. The host may process technical request logs.'] },
      { title: 'Changes to this policy', text: ['We may update this policy. The current version is always published on this page, with its date shown at the top.'] },
    ] as PrivacySection[],
    legal: 'Draft: this text must be reviewed by a lawyer before the site starts taking orders.',
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
