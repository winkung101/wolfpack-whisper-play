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
  
  // ใช้ useRef เพื่อป้องกันการรันฟังก์ชันซ้ำซ้อนในเครื่องเดียวกัน
  const isStartingRef = useRef(false);

  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem('werewolf_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('werewolf_player_id', playerId);
    }
    return playerId;
  }, []);

  // ดึงรายชื่อผู้เล่นและกรองคนที่ไม่แอคทีฟออก
  const fetchAllPlayers = useCallback(async (sessionId: string) => {
    const { data, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('player_order', { ascending: true });
    
    if (fetchError) {
      console.error("Error fetching players:", fetchError);
      return [];
    }

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
    try {
      setIsJoining(true);
      const playerId = getPlayerId();

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
          player_name: playerName,
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
      setIsJoining(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setIsJoining(false);
    }
  }, [getPlayerId, fetchAllPlayers]);

  useEffect(() => {
    checkExistingPlayer();
  }, [checkExistingPlayer]);

  const toggleReady = useCallback(async () => {
    if (!currentPlayer) return;
    const newReady = !currentPlayer.is_ready;
    const { error } = await supabase.from('players').update({ is_ready: newReady }).eq('id', currentPlayer.id);
    if (!error) {
      setCurrentPlayer(prev => prev ? { ...prev, is_ready: newReady } : null);
      soundManager.playReady();
    }
  }, [currentPlayer]);

  const voteToStart = useCallback(async () => {
    if (!currentPlayer) return;
    const { error } = await supabase.from('players').update({ voted_to_start: true }).eq('id', currentPlayer.id);
    if (!error) {
      setCurrentPlayer(prev => prev ? { ...prev, voted_to_start: true } : null);
      soundManager.playVote();
    }
  }, [currentPlayer]);

  // ฟังก์ชันเริ่มเกมที่ปลอดภัยที่สุด (ทำงานเฉพาะ Host)
  const startGame = useCallback(async () => {
    if (!session || players.length < 2 || isStartingRef.current) return;
    
    isStartingRef.current = true;
    setIsLoading(true);

    try {
      // 1. ดึงข้อมูลล่าสุดเพื่อความแม่นยำ
      const { data: freshPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id)
        .order('player_order', { ascending: true });

      if (!freshPlayers || freshPlayers.length < 2) throw new Error("ผู้เล่นไม่ครบ");

      const roles = assignRoles(freshPlayers.length);
      
      // 2. อัปเดตบทบาทแบบขนาน (Parallel)
      const roleUpdates = freshPlayers.map((p, i) => 
        supabase.from('players').update({ assigned_role: roles[i] }).eq('id', p.id)
      );
      await Promise.all(roleUpdates);

      // 3. เปลี่ยนสถานะห้อง (Atomic Update)
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({ 
          status: 'playing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', session.id)
        .eq('status', 'lobby'); // มั่นใจว่าจะสำเร็จแค่เครื่องเดียว

      if (sessionError) throw sessionError;

      soundManager.playGameStart();
    } catch (err) {
      console.error("Game Start Error:", err);
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
  }, [session]);

  // Heartbeat เพื่อบอกว่าเรายังออนไลน์อยู่
  useEffect(() => {
    if (!currentPlayer) return;
    const interval = setInterval(() => {
      supabase.from('players').update({ last_seen: new Date().toISOString() }).eq('id', currentPlayer.id);
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [currentPlayer]);

  // ระบบ Real-time สำหรับสถานะห้องและรายชื่อผู้เล่น
  useEffect(() => {
    if (!session) return;

    const channel = supabase.channel(`game-${session.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` }, 
        (payload) => setSession(payload.new as GameSession)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` }, 
        async () => {
          await fetchAllPlayers(session.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, fetchAllPlayers]);

  const allVoted = players.length >= 2 && players.every(p => p.voted_to_start);
  const voteCount = players.filter(p => p.voted_to_start).length;
  const voteThreshold = Math.ceil(players.length * 0.5);
  const canStartWithVote = voteCount >= voteThreshold && players.length >= 2;

  // --- ระบบตรวจจับการโหวตเพื่อเริ่มเกมอัตโนมัติ ---
  useEffect(() => {
    if (session?.status === 'lobby' && allVoted && players.length >= 2) {
      // คัดเลือกคนที่เป็น Host (คนแรกในลิสต์ที่เรียงลำดับแล้ว)
      const isHost = players[0]?.id === currentPlayer?.id;

      if (isHost && !isStartingRef.current && !isLoading) {
        console.log("คุณคือหัวห้อง ระบบกำลังเริ่มสุ่มบทบาทให้ทุกคน...");
        startGame();
      }
    }
  }, [allVoted, session?.status, startGame, players, currentPlayer?.id, isLoading]);

  return {
    session, players, currentPlayer, isLoading, isJoining, hasJoined, error,
    joinGame, toggleReady, voteToStart, startGame, resetGame,
    allReady: players.length >= 2 && players.every(p => p.is_ready),
    allVoted, voteCount, voteThreshold, canStartWithVote,
  };
};