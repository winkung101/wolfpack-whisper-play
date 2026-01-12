import { motion } from 'framer-motion';
import { Users, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { PlayerCard } from './PlayerCard';
import { useGameSession } from '../hooks/useGameSession';
import { soundManager } from '../lib/sounds';

export const Lobby = () => {
  const {
    players,
    currentPlayer,
    voteToStart,
    allVoted,
    voteCount,
    isJoining,
    isLoading
  } = useGameSession();

  const handleVoteToStart = () => {
    if (currentPlayer?.voted_to_start) return;
    soundManager.playClick();
    voteToStart();
  };

  if (isJoining) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0c]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-medium animate-pulse text-white">กำลังเชื่อมต่อกับห้องเกม...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0a0a0c] text-white">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Lobby
          </motion.h1>
          <p className="text-gray-400">โหวตให้ครบเพื่อเริ่มสุ่มบทบาททันที</p>
        </header>

        {/* Loading Overlay when starting */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-2xl font-bold text-white animate-pulse">กำลังสุ่มบทบาทให้ทุกคน...</p>
          </div>
        )}

        {/* Status Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-xl">
              <Users className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">ผู้เล่นออนไลน์</p>
              <p className="text-3xl font-bold">{players.length}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <CheckCircle2 className="text-green-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">โหวตแล้ว</p>
              <p className="text-3xl font-bold">{voteCount} <span className="text-sm text-gray-500">/ {players.length}</span></p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">รายชื่อเพื่อนร่วมฝูง</h2>
            {allVoted && (
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full animate-pulse border border-primary/30">
                โหวตครบแล้ว! กำลังเริ่มเกม...
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

        {/* Action Button */}
        <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none">
          <div className="max-w-sm w-full pointer-events-auto">
            <Button
              onClick={handleVoteToStart}
              disabled={currentPlayer?.voted_to_start || players.length < 2 || isLoading}
              className={`w-full h-16 text-xl rounded-2xl font-black shadow-2xl transition-all active:scale-95 border-b-4 ${
                currentPlayer?.voted_to_start 
                  ? "bg-gray-800 border-gray-900 text-gray-500 cursor-not-allowed" 
                  : "bg-primary border-[#8b0000] hover:bg-primary/90 text-white"
              }`}
            >
              {currentPlayer?.voted_to_start ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  รอเพื่อนโหวต ({voteCount}/{players.length})
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="w-6 h-6 fill-current" />
                  โหวตเริ่มสุ่มบทบาท
                </div>
              )}
            </Button>
            {players.length < 2 && (
              <p className="text-center text-xs mt-3 text-gray-500 font-medium">
                ต้องการผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม
              </p>
            )}
          </div>
        </div>
        
        {/* Spacer for sticky button */}
        <div className="h-24" />
      </div>
    </div>
  );
};