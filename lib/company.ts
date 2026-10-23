// Company details shown on the site by default (footer, contacts, WhatsApp link). Texts edited in the admin
// panel ("Сайт" tab) take precedence. Keep in sync with the privacy policy in lib/i18n.ts.
export const COMPANY = {
  name: 'BOTA Medical Uniform',
  whatsapp: '+7 (747) 993 57 69',
  email: 'botagroupp@gmail.com',
  address: { ru: 'Алматы, проспект Райымбека, 162а', en: '162a Raiymbek Ave, Almaty' },
} as const;
export const COMPANY_WHATSAPP_DIGITS = COMPANY.whatsapp.replace(/\D/g, '');
