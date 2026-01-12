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

const HEARTBEAT_INTERVAL = 3000; // 3 วินาที
const INACTIVE_THRESHOLD = 30000; // 30 วินาที - เกณฑ์คนหลุด

export const useGameSession = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // สร้างหรือดึง Player ID จากเครื่องผู้เล่น
  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem('werewolf_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('werewolf_player_id', playerId);
    }
    return playerId;
  }, []);

  // ตรวจสอบว่าเคยเข้าห้องอยู่แล้วหรือไม่
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

      await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', playerId);

      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', existingPlayer.session_id)
        .order('player_order', { ascending: true });

      setPlayers((allPlayers || []) as Player[]);
    }
  }, [getPlayerId]);

  // เข้าร่วมเกม
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

      const playerOrder = (count || 0) + 1;

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

      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('player_order', { ascending: true });

      setPlayers((allPlayers || []) as Player[]);
      setIsJoining(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าร่วม');
      setIsJoining(false);
    }
  }, [getPlayerId]);

  useEffect(() => {
    checkExistingPlayer();
  }, [checkExistingPlayer]);

  // เปลี่ยนสถานะ Ready
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

  // โหวตเพื่อเริ่มเกม
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

  // ฟังก์ชันสุ่มบทบาทและเริ่มเกม
  const startGame = useCallback(async () => {
    if (!session || !players.length) return;

    // สุ่มบทบาท
    const roles = assignRoles(players.length);
    
    // อัปเดตบทบาทให้ผู้เล่นแต่ละคน
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

    // เปลี่ยนสถานะห้องเป็น playing
    await supabase
      .from('game_sessions')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', session.id);

    soundManager.playGameStart();
  }, [session, players]);

  // รีเซ็ตเกมเพื่อเล่นรอบใหม่
  const resetGame = useCallback(async () => {
    if (!session) return;
    await supabase
      .from('players')
      .update({ 
        is_ready: false, 
        voted_to_start: false, 
        assigned_role: null 
      })
      .eq('session_id', session.id);

    await supabase
      .from('game_sessions')
      .update({ status: 'lobby', started_at: null })
      .eq('id', session.id);
  }, [session]);

  // ส่งสัญญาณชีพ (Heartbeat)
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

  // สมัครรับข้อมูล Real-time
  useEffect(() => {
    if (!session) return;

    const sessionChannel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as GameSession)
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`players-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` },
        async (payload) => {
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

  // การคำนวณสถานะต่างๆ ใน Lobby
  const activePlayers = players.filter(p => {
    const lastSeen = new Date(p.last_seen).getTime();
    return Date.now() - lastSeen < INACTIVE_THRESHOLD;
  });

  const allReady = activePlayers.length >= 2 && activePlayers.every(p => p.is_ready);
  const voteCount = activePlayers.filter(p => p.voted_to_start).length;
  const voteThreshold = Math.ceil(activePlayers.length * 0.5);
  const canStartWithVote = voteCount >= voteThreshold && activePlayers.length >= 2;
  const allVoted = activePlayers.length >= 2 && activePlayers.every(p => p.voted_to_start);

  // --- ส่วนที่แก้ไข: Auto-start เมื่อโหวตครบ ---
  useEffect(() => {
    // ถ้าสถานะเป็น lobby และทุกคนโหวตครบ (หรือถึงเกณฑ์)
    if (session?.status === 'lobby' && allVoted) {
      console.log("ทุกคนโหวตแล้ว กำลังเริ่มเกม...");
      startGame();
    }
  }, [allVoted, session?.status, startGame]);
  // ------------------------------------------

  // ลบชื่อออกจากห้องเมื่อปิด Browser
  useEffect(() => {
    const handleUnload = async () => {
      if (currentPlayer) {
        await supabase.from('players').delete().eq('id', currentPlayer.id);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentPlayer]);

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