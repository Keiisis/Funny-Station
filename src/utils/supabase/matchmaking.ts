import { supabase } from './client';

export const joinLobbyAndSyncInputs = (
  lobbyId: string, 
  userId: string, 
  onInputChange: (peerId: string, keys: any) => void
) => {
  const channel = supabase.channel(`lobby:${lobbyId}`, {
    config: {
      broadcast: { self: false, ack: false }, // Broadcast ultra rapide non-bloquant
      presence: { key: userId }
    }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log('Utilisateurs connectés au salon:', state);
    })
    .on('broadcast', { event: 'controller_state' }, ({ payload }: any) => {
      onInputChange(payload.userId, payload.axesAndButtons);
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        // Enregistrer la présence locale
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

  // Envoyer ses propres inputs de manette aux autres joueurs
  const sendMyInputs = (axesAndButtons: any) => {
    channel.send({
      type: 'broadcast',
      event: 'controller_state',
      payload: { userId, axesAndButtons }
    });
  };

  return {
    sendMyInputs,
    leave: () => channel.unsubscribe()
  };
};
