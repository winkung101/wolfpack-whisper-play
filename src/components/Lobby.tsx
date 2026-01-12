import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import { useGameSession } from '@/hooks/useGameSession';
import { soundManager } from '@/lib/sounds';
import { cn } from '@/lib/utils';
import { NameEntry } from './NameEntry';

export const Lobby = () => {
  const {
    session,
    players,
    currentPlayer,
    isJoining,
    hasJoined,
    error,
    joinGame,
    voteToStart,
    startGame,
    allVoted,
    voteCount,
  } = useGameSession();

  const hasStartedRef = useRef(false);

  // Auto-start when all players voted
  useEffect(() => {
    if (allVoted && !hasStartedRef.current && session?.status === 'lobby') {
      hasStartedRef.current = true;
      soundManager.playClick();
      startGame();
    }
  }, [allVoted, session?.status, startGame]);

  // Reset ref when game resets
  useEffect(() => {
    if (session?.status === 'lobby') {
      hasStartedRef.current = false;
    }
  }, [session?.status]);

  // Show name entry if not joined
  if (!hasJoined) {
    return <NameEntry onSubmit={joinGame} isLoading={isJoining} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 max-w-md w-full text-center"
        >
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            ลองใหม่อีกครั้ง
          </Button>
        </motion.div>
      </div>
    );
  }

  const totalPlayers = players.length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="text-6xl mb-4"
          >
            🐺
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground text-glow-red mb-2">
            เกมหมาป่า
          </h1>
          <p className="text-muted-foreground">
            โหวตครบทุกคน = เริ่มสุ่มบทบาท!
          </p>
        </motion.div>

        {/* Player Count & Vote Progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Users className="text-primary" size={24} />
              <span className="font-medium">ผู้เล่นในห้อง</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {totalPlayers}
            </span>
          </div>
          
          {/* Vote Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Vote size={16} className="text-amber-400" />
                <span className="text-muted-foreground">โหวตเริ่มเกม</span>
              </div>
              <span className={cn(
                "font-medium",
                voteCount === totalPlayers && totalPlayers >= 2 ? "text-green-400" : "text-muted-foreground"
              )}>
                {voteCount} / {totalPlayers}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-green-500"
                initial={{ width: 0 }}
                animate={{ width: totalPlayers > 0 ? `${(voteCount / totalPlayers) * 100}%` : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Players List */}
        <div className="space-y-3 mb-6">
          {players.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-8 text-center"
            >
              <p className="text-muted-foreground">
                รอผู้เล่นคนอื่นเข้าร่วม...
              </p>
            </motion.div>
          ) : (
            players.map((player, index) => (
              <PlayerCard
                key={player.id}
                name={player.player_name}
                isReady={player.is_ready}
                isCurrentPlayer={player.id === currentPlayer?.id}
                votedToStart={player.voted_to_start}
                index={index}
              />
            ))
          )}
        </div>

        {/* Vote Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => {
              soundManager.playVote();
              voteToStart();
            }}
            disabled={currentPlayer?.voted_to_start || totalPlayers < 2}
            className={cn(
              "w-full h-14 text-lg font-semibold transition-all",
              currentPlayer?.voted_to_start
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gradient-to-r from-glow-red via-glow-purple to-glow-blue glow-red"
            )}
            size="lg"
          >
            {currentPlayer?.voted_to_start ? (
              '✓ โหวตแล้ว รอคนอื่น...'
            ) : totalPlayers < 2 ? (
              'รออย่างน้อย 2 คน'
            ) : (
              <>
                <Vote className="mr-2" size={20} />
                โหวตเริ่มเกม
              </>
            )}
          </Button>
        </motion.div>

        {/* Status Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          {totalPlayers < 2 
            ? 'รอผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม'
            : allVoted
              ? 'ทุกคนโหวตแล้ว! กำลังเริ่มสุ่ม...'
              : `รออีก ${totalPlayers - voteCount} คนโหวต`
          }
        </motion.p>
      </div>
    </div>
  );
};
