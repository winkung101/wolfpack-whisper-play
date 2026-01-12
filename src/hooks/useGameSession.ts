import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // ป้องกันการรันฟังก์ชันซ้ำซ้อน
  const isStartingRef = useRef(false);

  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem('werewolf_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('werewolf_player_id', playerId);
    }
    return playerId;
  }, []);

  const fetchAllPlayers = useCallback(async (sessionId: string) => {
    const { data, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('player_order', { ascending: true });
    
    if (fetchError) return [];

    if (data) {
      const activeList = data.filter((p: Player) => {
        const lastSeen = new Date(p.last_seen).getTime();
        return Date.now() - lastSeen < INACTIVE_THRESHOLD;
      });
      setPlayers(activeList as Player[]);
      return activeList;
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
      await fetchAllPlayers(existingPlayer.session_id);
    }
  }, [getPlayerId, fetchAllPlayers]);

  const joinGame = useCallback(async (playerName: string) => {
    if (!playerName.trim()) return;
    try {
      setIsJoining(true);
      setError(null);
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
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({ status: 'lobby' })
          .select()
          .single();
        if (createError) throw createError;
        existingSession = newSession;
      }

      setSession(existingSession as GameSession);

      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', existingSession.id);

      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          session_id: existingSession.id,
          player_name: playerName.trim(),
          player_order: (count || 0) + 1,
          is_ready: false,
          voted_to_start: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;
      setCurrentPlayer(newPlayer as Player);
      setHasJoined(true);
      await fetchAllPlayers(existingSession.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsJoining(false);
    }
  }, [getPlayerId, fetchAllPlayers]);

  useEffect(() => {
    checkExistingPlayer();
  }, [checkExistingPlayer]);

  const toggleReady = useCallback(async () => {
    if (!currentPlayer) return;
    const newReady = !currentPlayer.is_ready;
    await supabase.from('players').update({ is_ready: newReady }).eq('id', currentPlayer.id);
    setCurrentPlayer(prev => prev ? { ...prev, is_ready: newReady } : null);
    soundManager.playReady();
  }, [currentPlayer]);

  const voteToStart = useCallback(async () => {
    if (!currentPlayer) return;
    await supabase.from('players').update({ voted_to_start: true }).eq('id', currentPlayer.id);
    setCurrentPlayer(prev => prev ? { ...prev, voted_to_start: true } : null);
    soundManager.playVote();
  }, [currentPlayer]);

  // ฟังก์ชันเริ่มเกม (เฉพาะ Host/Leader เป็นคนเรียก)
  const startGame = useCallback(async () => {
    if (!session || players.length < 2 || isStartingRef.current) return;
    
    isStartingRef.current = true;
    setIsLoading(true);

    try {
      // 1. ดึงข้อมูลล่าสุดเพื่อให้มั่นใจว่าทุกคนอยู่ในลิสต์
      const { data: freshPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id)
        .order('player_order', { ascending: true });

      if (!freshPlayers || freshPlayers.length < 2) throw new Error("ผู้เล่นไม่ครบ");

      // 2. สุ่มบทบาท
      const roles = assignRoles(freshPlayers.length);
      
      // 3. อัปเดตบทบาททุกคน (Parallel)
      await Promise.all(freshPlayers.map((p, i) => 
        supabase.from('players').update({ assigned_role: roles[i] }).eq('id', p.id)
      ));

      // 4. เปลี่ยนสถานะห้องเป็นขั้นตอนสุดท้าย (The Lock)
      const startTime = new Date().toISOString();
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({ status: 'playing', started_at: startTime })
        .eq('id', session.id)
        .eq('status', 'lobby'); // atomic check

      if (sessionError) throw sessionError;

      // 5. บังคับเปลี่ยน State ในเครื่อง Host ทันที
      setSession(prev => prev ? { ...prev, status: 'playing', started_at: startTime } : null);
      soundManager.playGameStart();
      
    } catch (err) {
      console.error("Game Start Sequence Error:", err);
      isStartingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [session, players]);

  const resetGame = useCallback(async () => {
    if (!session) return;
    await supabase.from('players').update({ is_ready: false, voted_to_start: false, assigned_role: null }).eq('session_id', session.id);
    await supabase.from('game_sessions').update({ status: 'lobby', started_at: null }).eq('id', session.id);
    isStartingRef.current = false;
    setCountdown(null);
  }, [session]);

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` }, 
        (payload) => setSession(payload.new as GameSession)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` }, 
        async () => { await fetchAllPlayers(session.id); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, fetchAllPlayers]);

  const allVoted = players.length >= 2 && players.every(p => p.voted_to_start);

  // ระบบนับถอยหลังและการเริ่มเกมแบบ Leader-Follower
  useEffect(() => {
    if (session?.status !== 'lobby' || !allVoted) {
      if (countdown !== null) setCountdown(null);
      return;
    }

    if (countdown === null) {
      setCountdown(5); // เริ่มนับจาก 5
      return;
    }

    if (countdown === 0) {
      // หา Host (คนแรกในลิสต์ตาม player_order)
      const host = players.reduce((prev, curr) => (prev.player_order < curr.player_order) ? prev : curr, players[0]);
      if (host?.id === currentPlayer?.id && !isStartingRef.current && !isLoading) {
        startGame();
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(c => (c !== null && c > 0 ? c - 1 : c));
    }, 1000);

    return () => clearTimeout(timer);
  }, [allVoted, session?.status, countdown, currentPlayer?.id, players, isLoading, startGame]);

  return {
    session, players, currentPlayer, isLoading, isJoining, hasJoined, error, countdown,
    joinGame, toggleReady, voteToStart, startGame, resetGame,
    allReady: players.length >= 2 && players.every(p => p.is_ready),
    allVoted,
    voteCount: players.filter(p => p.voted_to_start).length,
    voteThreshold: Math.ceil(players.length * 0.5),
    canStartWithVote: players.filter(p => p.voted_to_start).length >= Math.ceil(players.length * 0.5) && players.length >= 2,
  };
};