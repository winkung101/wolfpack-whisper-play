import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { assignRoles } from '@/lib/roles';
import { soundManager } from '@/lib/sounds';

interface Player {
  id: string;
  player_name: string;
  player_order: number;
  is_ready: boolean;
  voted_to_start: boolean;
  assigned_role: string | null;
  last_seen: string;
}

interface GameSession {
  id: string;
  status: 'lobby' | 'playing' | 'ended';
  created_at: string;
  started_at: string | null;
}

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const INACTIVE_THRESHOLD = 15000; // 15 seconds

export const useGameSession = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique player ID for this browser session
  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem('werewolf_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('werewolf_player_id', playerId);
    }
    return playerId;
  }, []);

  // Check if player already joined
  const checkExistingPlayer = useCallback(async () => {
    const playerId = getPlayerId();
    
    // Check if player exists in any active session
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*, game_sessions!inner(*)')
      .eq('id', playerId)
      .eq('game_sessions.status', 'lobby')
      .maybeSingle();

    if (existingPlayer) {
      setCurrentPlayer(existingPlayer as Player);
      setSession(existingPlayer.game_sessions as GameSession);
      setHasJoined(true);

      // Update last_seen
      await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', playerId);

      // Fetch all players
      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', existingPlayer.session_id)
        .order('player_order', { ascending: true });

      setPlayers((allPlayers || []) as Player[]);
    }
  }, [getPlayerId]);

  // Join game with name
  const joinGame = useCallback(async (playerName: string) => {
    try {
      setIsJoining(true);
      const playerId = getPlayerId();

      // Find or create an active lobby session
      let { data: existingSession } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'lobby')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingSession) {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({ status: 'lobby' })
          .select()
          .single();

        if (createError) throw createError;
        existingSession = newSession;
      }

      setSession(existingSession as GameSession);

      // Get current player count for ordering
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', existingSession.id);

      const playerOrder = (count || 0) + 1;

      // Create new player
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          session_id: existingSession.id,
          player_name: playerName,
          player_order: playerOrder,
          is_ready: false,
          voted_to_start: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;
      setCurrentPlayer(newPlayer as Player);
      setHasJoined(true);

      // Fetch all players
      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('player_order', { ascending: true });

      setPlayers((allPlayers || []) as Player[]);
      setIsJoining(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setIsJoining(false);
    }
  }, [getPlayerId]);

  // Check on mount
  useEffect(() => {
    checkExistingPlayer();
  }, [checkExistingPlayer]);

  // Toggle ready status
  const toggleReady = useCallback(async () => {
    if (!currentPlayer) return;

    const newReadyState = !currentPlayer.is_ready;
    
    const { error } = await supabase
      .from('players')
      .update({ is_ready: newReadyState })
      .eq('id', currentPlayer.id);

    if (!error) {
      setCurrentPlayer(prev => prev ? { ...prev, is_ready: newReadyState } : null);
      soundManager.playReady();
    }
  }, [currentPlayer]);

  // Vote to start
  const voteToStart = useCallback(async () => {
    if (!currentPlayer) return;

    const { error } = await supabase
      .from('players')
      .update({ voted_to_start: true })
      .eq('id', currentPlayer.id);

    if (!error) {
      setCurrentPlayer(prev => prev ? { ...prev, voted_to_start: true } : null);
      soundManager.playVote();
    }
  }, [currentPlayer]);

  // Start game
  const startGame = useCallback(async () => {
    if (!session || !players.length) return;

    const roles = assignRoles(players.length);
    
    // Assign roles to each player
    const updates = players.map((player, index) => ({
      id: player.id,
      assigned_role: roles[index] || 'beggar',
    }));

    for (const update of updates) {
      await supabase
        .from('players')
        .update({ assigned_role: update.assigned_role })
        .eq('id', update.id);
    }

    // Update session status
    await supabase
      .from('game_sessions')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', session.id);

    soundManager.playGameStart();
  }, [session, players]);

  // Reset game
  const resetGame = useCallback(async () => {
    if (!session) return;

    // Reset all players
    await supabase
      .from('players')
      .update({ 
        is_ready: false, 
        voted_to_start: false, 
        assigned_role: null 
      })
      .eq('session_id', session.id);

    // Reset session
    await supabase
      .from('game_sessions')
      .update({ status: 'lobby', started_at: null })
      .eq('id', session.id);
  }, [session]);

  // Heartbeat - update last_seen
  useEffect(() => {
    if (!currentPlayer) return;

    const interval = setInterval(async () => {
      await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentPlayer.id);
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [currentPlayer]);

  // Real-time subscriptions
  useEffect(() => {
    if (!session) return;

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new as GameSession);
          }
        }
      )
      .subscribe();

    // Subscribe to player changes
    const playersChannel = supabase
      .channel('player-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          // Refresh players list
          const { data: allPlayers } = await supabase
            .from('players')
            .select('*')
            .eq('session_id', session.id)
            .order('player_order', { ascending: true });

          const activePlayers = (allPlayers || []).filter((p: Player) => {
            const lastSeen = new Date(p.last_seen).getTime();
            return Date.now() - lastSeen < INACTIVE_THRESHOLD;
          });

          setPlayers(activePlayers as Player[]);

          // Update current player if needed
          if (payload.eventType === 'UPDATE' && payload.new.id === currentPlayer?.id) {
            setCurrentPlayer(payload.new as Player);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [session, currentPlayer?.id]);


  // Cleanup on unmount
  useEffect(() => {
    const handleUnload = async () => {
      if (currentPlayer) {
        await supabase
          .from('players')
          .delete()
          .eq('id', currentPlayer.id);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentPlayer]);

  const activePlayers = players.filter(p => {
    const lastSeen = new Date(p.last_seen).getTime();
    return Date.now() - lastSeen < INACTIVE_THRESHOLD;
  });

  const allReady = activePlayers.length > 0 && activePlayers.every(p => p.is_ready);
  const voteCount = activePlayers.filter(p => p.voted_to_start).length;
  const voteThreshold = Math.ceil(activePlayers.length * 0.5);
  const canStartWithVote = voteCount >= voteThreshold && activePlayers.length >= 2;
  const allVoted = activePlayers.length >= 2 && activePlayers.every(p => p.voted_to_start);

  return {
    session,
    players: activePlayers,
    currentPlayer,
    isLoading,
    isJoining,
    hasJoined,
    error,
    joinGame,
    toggleReady,
    voteToStart,
    startGame,
    resetGame,
    allReady,
    allVoted,
    voteCount,
    voteThreshold,
    canStartWithVote,
  };
};
