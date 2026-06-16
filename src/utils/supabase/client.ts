import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Détecter si les variables d'environnement Supabase sont présentes
const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Exporter le vrai client si configuré, sinon un Mock intelligent
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createMockSupabaseClient() as any);

console.log(
  isSupabaseConfigured
    ? "[Supabase] Connecté au serveur réel Supabase Cloud."
    : "[Supabase] Variables d'environnement non détectées. Utilisation du simulateur local."
);

// MOCK INTELLIGENT DE SUPABASE POUR LE MODE HORS-LIGNE
function createMockSupabaseClient() {
  const mockUser = {
    id: 'mock-user-uuid-123456789',
    email: 'kratos@funnystation.local',
    user_metadata: { username: 'Kratos' }
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
      getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
      signInWithPassword: async () => ({ data: { user: mockUser }, error: null }),
      signOut: async () => ({ error: null })
    },

    // Simulateur de table SQL / Requêtes
    from: (tableName: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            // Retourner des données simulées selon le cas
            if (tableName === 'profiles') {
              return { data: { id: mockUser.id, username: 'Kratos', funny_coins: 5000 }, error: null };
            }
            return { data: null, error: null };
          },
          eq: () => ({
            single: async () => ({ data: null, error: null })
          })
        }),
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null })
      }),
      insert: async () => ({ data: null, error: null }),
      upsert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: async () => ({ data: null, error: null })
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null })
      })
    }),

    // Simulateur de canaux temps réel (Realtime Presence / Broadcast via BroadcastChannel local)
    channel: (channelName: string) => {
      console.log(`[Mock Supabase Realtime] Souscription au canal: ${channelName}`);
      const listeners: { [event: string]: Function[] } = {};
      let presenceState: any = {};

      const bc = typeof window !== 'undefined' ? new BroadcastChannel('supabase-mock:' + channelName) : null;

      if (bc) {
        bc.onmessage = (e) => {
          const { type, event, payload } = e.data;
          const eventKey = `${type}:${event || '*'}`;
          const allEventsKey = `${type}:*`;

          if (listeners[eventKey]) {
            listeners[eventKey].forEach(cb => cb({ payload }));
          }
          if (listeners[allEventsKey]) {
            listeners[allEventsKey].forEach(cb => cb({ payload }));
          }

          if (type === 'presence' && event === 'sync') {
            presenceState = payload.presenceState;
            const syncListeners = listeners['presence:sync'] || [];
            syncListeners.forEach(cb => cb());
          }
        };
      }

      const channelObj = {
        on: (type: string, filter: any, callback: Function) => {
          const eventKey = `${type}:${filter.event || '*'}`;
          if (!listeners[eventKey]) listeners[eventKey] = [];
          listeners[eventKey].push(callback);
          return channelObj;
        },
        subscribe: (callback: Function) => {
          setTimeout(() => {
            if (callback) callback('SUBSCRIBED');
          }, 100);
          return channelObj;
        },
        track: async (state: any) => {
          presenceState[mockUser.id] = [state];
          if (bc) {
            bc.postMessage({
              type: 'presence',
              event: 'sync',
              payload: { presenceState }
            });
          }
          const syncListeners = listeners['presence:sync'] || [];
          syncListeners.forEach(cb => cb());
          return 'ok';
        },
        send: async (payload: any) => {
          console.log(`[Mock Realtime Broadcast] Envoi de l'événement ${payload.event} :`, payload.payload);
          if (bc) {
            bc.postMessage({
              type: payload.type || 'broadcast',
              event: payload.event,
              payload: payload.payload
            });
          }
          return 'ok';
        },
        presenceState: () => presenceState,
        unsubscribe: () => {
          console.log(`[Mock Supabase Realtime] Désabonnement du canal: ${channelName}`);
          if (bc) {
            bc.close();
          }
        }
      };

      return channelObj;
    }
  };
}
