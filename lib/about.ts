// Texts of the "О бренде" page (/about) in Kazakh, Russian and English.
// Source: the BOTA company presentation and the Songxin catalogue supplied by the owner (October 2026).
// Figures, certificates and awards belong to the manufacturing partner Songxin and are always presented as theirs.
// Kazakh is offered only on this page; the rest of the site stays RU/EN.
import type { Locale } from './i18n.ts';

export const ABOUT_LANGS = ['kk', 'ru', 'en'] as const;
export type AboutLang = (typeof ABOUT_LANGS)[number];
export function toAboutLang(value: unknown, fallback: Locale): AboutLang {
  return typeof value === 'string' && (ABOUT_LANGS as readonly string[]).includes(value) ? value as AboutLang : fallback;
}

// Photos of the Songxin factory from its 2025 catalogue (small originals, never shown larger than their size).
export const ABOUT_PHOTOS = {
  building: { src: '/images/about/factory-building.webp', width: 796, height: 559 },
  fabricRolls: { src: '/images/about/fabric-rolls.webp', width: 451, height: 311 },
  fabricShelves: { src: '/images/about/fabric-shelves.webp', width: 451, height: 311 },
  cutting: { src: '/images/about/cutting.webp', width: 450, height: 450 },
  sewingLine: { src: '/images/about/sewing-line.webp', width: 600, height: 443 },
  sewingHall: { src: '/images/about/sewing-hall.webp', width: 671, height: 489 },
  pressing: { src: '/images/about/pressing.webp', width: 734, height: 526 },
  finished: { src: '/images/about/finished-garments.webp', width: 715, height: 493 },
} as const;
export type AboutPhoto = keyof typeof ABOUT_PHOTOS;

