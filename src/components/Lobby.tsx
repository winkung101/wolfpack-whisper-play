import { motion } from 'framer-motion';
import { Users, Play, Vote, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import { useGameSession } from '@/hooks/useGameSession';
import { soundManager } from '@/lib/sounds';
import { cn } from '@/lib/utils';

const TARGET_PLAYERS = 6;

export const Lobby = () => {
  const {
    session,
    players,
    currentPlayer,
    isLoading,
    error,
    toggleReady,
    voteToStart,
    startGame,
    allReady,
    voteCount,
    voteThreshold,
    canStartWithVote,
  } = useGameSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังเชื่อมต่อ...</p>
        </motion.div>
      </div>
    );
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

  const needMorePlayers = players.length < TARGET_PLAYERS;
  const canStart = (allReady && players.length >= TARGET_PLAYERS) || canStartWithVote;

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
            รอผู้เล่นทุกคนพร้อมเพื่อเริ่มเกม
          </p>
        </motion.div>

        {/* Player Count */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Users className="text-primary" size={24} />
            <span className="font-medium">ผู้เล่นในห้อง</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              players.length >= TARGET_PLAYERS ? "text-green-400" : "text-amber-400"
            )}>
              {players.length}
            </span>
            <span className="text-muted-foreground">/ {TARGET_PLAYERS}</span>
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

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Ready Button */}
          <Button
            onClick={() => {
              soundManager.playClick();
              toggleReady();
            }}
            className={cn(
              "w-full h-14 text-lg font-semibold transition-all",
              currentPlayer?.is_ready
                ? "bg-green-600 hover:bg-green-700"
                : "bg-primary hover:bg-primary/90"
            )}
            size="lg"
          >
            {currentPlayer?.is_ready ? '✓ พร้อมแล้ว' : 'พร้อม'}
          </Button>

          {/* Vote to Start (if not enough players) */}
          {needMorePlayers && players.length >= 2 && (
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Vote size={20} className="text-amber-400" />
                  <span className="font-medium">โหวตเริ่มเกม</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {voteCount} / {voteThreshold} คะแนน
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                ต้องการ {voteThreshold} เสียงเพื่อเริ่มเกมก่อนครบ {TARGET_PLAYERS} คน
              </p>
              <Button
                onClick={() => {
                  soundManager.playClick();
                  voteToStart();
                }}
                variant="outline"
                className="w-full"
                disabled={currentPlayer?.voted_to_start}
              >
                {currentPlayer?.voted_to_start ? '✓ โหวตแล้ว' : 'โหวตเริ่มเกม'}
              </Button>
            </div>
          )}

          {/* Start Game Button */}
          {canStart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                onClick={() => {
                  soundManager.playClick();
                  startGame();
                }}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-glow-red via-glow-purple to-glow-blue glow-red"
                size="lg"
              >
                <Play className="mr-2" size={24} />
                เริ่มเกม!
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          {needMorePlayers 
            ? `รอผู้เล่นอีก ${TARGET_PLAYERS - players.length} คน หรือโหวตเพื่อเริ่มก่อน`
            : allReady 
              ? 'ทุกคนพร้อมแล้ว! กดเริ่มเกมเลย'
              : 'รอให้ทุกคนกดพร้อม'
          }
        </motion.p>
      </div>
    </div>
  );
};
