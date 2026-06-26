'use client';

/**
 * i18n — Système d'internationalisation léger pour Funny Station.
 * Supporte : FR, EN, ES, PT, AR.
 */

export type Locale = 'fr' | 'en' | 'es' | 'pt' | 'ar';

export const SUPPORTED_LOCALES: { code: Locale; name: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

type TranslationMap = Record<string, string>;

const translations: Record<Locale, TranslationMap> = {
  fr: {
    // Navigation
    'nav.games': 'Jeux',
    'nav.store': 'Boutique',
    'nav.profile': 'Profil',
    'nav.friends': 'Amis',
    'nav.leaderboard': 'Classement',
    'nav.season': 'Saison',
    // TopBar
    'topbar.notifications': 'Notifications',
    'topbar.search': 'Rechercher...',
    // Store
    'store.title': 'Boutique',
    'store.popular': 'Populaires',
    'store.new': 'Nouveautés',
    'store.cheats': 'Cheats',
    'store.buy': 'Acheter',
    'store.play': 'Jouer',
    'store.owned': 'Possédé',
    'store.free': 'Gratuit',
    'store.filter.all': 'Tous',
    'store.filter.price.free': 'Gratuit',
    'store.filter.price.paid': 'Payant',
    'store.recommended': 'Recommandé pour toi',
    'store.trending': 'Tendances',
    'store.catalog': 'Tout le catalogue',
    // Profile
    'profile.level': 'Niveau',
    'profile.trophies': 'Trophées',
    'profile.captures': 'Captures',
    'profile.friends': 'Amis',
    'profile.settings': 'Paramètres',
    'profile.save': 'Enregistrer',
    // Friends
    'friends.title': 'Amis',
    'friends.online': 'En ligne',
    'friends.offline': 'Hors ligne',
    'friends.pending': 'Demandes en attente',
    'friends.add': 'Ajouter un ami',
    'friends.search': 'Rechercher un joueur...',
    'friends.accept': 'Accepter',
    'friends.reject': 'Refuser',
    'friends.remove': 'Retirer',
    'friends.playing': 'Joue à',
    'friends.invite': 'Inviter',
    // Notifications
    'notif.title': 'Notifications',
    'notif.empty': 'Aucune notification',
    'notif.mark_read': 'Tout lire',
    'notif.clear': 'Tout effacer',
    // Daily Rewards
    'daily.title': 'Récompense quotidienne',
    'daily.claim': 'Réclamer',
    'daily.claimed': 'Réclamé !',
    'daily.streak': 'Streak',
    'daily.day': 'Jour',
    // Leaderboard
    'lb.title': 'Classement',
    'lb.global': 'Global',
    'lb.weekly': 'Semaine',
    'lb.friends': 'Amis',
    'lb.rank': 'Rang',
    'lb.score': 'Score',
    'lb.player': 'Joueur',
    // Chat
    'chat.title': 'Chat',
    'chat.send': 'Envoyer',
    'chat.placeholder': 'Écrire un message...',
    'chat.private': 'Messages privés',
    'chat.room': 'Chat de la room',
    // Season
    'season.title': 'Pass de saison',
    'season.tier': 'Palier',
    'season.remaining': 'Temps restant',
    'season.claim': 'Réclamer',
    'season.premium': 'Premium',
    'season.days': 'j',
    'season.hours': 'h',
    // Screenshots
    'ss.title': 'Captures',
    'ss.screenshot': 'Screenshot',
    'ss.clip': 'Clip vidéo',
    'ss.capture': 'Capturer',
    'ss.record': 'Enregistrer',
    'ss.stop': 'Arrêter',
    'ss.delete': 'Supprimer',
    // Control Center
    'cc.volume': 'Volume',
    'cc.theme': 'Thème',
    'cc.device': 'Périphérique',
    'cc.language': 'Langue',
    'cc.accessibility': 'Accessibilité',
    'cc.animations': 'Animations',
    'cc.colorblind': 'Daltonien',
    'cc.power': 'Alimentation',
    // General
    'general.loading': 'Chargement...',
    'general.error': 'Erreur',
    'general.cancel': 'Annuler',
    'general.confirm': 'Confirmer',
    'general.close': 'Fermer',
    'general.back': 'Retour',
  },
  en: {
    'nav.games': 'Games',
    'nav.store': 'Store',
    'nav.profile': 'Profile',
    'nav.friends': 'Friends',
    'nav.leaderboard': 'Leaderboard',
    'nav.season': 'Season',
    'topbar.notifications': 'Notifications',
    'topbar.search': 'Search...',
    'store.title': 'Store',
    'store.popular': 'Popular',
    'store.new': 'New Releases',
    'store.cheats': 'Cheats',
    'store.buy': 'Buy',
    'store.play': 'Play',
    'store.owned': 'Owned',
    'store.free': 'Free',
    'store.filter.all': 'All',
    'store.filter.price.free': 'Free',
    'store.filter.price.paid': 'Paid',
    'store.recommended': 'Recommended for you',
    'store.trending': 'Trending',
    'store.catalog': 'Full Catalog',
    'profile.level': 'Level',
    'profile.trophies': 'Trophies',
    'profile.captures': 'Captures',
    'profile.friends': 'Friends',
    'profile.settings': 'Settings',
    'profile.save': 'Save',
    'friends.title': 'Friends',
    'friends.online': 'Online',
    'friends.offline': 'Offline',
    'friends.pending': 'Pending Requests',
    'friends.add': 'Add Friend',
    'friends.search': 'Search player...',
    'friends.accept': 'Accept',
    'friends.reject': 'Decline',
    'friends.remove': 'Remove',
    'friends.playing': 'Playing',
    'friends.invite': 'Invite',
    'notif.title': 'Notifications',
    'notif.empty': 'No notifications',
    'notif.mark_read': 'Mark all read',
    'notif.clear': 'Clear all',
    'daily.title': 'Daily Reward',
    'daily.claim': 'Claim',
    'daily.claimed': 'Claimed!',
    'daily.streak': 'Streak',
    'daily.day': 'Day',
    'lb.title': 'Leaderboard',
    'lb.global': 'Global',
    'lb.weekly': 'Weekly',
    'lb.friends': 'Friends',
    'lb.rank': 'Rank',
    'lb.score': 'Score',
    'lb.player': 'Player',
    'chat.title': 'Chat',
    'chat.send': 'Send',
    'chat.placeholder': 'Write a message...',
    'chat.private': 'Private Messages',
    'chat.room': 'Room Chat',
    'season.title': 'Season Pass',
    'season.tier': 'Tier',
    'season.remaining': 'Time Remaining',
    'season.claim': 'Claim',
    'season.premium': 'Premium',
    'season.days': 'd',
    'season.hours': 'h',
    'ss.title': 'Captures',
    'ss.screenshot': 'Screenshot',
    'ss.clip': 'Video Clip',
    'ss.capture': 'Capture',
    'ss.record': 'Record',
    'ss.stop': 'Stop',
    'ss.delete': 'Delete',
    'cc.volume': 'Volume',
    'cc.theme': 'Theme',
    'cc.device': 'Device',
    'cc.language': 'Language',
    'cc.accessibility': 'Accessibility',
    'cc.animations': 'Animations',
    'cc.colorblind': 'Color Blind',
    'cc.power': 'Power',
    'general.loading': 'Loading...',
    'general.error': 'Error',
    'general.cancel': 'Cancel',
    'general.confirm': 'Confirm',
    'general.close': 'Close',
    'general.back': 'Back',
  },
  es: {
    'nav.games': 'Juegos', 'nav.store': 'Tienda', 'nav.profile': 'Perfil', 'nav.friends': 'Amigos', 'nav.leaderboard': 'Clasificación', 'nav.season': 'Temporada',
    'topbar.notifications': 'Notificaciones', 'topbar.search': 'Buscar...',
    'store.title': 'Tienda', 'store.popular': 'Populares', 'store.new': 'Novedades', 'store.cheats': 'Trucos', 'store.buy': 'Comprar', 'store.play': 'Jugar', 'store.owned': 'Adquirido', 'store.free': 'Gratis',
    'store.filter.all': 'Todos', 'store.filter.price.free': 'Gratis', 'store.filter.price.paid': 'De pago', 'store.recommended': 'Recomendado para ti', 'store.trending': 'Tendencias', 'store.catalog': 'Catálogo completo',
    'profile.level': 'Nivel', 'profile.trophies': 'Trofeos', 'profile.captures': 'Capturas', 'profile.friends': 'Amigos', 'profile.settings': 'Ajustes', 'profile.save': 'Guardar',
    'friends.title': 'Amigos', 'friends.online': 'En línea', 'friends.offline': 'Desconectado', 'friends.pending': 'Solicitudes pendientes', 'friends.add': 'Añadir amigo', 'friends.search': 'Buscar jugador...', 'friends.accept': 'Aceptar', 'friends.reject': 'Rechazar', 'friends.remove': 'Eliminar', 'friends.playing': 'Jugando a', 'friends.invite': 'Invitar',
    'notif.title': 'Notificaciones', 'notif.empty': 'Sin notificaciones', 'notif.mark_read': 'Marcar todo', 'notif.clear': 'Borrar todo',
    'daily.title': 'Recompensa diaria', 'daily.claim': 'Reclamar', 'daily.claimed': '¡Reclamado!', 'daily.streak': 'Racha', 'daily.day': 'Día',
    'lb.title': 'Clasificación', 'lb.global': 'Global', 'lb.weekly': 'Semanal', 'lb.friends': 'Amigos', 'lb.rank': 'Rango', 'lb.score': 'Puntuación', 'lb.player': 'Jugador',
    'chat.title': 'Chat', 'chat.send': 'Enviar', 'chat.placeholder': 'Escribe un mensaje...', 'chat.private': 'Mensajes privados', 'chat.room': 'Chat de sala',
    'season.title': 'Pase de temporada', 'season.tier': 'Nivel', 'season.remaining': 'Tiempo restante', 'season.claim': 'Reclamar', 'season.premium': 'Premium', 'season.days': 'd', 'season.hours': 'h',
    'ss.title': 'Capturas', 'ss.screenshot': 'Captura', 'ss.clip': 'Clip de vídeo', 'ss.capture': 'Capturar', 'ss.record': 'Grabar', 'ss.stop': 'Parar', 'ss.delete': 'Eliminar',
    'cc.volume': 'Volumen', 'cc.theme': 'Tema', 'cc.device': 'Dispositivo', 'cc.language': 'Idioma', 'cc.accessibility': 'Accesibilidad', 'cc.animations': 'Animaciones', 'cc.colorblind': 'Daltónico', 'cc.power': 'Energía',
    'general.loading': 'Cargando...', 'general.error': 'Error', 'general.cancel': 'Cancelar', 'general.confirm': 'Confirmar', 'general.close': 'Cerrar', 'general.back': 'Atrás',
  },
  pt: {
    'nav.games': 'Jogos', 'nav.store': 'Loja', 'nav.profile': 'Perfil', 'nav.friends': 'Amigos', 'nav.leaderboard': 'Classificação', 'nav.season': 'Temporada',
    'topbar.notifications': 'Notificações', 'topbar.search': 'Pesquisar...',
    'store.title': 'Loja', 'store.popular': 'Populares', 'store.new': 'Novidades', 'store.cheats': 'Trapaças', 'store.buy': 'Comprar', 'store.play': 'Jogar', 'store.owned': 'Adquirido', 'store.free': 'Grátis',
    'store.filter.all': 'Todos', 'store.filter.price.free': 'Grátis', 'store.filter.price.paid': 'Pago', 'store.recommended': 'Recomendado para você', 'store.trending': 'Tendências', 'store.catalog': 'Catálogo completo',
    'profile.level': 'Nível', 'profile.trophies': 'Troféus', 'profile.captures': 'Capturas', 'profile.friends': 'Amigos', 'profile.settings': 'Configurações', 'profile.save': 'Salvar',
    'friends.title': 'Amigos', 'friends.online': 'Online', 'friends.offline': 'Offline', 'friends.pending': 'Pedidos pendentes', 'friends.add': 'Adicionar amigo', 'friends.search': 'Pesquisar jogador...', 'friends.accept': 'Aceitar', 'friends.reject': 'Recusar', 'friends.remove': 'Remover', 'friends.playing': 'Jogando', 'friends.invite': 'Convidar',
    'notif.title': 'Notificações', 'notif.empty': 'Sem notificações', 'notif.mark_read': 'Marcar tudo', 'notif.clear': 'Limpar tudo',
    'daily.title': 'Recompensa diária', 'daily.claim': 'Resgatar', 'daily.claimed': 'Resgatado!', 'daily.streak': 'Sequência', 'daily.day': 'Dia',
    'lb.title': 'Classificação', 'lb.global': 'Global', 'lb.weekly': 'Semanal', 'lb.friends': 'Amigos', 'lb.rank': 'Posição', 'lb.score': 'Pontuação', 'lb.player': 'Jogador',
    'chat.title': 'Chat', 'chat.send': 'Enviar', 'chat.placeholder': 'Escreva uma mensagem...', 'chat.private': 'Mensagens privadas', 'chat.room': 'Chat da sala',
    'season.title': 'Passe de temporada', 'season.tier': 'Nível', 'season.remaining': 'Tempo restante', 'season.claim': 'Resgatar', 'season.premium': 'Premium', 'season.days': 'd', 'season.hours': 'h',
    'ss.title': 'Capturas', 'ss.screenshot': 'Captura', 'ss.clip': 'Clipe de vídeo', 'ss.capture': 'Capturar', 'ss.record': 'Gravar', 'ss.stop': 'Parar', 'ss.delete': 'Excluir',
    'cc.volume': 'Volume', 'cc.theme': 'Tema', 'cc.device': 'Dispositivo', 'cc.language': 'Idioma', 'cc.accessibility': 'Acessibilidade', 'cc.animations': 'Animações', 'cc.colorblind': 'Daltônico', 'cc.power': 'Energia',
    'general.loading': 'Carregando...', 'general.error': 'Erro', 'general.cancel': 'Cancelar', 'general.confirm': 'Confirmar', 'general.close': 'Fechar', 'general.back': 'Voltar',
  },
  ar: {
    'nav.games': 'ألعاب', 'nav.store': 'المتجر', 'nav.profile': 'الملف الشخصي', 'nav.friends': 'الأصدقاء', 'nav.leaderboard': 'الترتيب', 'nav.season': 'الموسم',
    'topbar.notifications': 'الإشعارات', 'topbar.search': 'بحث...',
    'store.title': 'المتجر', 'store.popular': 'الأكثر شعبية', 'store.new': 'جديد', 'store.cheats': 'أكواد الغش', 'store.buy': 'شراء', 'store.play': 'لعب', 'store.owned': 'مملوك', 'store.free': 'مجاني',
    'store.filter.all': 'الكل', 'store.filter.price.free': 'مجاني', 'store.filter.price.paid': 'مدفوع', 'store.recommended': 'موصى لك', 'store.trending': 'رائج', 'store.catalog': 'الكتالوج الكامل',
    'profile.level': 'المستوى', 'profile.trophies': 'الجوائز', 'profile.captures': 'اللقطات', 'profile.friends': 'الأصدقاء', 'profile.settings': 'الإعدادات', 'profile.save': 'حفظ',
    'friends.title': 'الأصدقاء', 'friends.online': 'متصل', 'friends.offline': 'غير متصل', 'friends.pending': 'طلبات معلقة', 'friends.add': 'إضافة صديق', 'friends.search': 'البحث عن لاعب...', 'friends.accept': 'قبول', 'friends.reject': 'رفض', 'friends.remove': 'إزالة', 'friends.playing': 'يلعب', 'friends.invite': 'دعوة',
    'notif.title': 'الإشعارات', 'notif.empty': 'لا توجد إشعارات', 'notif.mark_read': 'قراءة الكل', 'notif.clear': 'مسح الكل',
    'daily.title': 'مكافأة يومية', 'daily.claim': 'استلام', 'daily.claimed': 'تم الاستلام!', 'daily.streak': 'سلسلة', 'daily.day': 'يوم',
    'lb.title': 'الترتيب', 'lb.global': 'عالمي', 'lb.weekly': 'أسبوعي', 'lb.friends': 'الأصدقاء', 'lb.rank': 'المرتبة', 'lb.score': 'النتيجة', 'lb.player': 'اللاعب',
    'chat.title': 'الدردشة', 'chat.send': 'إرسال', 'chat.placeholder': 'اكتب رسالة...', 'chat.private': 'رسائل خاصة', 'chat.room': 'دردشة الغرفة',
    'season.title': 'بطاقة الموسم', 'season.tier': 'المستوى', 'season.remaining': 'الوقت المتبقي', 'season.claim': 'استلام', 'season.premium': 'مميز', 'season.days': 'ي', 'season.hours': 'س',
    'ss.title': 'اللقطات', 'ss.screenshot': 'لقطة شاشة', 'ss.clip': 'مقطع فيديو', 'ss.capture': 'التقاط', 'ss.record': 'تسجيل', 'ss.stop': 'إيقاف', 'ss.delete': 'حذف',
    'cc.volume': 'الصوت', 'cc.theme': 'المظهر', 'cc.device': 'الجهاز', 'cc.language': 'اللغة', 'cc.accessibility': 'إمكانية الوصول', 'cc.animations': 'الحركات', 'cc.colorblind': 'عمى الألوان', 'cc.power': 'الطاقة',
    'general.loading': 'جاري التحميل...', 'general.error': 'خطأ', 'general.cancel': 'إلغاء', 'general.confirm': 'تأكيد', 'general.close': 'إغلاق', 'general.back': 'رجوع',
  },
};

let currentLocale: Locale = 'fr';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('funny_station_locale', locale);
  }
  if (typeof document !== 'undefined') {
    const info = SUPPORTED_LOCALES.find(l => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = info?.dir || 'ltr';
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('funny_locale_changed', { detail: { locale } }));
  }
}

export function getLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('funny_station_locale') as Locale | null;
    if (saved && translations[saved]) {
      currentLocale = saved;
      return saved;
    }
  }
  return currentLocale;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'fr';
  const lang = navigator.language?.split('-')[0] || 'fr';
  if (translations[lang as Locale]) return lang as Locale;
  return 'fr';
}

/**
 * Traduit une clé. Fallback vers le français si la traduction n'existe pas.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  let text = translations[locale]?.[key] || translations['fr']?.[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }

  return text;
}

/** Hook-friendly: initiale la locale au chargement. */
export function initLocale(): Locale {
  const saved = getLocale();
  if (saved !== 'fr') {
    setLocale(saved);
  }
  return saved;
}