const ru = {
  meta: { title: 'О бренде', description: 'BOTA Medical Uniform — медицинская одежда из Алматы. Производственный партнёр — фабрика Songxin (Сянчэн, Хэнань), работает с 2003 года.' },
  switchLabel: 'Язык страницы',
  hero: {
    kicker: 'BOTA Medical Uniform',
    title: 'Доверие\u00a0— через качество.\nЦенность\u00a0— через сотрудничество.',
    lead: 'Мы опираемся на профессиональный производственный опыт и работаем для медицины Казахстана.',
    from: 'Сянчэн, Хэнань', fromNote: 'производство', to: 'Алматы', toNote: 'бренд и сервис',
    routeLabel: 'Путь одежды: от фабрики в Сянчэне до BOTA в Алматы',
    photoAlt: 'Швейный цех фабрики Songxin: ряды машин и белые халаты в работе', photoCaption: 'Швейный цех фабрики-партнёра Songxin, Сянчэн',
  },
  intro: {
    title: 'Кто мы',
    text: [
      'BOTA Medical Uniform — бренд медицинской одежды и сопутствующих товаров для медицины Казахстана. Мы работаем в Алматы и одеваем больницы, клиники, медицинские вузы, дистрибьюторов и самих медиков: одежда должна быть профессиональной, удобной и практичной.',
      'Для нас важны функциональность, комфорт в течение смены, прочность и стабильные поставки. Мы не ограничиваемся продажей отдельных изделий: предлагаем организациям регулярные поставки, открытую связь и долгосрочное сотрудничество.',
    ],
  },
  partner: {
    title: 'Производственный партнёр',
    text: 'Наш партнёр — Songxin Garment Co., Ltd. из города Сянчэн, провинция Хэнань, Китай. С 2003 года фабрика проектирует и шьёт профессиональную одежду для медиков, рабочую одежду и текстиль. BOTA соединяет опыт партнёра с реальными задачами клиентов в Казахстане.',
    buildingAlt: 'Здание фабрики Songxin в Сянчэне',
    rollsAlt: 'Рулоны ткани на складе фабрики',
  },
  label: {
    title: 'Партнёр в цифрах',
    note: 'По данным компании Songxin.',
    rows: [
      ['2003', 'год основания'],
      ['20 000 м²', 'территория предприятия'],
      ['≈ 18 000 м²', 'площадь зданий'],
      ['399', 'сотрудников'],
      ['600+', 'моделей рабочей одежды'],
      ['33', 'патента: 9 промышленных образцов, 22 полезные модели, 2 изобретения'],
      ['ISO 9001, 14001, 45001', 'менеджмент качества, экологии и охраны труда'],
    ],
  },
  story: {
    title: 'Путь партнёра',
    items: [
      ['2003', 'В Сянчэне основана компания Songxin.'],
      ['2011', 'Профессиональная одежда Songxin признана известным продуктом провинции Хэнань.'],
      ['2016', 'Открыт собственный центр исследований и разработок.'],
      ['2021', 'Компания получила статус высокотехнологичного предприятия провинции.'],
      ['2023', 'Признана ведущим брендом медицинской одежды по итогам 2022 года.'],
      ['2024', 'На базе компании признан инженерный исследовательский центр провинции Хэнань по антибактериальным медицинским тканям.'],
    ],
    endTitle: 'BOTA Medical Uniform, Алматы',
    endText: 'Опыт партнёра — для клиентов в Казахстане.',
  },
  process: {
    title: 'Как создаётся одежда',
    lead: 'Производство Songxin охватывает весь путь — от проекта модели до отгрузки.',
    steps: [
      ['Проект и лекала', 'Дизайнеры и специалисты CAD разрабатывают модель и лекала.', null],
      ['Материалы', 'Ткани и фурнитуру закупают и проверяют их качество.', 'fabricShelves'],
      ['Раскрой', 'Автоматические настилочные машины и шаблонное оборудование готовят и кроят ткань.', 'cutting'],
      ['Пошив', 'Компьютерные петельные машины, закрепочные и пуговичные автоматы.', 'sewingHall'],
      ['Контроль качества', 'Во время производства проходит промежуточная проверка качества.', null],
      ['Утюжка и упаковка', 'Финишная обработка, утюжка и упаковка изделий.', 'pressing'],
      ['Склад и отгрузка', 'Готовые изделия хранятся на складе и отправляются заказчику.', 'finished'],
    ] as [string, string, AboutPhoto | null][],
    alts: { fabricShelves: 'Стеллажи с тканями разных цветов', cutting: 'Автоматический раскрой ткани и детали кроя', sewingHall: 'Швеи за машинами в цехе', pressing: 'Утюжка готовых изделий', finished: 'Готовая одежда на вешалах в цехе' } as Partial<Record<AboutPhoto, string>>,
  },
  products: {
    title: 'Что мы предлагаем',
    now: 'В каталоге', later: 'По запросу',
    coats: ['Медицинские халаты', 'Для врачей, студентов-медиков и лабораторий.'],
    scrubs: ['Хирургические костюмы', 'Для операционных и смежной работы.'],
    request: ['Одежда для медсестёр и персонала', 'Медицинская обувь', 'Медицинские маски и сопутствующие товары', 'Больничное постельное бельё и текстиль'],
    note: 'Модель, размеры и комплектацию согласуем под ваш запрос.',
  },
  orgs: {
    title: 'Для организаций',
    text: 'Мы работаем с централизованными закупками, крупными заказами и регулярным пополнением. Перечень изделий, количество, размерный ряд, график поставки и порядок оплаты согласуем отдельно для каждого проекта.',
    steps: ['Подбор изделий', 'Размеры и количество', 'Согласование заказа', 'Доставка', 'Связь после поставки и пополнение'],
  },
  quality: {
    title: 'Качество',
    text: 'Медицинская одежда влияет не только на внешний вид, но и на удобство в течение всей смены. Поэтому мы уточняем детали, согласуем характеристики, проверяем заказ и координируем доставку.',
    iso: 'Наш производственный партнёр сертифицирован по ISO 9001, ISO 14001 и ISO 45001.',
  },
  values: {
    title: 'Наши принципы',
    quote: '«Продукт — зеркало человека, а клиент — близкий человек».',
    quoteNote: 'Принцип Songxin, которому следует и BOTA.',
    items: [
      ['Качество и ответственность', 'Внимательны к деталям изделия, его характеристикам и задачам каждого клиента.'],
      ['Клиенты и партнёры', 'Уважаем клиентов любого масштаба, отвечаем быстро и строим взаимное доверие.'],
      ['Опыт и новое', 'Ценим проверенные технологии и следим за новыми разработками и рынком.'],
      ['Честность и надёжность', 'Точная информация, взвешенные обещания и ответственный сервис.'],
      ['Взаимная выгода', 'Поддерживаем общий рост клиентов, поставщиков и деловых партнёров.'],
    ],
  },
  events: {
    title: 'Выставки и сотрудничество',
    items: [
      ['Международная медицинская выставка KIHE', 'Участвуем', 'Встречи с медицинскими организациями, специалистами по закупкам и будущими партнёрами.'],
      ['United Medical Expo 2026', '28–29 октября 2026, Астана, МВЦ EXPO', 'Участвуем: показываем медицинскую одежду и расширяем сеть дистрибьюторов.'],
      ['Казахский национальный медицинский университет (КазНМУ)', 'Сотрудничество', 'Развиваем сотрудничество с университетом и его клиниками.'],
    ],
  },
  contact: {
    title: 'Давайте работать вместе',
    text: 'Приглашаем больницы, клиники, медицинские вузы и дистрибьюторов обсудить поставки, оптовые закупки и долгосрочное сотрудничество.',
    catalog: 'Смотреть каталог', whatsapp: 'Написать в WhatsApp', address: 'Алматы, проспект Райымбека, 162а',
  },
};
export type AboutCopy = typeof ru;

