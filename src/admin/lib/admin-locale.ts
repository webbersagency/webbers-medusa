// Medusa uses language identifiers such as enGB and ptBR in the Admin.
export const getAdminLocale = (language = 'en') => language.replace(/^([a-z]{2})([A-Z]{2})$/, '$1-$2');
