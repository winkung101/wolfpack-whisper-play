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

const HEARTBEAT_INTERVAL = 3000;
const INACTIVE_THRESHOLD = 30000;

export const useGameSession = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem('werewolf_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('werewolf_player_id', playerId);
    }
    return playerId;
  }, []);

  const fetchPlayers = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('player_order', { ascending: true });
    
    if (data) {
      const active = data.filter(p => {
        const lastSeen = new Date(p.last_seen).getTime();
        return Date.now() - lastSeen < INACTIVE_THRESHOLD;
      });
      setPlayers(active as Player[]);
      return active;
    }
    return [];
  }, []);

  const checkExistingPlayer = useCallback(async () => {
    const playerId = getPlayerId();
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
      await fetchPlayers(existingPlayer.session_id);
    }
  }, [getPlayerId, fetchPlayers]);

  const joinGame = useCallback(async (playerName: string) => {
    if (!playerName.trim()) return;
    try {
      setIsJoining(true);
      const playerId = getPlayerId();
      await supabase.from('players').delete().eq('id', playerId);

      let { data: existingSession } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'lobby')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingSession) {
        const { data: newSession } = await supabase
          .from('game_sessions')
          .insert({ status: 'lobby' })
          .select()
          .single();
        existingSession = newSession;
      }

      if (!existingSession) return;
      setSession(existingSession as GameSession);

      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', existingSession.id);

      const { data: newPlayer, error: pError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          session_id: existingSession.id,
          player_name: playerName.trim(),
          player_order: (count || 0) + 1,
        })
        .select()
        .single();

      if (pError) throw pError;
      setCurrentPlayer(newPlayer as Player);
      setHasJoined(true);
      await fetchPlayers(existingSession.id);
    } catch (err) {
      setError('ไม่สามารถเข้าห้องได้');
    } finally {
      setIsJoining(false);
    }
  }, [getPlayerId, fetchPlayers]);

  useEffect(() => { checkExistingPlayer(); }, [checkExistingPlayer]);

  const toggleReady = async () => {
    if (!currentPlayer) return;
    const nextState = !currentPlayer.is_ready;
    await supabase.from('players').update({ is_ready: nextState }).eq('id', currentPlayer.id);
    setCurrentPlayer(p => p ? { ...p, is_ready: nextState } : null);
    soundManager.playReady();
  };

  const voteToStart = async () => {
    if (!currentPlayer) return;
    await supabase.from('players').update({ voted_to_start: true }).eq('id', currentPlayer.id);
    setCurrentPlayer(p => p ? { ...p, voted_to_start: true } : null);
    soundManager.playVote();
  };

  // ฟังก์ชันสุ่มบทบาทและเริ่มเกมแบบง่าย
  const startGame = useCallback(async () => {
    if (!session || players.length < 2 || isLoading) return;
    setIsLoading(true);

    try {
      const roles = assignRoles(players.length);
      
      // อัปเดตบทบาท
      await Promise.all(players.map((p, i) => 
        supabase.from('players').update({ assigned_role: roles[i] }).eq('id', p.id)
      ));

      // เปลี่ยนสถานะห้อง
      await supabase
        .from('game_sessions')
        .update({ status: 'playing', started_at: new Date().toISOString() })
        .eq('id', session.id)
        .eq('status', 'lobby');

      soundManager.playGameStart();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [session, players, isLoading]);

  const resetGame = async () => {
    if (!session) return;
    await supabase.from('players').update({ is_ready: false, voted_to_start: false, assigned_role: null }).eq('session_id', session.id);
    await supabase.from('game_sessions').update({ status: 'lobby', started_at: null }).eq('id', session.id);
  };

  useEffect(() => {
    if (!currentPlayer) return;
    const interval = setInterval(() => {
      supabase.from('players').update({ last_seen: new Date().toISOString() }).eq('id', currentPlayer.id);
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [currentPlayer]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel(`game-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` }, 
        (payload) => setSession(payload.new as GameSession)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` }, 
        () => { fetchPlayers(session.id); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, fetchPlayers]);

  const allVoted = players.length >= 2 && players.every(p => p.voted_to_start);

  // ตรวจจับเมื่อโหวตครบ ให้เริ่มเกมทันที (เอาคนแรกที่เห็นเป็นคนสั่ง)
  useEffect(() => {
    if (allVoted && session?.status === 'lobby' && players[0]?.id === currentPlayer?.id) {
      startGame();
    }
  }, [allVoted, session?.status, players, currentPlayer?.id, startGame]);

  return {
    session, players, currentPlayer, isLoading, isJoining, hasJoined, error,
    joinGame, toggleReady, voteToStart, startGame, resetGame,
    allReady: players.length >= 2 && players.every(p => p.is_ready),
    allVoted,
    voteCount: players.filter(p => p.voted_to_start).length,
    voteThreshold: Math.ceil(players.length * 0.5),
    canStartWithVote: players.filter(p => p.voted_to_start).length >= Math.ceil(players.length * 0.5) && players.length >= 2,
    countdown: null // ตัดออกเพื่อความง่ายตามคำขอ
  };
};