const kk: AboutCopy = {
  meta: { title: 'BOTA туралы', description: 'BOTA Medical Uniform — Алматыдағы медициналық киім бренді. Өндірістік серіктес — 2003 жылдан бері жұмыс істейтін Songxin фабрикасы (Сянчэн, Хэнань).' },
  switchLabel: 'Бет тілі',
  hero: {
    kicker: 'BOTA Medical Uniform',
    title: 'Сапа арқылы\u00a0— сенім.\nЫнтымақтастық арқылы\u00a0— құндылық.',
    lead: 'Кәсіби өндірістік тәжірибеге сүйене отырып, Қазақстанның медициналық қажеттіліктеріне қызмет көрсетеміз.',
    from: 'Сянчэн, Хэнань', fromNote: 'өндіріс', to: 'Алматы', toNote: 'бренд және қызмет',
    routeLabel: 'Киімнің жолы: Сянчэндегі фабрикадан Алматыдағы BOTA-ға дейін',
    photoAlt: 'Songxin фабрикасының тігін цехы: машиналар қатары және тігіліп жатқан ақ халаттар', photoCaption: 'Серіктес Songxin фабрикасының тігін цехы, Сянчэн',
  },
  intro: {
    title: 'Біз кімбіз',
    text: [
      'BOTA Medical Uniform — Қазақстанның медициналық нарығына арналған медициналық киімдер мен ілеспе тауарларды жеткізетін кәсіби бренд. Алматыда орналасқан компания ауруханаларға, клиникаларға, медициналық жоғары оқу орындарына, дистрибьюторларға және медицина мамандарына кәсіби, қолайлы әрі ыңғайлы киім ұсынады.',
      'Біз киімнің функционалдығына, кию жайлылығына, беріктігіне және жеткізілімнің тұрақтылығына мән береміз. Мақсатымыз жекелеген өнімдерді жеткізумен шектелмейді: ұйымдарға тұрақты жеткізілім, ашық байланыс және ұзақ мерзімді ынтымақтастық ұсынамыз.',
    ],
  },
  partner: {
    title: 'Өндірістік серіктес',
    text: 'Біздің серіктесіміз — Қытайдың Хэнань провинциясы, Сянчэн қаласындағы Songxin Garment Co., Ltd. Кәсіпорын 2003 жылдан бері медицина қызметкерлеріне арналған кәсіби киімді, жұмыс киімін және тоқыма бұйымдарын жобалап, өндіреді. BOTA серіктестің тәжірибесін Қазақстандағы клиенттердің нақты қажеттіліктерімен ұштастырады.',
    buildingAlt: 'Сянчэндегі Songxin фабрикасының ғимараты',
    rollsAlt: 'Фабрика қоймасындағы мата орамдары',
  },
  label: {
    title: 'Серіктес туралы деректер',
    note: 'Деректер Songxin компаниясының материалдарынан алынған.',
    rows: [
      ['2003', 'құрылған жылы'],
      ['20 000 м²', 'өндірістік аумақ'],
      ['≈ 18 000 м²', 'ғимараттардың жалпы ауданы'],
      ['399', 'қызметкер'],
      ['600+', 'қызметкерлер киімінің үлгісі'],
      ['33', 'патент: 9 өнеркәсіптік үлгі, 22 пайдалы модель, 2 өнертабыс'],
      ['ISO 9001, 14001, 45001', 'сапа, экология және еңбек қауіпсіздігі менеджменті'],
    ],
  },
  story: {
    title: 'Серіктестің жолы',
    items: [
      ['2003', 'Сянчэнде Songxin компаниясының негізі қаланды.'],
      ['2011', 'Songxin кәсіби киімі Хэнань провинциясының танымал өнімі атанды.'],
      ['2016', 'Ішкі ғылыми-зерттеу және әзірлеу орталығы құрылды.'],
      ['2021', 'Провинциялық жоғары технологиялы кәсіпорын мәртебесін алды.'],
      ['2023', '2022 жылғы медициналық киімнің артықшылықты бренді кәсіпорны деп танылды.'],
      ['2024', 'Хэнань провинциясының медициналық бактерияға қарсы маталар бойынша инженерлік-технологиялық зерттеу орталығы деп танылды.'],
    ],
    endTitle: 'BOTA Medical Uniform, Алматы',
    endText: 'Серіктестің тәжірибесі — Қазақстандағы клиенттер үшін.',
  },
  process: {
    title: 'Киім қалай жасалады',
    lead: 'Songxin өндірісі үлгіні жобалаудан бастап жөнелтуге дейінгі барлық кезеңді қамтиды.',
    steps: [
      ['Жобалау және пішім', 'Дизайнерлер мен CAD мамандары үлгі мен пішімді әзірлейді.', null],
      ['Материалдар', 'Маталар мен қосалқы материалдар сатып алынып, сапасы тексеріледі.', 'fabricShelves'],
      ['Пішу', 'Матаны автоматты жаю құрылғылары мен шаблондық жабдықтар дайындап, пішеді.', 'cutting'],
      ['Тігу', 'Компьютерлік ілмек тігу машиналары, бекіту және түйме қадау жабдықтары.', 'sewingHall'],
      ['Сапа бақылауы', 'Өндіріс барысында аралық сапа тексерісі жүргізіледі.', null],
      ['Үтіктеу және қаптау', 'Соңғы өңдеу, үтіктеу және бұйымдарды қаптау.', 'pressing'],
      ['Қойма және жөнелту', 'Дайын бұйымдар қоймада сақталып, тапсырыс берушіге жөнелтіледі.', 'finished'],
    ],
    alts: { fabricShelves: 'Түрлі түсті маталар салынған сөрелер', cutting: 'Матаны автоматты пішу және пішілген бөлшектер', sewingHall: 'Цехтағы тігінші машиналар', pressing: 'Дайын бұйымдарды үтіктеу', finished: 'Цехтағы ілгіштерде тұрған дайын киім' },
  },
  products: {
    title: 'Өнімдер',
    now: 'Каталогта', later: 'Сұраныс бойынша',
    coats: ['Медициналық ақ халаттар', 'Дәрігерлерге, медицина студенттеріне және зертханаларға.'],
    scrubs: ['Хирургиялық киімдер', 'Операциялық және соған байланысты жұмыс жағдайларына.'],
    request: ['Мейіргерлер мен қызметкерлердің жұмыс киімі', 'Медициналық аяқ киім', 'Медициналық маскалар және ілеспе тауарлар', 'Медициналық төсек-орын және тоқыма бұйымдары'],
    note: 'Үлгі, өлшем және жиынтық клиенттің сұранысына қарай келісіледі.',
  },
  orgs: {
    title: 'Ұйымдарға',
    text: 'BOTA орталықтандырылған сатып алуға, ірі тапсырыстарға және тұрақты толықтыруға назар аударады. Өнім тізімі, саны, өлшемдер құрамы, жеткізу жоспары мен төлем тәртібі әр жоба бойынша жеке келісіледі.',
    steps: ['Өнімді таңдау', 'Өлшем мен санды нақтылау', 'Тапсырысты келісу', 'Жеткізуді ұйымдастыру', 'Кейінгі байланыс және толықтыру'],
  },
  quality: {
    title: 'Сапа',
    text: 'Медициналық киім кәсіби бейнеге ғана емес, күнделікті жұмыстағы жайлылыққа да әсер етеді. Сондықтан ақпаратты нақтылап, сипаттамаларды келісіп, тапсырысты тексеріп, жеткізуді үйлестіреміз.',
    iso: 'Өндірістік серіктесіміз ISO 9001, ISO 14001 және ISO 45001 бойынша сертификатталған.',
  },
  values: {
    title: 'Біздің қағидаттарымыз',
    quote: '«Өнім — адамның айнасы, ал клиент — жақын адам».',
    quoteNote: 'Songxin қағидаты, оны BOTA да ұстанады.',
    items: [
      ['Сапа және жауапкершілік', 'Өнімнің ұсақ бөлшектеріне, сипаттамаларына және әр клиенттің қажеттілігіне мұқият қараймыз.'],
      ['Клиенттер мен серіктестер', 'Кез келген көлемдегі клиентті құрметтеп, тез байланысамыз және өзара сенім қалыптастырамыз.'],
      ['Тәжірибе мен жаңашылдық', 'Қалыптасқан технологияларды құрметтей отырып, жаңа әзірлемелер мен нарық өзгерістерін қадағалаймыз.'],
      ['Адалдық пен сенімділік', 'Нақты ақпарат, мұқият берілген уәде және жауапты қызмет.'],
      ['Өзара тиімді ынтымақтастық', 'Клиенттердің, жеткізу серіктестерінің және іскерлік серіктестердің ортақ дамуын қолдаймыз.'],
    ],
  },
  events: {
    title: 'Көрмелер және ынтымақтастық',
    items: [
      ['KIHE халықаралық медициналық көрмесі', 'Қатысамыз', 'Медициналық ұйымдармен, сатып алу мамандарымен және әлеуетті серіктестермен кездесу.'],
      ['United Medical Expo 2026', '2026 жылғы 28–29 қазан, Астана, EXPO халықаралық көрме орталығы', 'Қатысамыз: медициналық киімді таныстырып, дистрибьюторлық желіні кеңейтеміз.'],
      ['Қазақ ұлттық медицина университеті (KazNMU)', 'Ынтымақтастық', 'Университетпен және оның клиникаларымен ынтымақтастықты дамытамыз.'],
    ],
  },
  contact: {
    title: 'Бірге жұмыс істейік',
    text: 'Ауруханаларды, клиникаларды, медициналық оқу орындарын және дистрибьюторларды жеткізу, көтерме сатып алу және ұзақ мерзімді ынтымақтастықты талқылауға шақырамыз.',
    catalog: 'Каталогты қарау', whatsapp: 'WhatsApp-қа жазу', address: 'Алматы, Райымбек даңғылы, 162а',
  },
};

