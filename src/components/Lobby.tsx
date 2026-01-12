import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Play, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import { useGameSession } from '@/hooks/useGameSession';
import { soundManager } from '@/lib/sounds';

export const Lobby = () => {
  const {
    players,
    currentPlayer,
    toggleReady,
    voteToStart,
    allReady,
    allVoted,
    voteCount,
    voteThreshold,
    canStartWithVote,
    isJoining,
    countdown
  } = useGameSession();

  const handleToggleReady = () => {
    soundManager.playClick();
    toggleReady();
  };

  const handleVoteToStart = () => {
    if (currentPlayer?.voted_to_start) return;
    soundManager.playClick();
    voteToStart();
  };

  if (isJoining) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-medium animate-pulse">กำลังเชื่อมต่อกับห้องเกม...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-foreground tracking-tight"
          >
            Lobby
          </motion.h1>
          <p className="text-muted-foreground">รอผู้เล่นคนอื่นๆ เตรียมพร้อมเพื่อเริ่มเกม</p>
        </header>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center space-y-4 glass-card p-12 rounded-full w-64 h-64 flex flex-col items-center justify-center border-primary/50 shadow-2xl shadow-primary/20">
                <span className="text-sm uppercase tracking-widest text-primary font-bold">เริ่มเกมใน</span>
                <motion.span 
                  key={countdown}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl font-black text-primary"
                >
                  {countdown}
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4 rounded-2xl flex items-center gap-4"
          >
            <div className="bg-primary/10 p-3 rounded-xl">
              <Users className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">ผู้เล่นในห้อง</p>
              <p className="text-2xl font-bold">{players.length} คน</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4 rounded-2xl flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${canStartWithVote ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
              <CheckCircle2 className={canStartWithVote ? 'text-green-500' : 'text-orange-500'} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">คะแนนโหวตเริ่มเกม</p>
              <p className="text-2xl font-bold">{voteCount} / {voteThreshold}</p>
            </div>
          </motion.div>
        </div>

        {/* Players Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            รายชื่อผู้เล่น
            {allReady && (
              <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-normal">
                ทุกคนพร้อมแล้ว!
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isMe={player.id === currentPlayer?.id}
              />
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 glass-card p-6 rounded-3xl border-t shadow-2xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleToggleReady}
              variant={currentPlayer?.is_ready ? "outline" : "default"}
              className="flex-1 h-14 text-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className={`mr-2 ${currentPlayer?.is_ready ? 'text-green-500' : ''}`} />
              {currentPlayer?.is_ready ? 'ยกเลิกเตรียมพร้อม' : 'ฉันพร้อมแล้ว'}
            </Button>

            <Button
              onClick={handleVoteToStart}
              disabled={!currentPlayer?.is_ready || currentPlayer?.voted_to_start || players.length < 2}
              variant={currentPlayer?.voted_to_start ? "secondary" : "default"}
              className="flex-1 h-14 text-lg rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {currentPlayer?.voted_to_start ? (
                <>
                  <CheckCircle2 className="mr-2" />
                  โหวตแล้ว ({voteCount}/{voteThreshold})
                </>
              ) : (
                <>
                  <Play className="mr-2" />
                  โหวตเริ่มเกม
                </>
              )}
            </Button>
          </div>

          {!currentPlayer?.is_ready && (
            <p className="text-center text-sm text-orange-500 flex items-center justify-center gap-1">
              <AlertCircle size={14} />
              ต้องกด "พร้อมแล้ว" ก่อนจึงจะโหวตเริ่มเกมได้
            </p>
          )}

          {countdown !== null && (
            <p className="text-center text-primary font-bold animate-pulse">
              เกมกำลังจะเริ่มในอีก {countdown} วินาที...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};