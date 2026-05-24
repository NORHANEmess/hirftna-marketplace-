export function getNotificationText(notification, t) {
  const { type, title, body } = notification;
  const meta = notification.meta ?? notification.data ?? {};
  const hasMeta = Object.keys(meta).length > 0;

  const knownTypes = [
    'new_order', 'order_accepted', 'order_rejected',
    'order_ready', 'order_completed', 'promotion_activated',
    'promotion_rejected', 'seller_verified', 'new_review', 'system',
  ];

  if (knownTypes.includes(type)) {
    const i18nTitle = t(`notifications.${type}.title`);
    const i18nBody = hasMeta
      ? t(`notifications.${type}.body`, { ...meta, defaultValue: '' })
      : (body || '');
    return { title: i18nTitle, body: i18nBody };
  }

  return {
    title: title || t('notifications.system.title'),
    body:  body  || '',
  };
}