const en: AboutCopy = {
  meta: { title: 'About BOTA', description: 'BOTA Medical Uniform is a medical apparel brand from Almaty. Our manufacturing partner is the Songxin factory in Xiangcheng, Henan, operating since 2003.' },
  switchLabel: 'Page language',
  hero: {
    kicker: 'BOTA Medical Uniform',
    title: 'Trust through quality.\nValue through partnership.',
    lead: 'We draw on proven manufacturing experience to serve the medical needs of Kazakhstan.',
    from: 'Xiangcheng, Henan', fromNote: 'manufacturing', to: 'Almaty', toNote: 'brand and service',
    routeLabel: 'The route of our clothing: from the factory in Xiangcheng to BOTA in Almaty',
    photoAlt: 'Sewing hall at the Songxin factory: rows of machines and white coats in progress', photoCaption: 'Sewing hall at our partner factory Songxin, Xiangcheng',
  },
  intro: {
    title: 'Who we are',
    text: [
      'BOTA Medical Uniform is a brand of medical apparel and related supplies for Kazakhstan’s healthcare sector. Based in Almaty, we dress hospitals, clinics, medical universities, distributors and medical professionals in clothing that is professional, comfortable and practical.',
      'We care about function, comfort through a long shift, durability and reliable supply. We do more than sell single items: we offer organisations regular supply, open communication and long-term partnership.',
    ],
  },
  partner: {
    title: 'Manufacturing partner',
    text: 'Our partner is Songxin Garment Co., Ltd. of Xiangcheng, Henan Province, China. Since 2003 the factory has designed and made professional clothing for medical staff, workwear and textiles. BOTA brings that experience to the real needs of customers in Kazakhstan.',
    buildingAlt: 'The Songxin factory building in Xiangcheng',
    rollsAlt: 'Rolls of fabric in the factory store',
  },
  label: {
    title: 'The partner in figures',
    note: 'Figures provided by Songxin.',
    rows: [
      ['2003', 'founded'],
      ['20,000 m²', 'site area'],
      ['≈ 18,000 m²', 'floor space'],
      ['399', 'employees'],
      ['600+', 'uniform styles developed'],
      ['33', 'patents: 9 design, 22 utility model, 2 invention'],
      ['ISO 9001, 14001, 45001', 'quality, environmental and occupational safety management'],
    ],
  },
  story: {
    title: 'The partner’s story',
    items: [
      ['2003', 'Songxin is founded in Xiangcheng.'],
      ['2011', 'Songxin professional clothing is named a well-known product of Henan Province.'],
      ['2016', 'An in-house research and development centre opens.'],
      ['2021', 'Recognised as a provincial high-tech enterprise.'],
      ['2023', 'Named a leading medical apparel brand for 2022.'],
      ['2024', 'Recognised as Henan Province’s engineering research centre for antibacterial medical fabrics.'],
    ],
    endTitle: 'BOTA Medical Uniform, Almaty',
    endText: 'The partner’s experience, for customers in Kazakhstan.',
  },
  process: {
    title: 'How the clothing is made',
    lead: 'Songxin’s production covers every stage, from the first pattern to dispatch.',
    steps: [
      ['Design and patterns', 'Designers and CAD specialists develop the style and its patterns.', null],
      ['Materials', 'Fabrics and trims are purchased and checked for quality.', 'fabricShelves'],
      ['Cutting', 'Automatic spreading machines and template equipment prepare and cut the fabric.', 'cutting'],
      ['Sewing', 'Computerised buttonhole machines, bar-tacking and button-sewing equipment.', 'sewingHall'],
      ['Quality checks', 'Work is inspected during production.', null],
      ['Pressing and packing', 'Finishing, pressing and packing.', 'pressing'],
      ['Storage and dispatch', 'Finished garments are stored and shipped to the customer.', 'finished'],
    ],
    alts: { fabricShelves: 'Shelves of fabric in many colours', cutting: 'Automatic fabric cutting and cut pieces', sewingHall: 'Machinists at work in the sewing hall', pressing: 'Pressing finished garments', finished: 'Finished clothing on rails in the workshop' },
  },
  products: {
    title: 'What we offer',
    now: 'In the catalogue', later: 'On request',
    coats: ['Lab coats', 'For doctors, medical students and laboratories.'],
    scrubs: ['Surgical scrubs', 'For the operating theatre and related work.'],
    request: ['Nursing and staff uniforms', 'Medical footwear', 'Medical masks and related supplies', 'Hospital bedding and textiles'],
    note: 'Style, sizes and sets are agreed to your request.',
  },
  orgs: {
    title: 'For organisations',
    text: 'We handle centralised purchasing, large orders and regular restocking. The product list, quantities, size mix, delivery schedule and payment terms are agreed separately for each project.',
    steps: ['Choosing products', 'Sizes and quantities', 'Agreeing the order', 'Delivery', 'Follow-up and restocking'],
  },
  quality: {
    title: 'Quality',
    text: 'Medical clothing shapes not only how staff look but how comfortable they are through the whole shift. So we confirm the details, agree the specifications, check the order and coordinate delivery.',
    iso: 'Our manufacturing partner is certified to ISO 9001, ISO 14001 and ISO 45001.',
  },
  values: {
    title: 'Our principles',
    quote: '“A product mirrors its maker, and a customer is family.”',
    quoteNote: 'A Songxin principle that BOTA follows too.',
    items: [
      ['Quality and responsibility', 'Careful attention to every detail, every specification and every customer’s needs.'],
      ['Customers and partners', 'Respect for customers of every size, quick replies and mutual trust.'],
      ['Experience and innovation', 'Respect for proven methods, with an eye on new development and the market.'],
      ['Honesty and reliability', 'Accurate information, careful promises and responsible service.'],
      ['Mutual benefit', 'Supporting the shared growth of customers, suppliers and business partners.'],
    ],
  },
  events: {
    title: 'Exhibitions and partnerships',
    items: [
      ['KIHE international healthcare exhibition', 'We take part', 'Meeting medical organisations, procurement specialists and future partners.'],
      ['United Medical Expo 2026', '28–29 October 2026, Astana, EXPO International Exhibition Centre', 'We take part: presenting our medical clothing and growing our distributor network.'],
      ['Kazakh National Medical University (KazNMU)', 'Cooperation', 'We are developing cooperation with the university and its clinics.'],
    ],
  },
  contact: {
    title: 'Let’s work together',
    text: 'We invite hospitals, clinics, medical universities and distributors to talk about supply, wholesale purchasing and long-term partnership.',
    catalog: 'Browse the catalogue', whatsapp: 'Message us on WhatsApp', address: '162a Raiymbek Ave, Almaty',
  },
};

export const ABOUT: Record<AboutLang, AboutCopy> = { kk, ru, en };
export const ABOUT_LANG_NAMES: Record<AboutLang, string> = { kk: 'Қазақша', ru: 'Русский', en: 'English' };
