import { useTranslation } from 'react-i18next';
import { getAdminLocale } from '../../lib/admin-locale';

export const useDate = () => {
  const { i18n } = useTranslation('webbersMedusa');
  const locale = getAdminLocale(i18n.language);

  const getFullDate = ({
    date,
    includeTime = false,
  }: {
    date: string | Date
    includeTime?: boolean
  }) => {
    const ensuredDate = new Date(date)

    if (isNaN(ensuredDate.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: includeTime ? 'short' : undefined,
    }).format(ensuredDate);
  };

  return {
    getFullDate,
  };
};
