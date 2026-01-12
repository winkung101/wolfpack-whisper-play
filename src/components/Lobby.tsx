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
    countdown,
    isLoading
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
            Werewolf Lobby
          </motion.h1>
          <p className="text-muted-foreground">รอผู้เล่นให้พร้อม แล้วโหวตเพื่อสุ่มบทบาท</p>
        </header>

        {/* Countdown Overlay - ปรากฏเมื่อทุกคนโหวตครบ */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
            >
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="glass-card p-12 rounded-full w-72 h-72 flex flex-col items-center justify-center border-primary shadow-2xl shadow-primary/20"
                >
                  <span className="text-sm uppercase tracking-[0.3em] text-primary font-bold mb-2">สุ่มบทบาทใน</span>
                  <motion.span 
                    key={countdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-9xl font-black text-primary leading-none"
                  >
                    {countdown}
                  </motion.span>
                </motion.div>
                <p className="text-muted-foreground animate-pulse tracking-wide">
                  {isLoading ? "กำลังประมวลผลบทบาท..." : "เตรียมตัวให้พร้อม!"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border-white/5">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Users className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">ผู้เล่นออนไลน์</p>
              <p className="text-2xl font-bold">{players.length}</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border-white/5">
            <div className={`p-3 rounded-xl ${canStartWithVote ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
              <CheckCircle2 className={canStartWithVote ? 'text-green-500' : 'text-orange-500'} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">โหวตเริ่มเกม</p>
              <p className="text-2xl font-bold">{voteCount} / {voteThreshold}</p>
            </div>
          </div>
        </div>

        {/* Player List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">รายชื่อผู้เล่น</h2>
            {allVoted && (
              <span className="flex items-center gap-1.5 text-xs text-primary font-bold animate-pulse">
                <span className="w-2 h-2 bg-primary rounded-full" />
                โหวตครบแล้ว!
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <PlayerCard 
                key={p.id} 
                player={p} 
                isMe={p.id === currentPlayer?.id} 
              />
            ))}
          </div>
        </div>

        {/* Sticky Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 pointer-events-auto"
          >
            <Button
              onClick={handleToggleReady}
              variant={currentPlayer?.is_ready ? "secondary" : "default"}
              className="flex-1 h-16 text-lg rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
            >
              <CheckCircle2 className={`mr-2 ${currentPlayer?.is_ready ? 'text-green-500' : ''}`} />
              {currentPlayer?.is_ready ? 'ยกเลิกเตรียมพร้อม' : 'ฉันพร้อมแล้ว'}
            </Button>

            <Button
              onClick={handleVoteToStart}
              disabled={!currentPlayer?.is_ready || currentPlayer?.voted_to_start || players.length < 2}
              className={`flex-1 h-16 text-lg rounded-2xl font-bold shadow-xl shadow-orange-500/20 active:scale-95 transition-transform bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-none`}
            >
              {currentPlayer?.voted_to_start ? (
                <>
                  <CheckCircle2 className="mr-2" />
                  โหวตแล้ว ({voteCount}/{voteThreshold})
                </>
              ) : (
                <>
                  <Play className="mr-2 fill-current" />
                  โหวตเริ่มสุ่มบทบาท
                </>
              )}
            </Button>
          </motion.div>
          {!currentPlayer?.is_ready && (
            <p className="max-w-4xl mx-auto text-center mt-3 text-xs text-orange-400 font-medium flex items-center justify-center gap-1">
              <AlertCircle size={12} /> ต้องกด "พร้อมแล้ว" ก่อนจึงจะโหวตเริ่มสุ่มบทบาทได้
            </p>
          )}
        </div>
        
        {/* Padding for sticky footer */}
        <div className="h-32" />
      </div>
    </div>
  );
};