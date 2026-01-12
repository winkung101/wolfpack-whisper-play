import { motion } from 'framer-motion';
import { RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MysteryCard } from './MysteryCard';
import { useGameSession } from '@/hooks/useGameSession';
import { soundManager } from '@/lib/sounds';

export const GameScreen = () => {
  const { currentPlayer, players, resetGame } = useGameSession();

  const handleReset = () => {
    soundManager.playClick();
    resetGame();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            บทบาทของคุณ
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentPlayer?.player_name}
          </p>
        </motion.div>

        {/* Mystery Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 20 }}
          className="flex-1 flex items-center justify-center py-4"
        >
          {currentPlayer?.assigned_role && (
            <MysteryCard roleId={currentPlayer.assigned_role} />
          )}
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Player count */}
          <div className="glass-card rounded-xl p-4 flex items-center justify-center gap-2">
            <Users size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ผู้เล่นทั้งหมด {players.length} คน
            </span>
          </div>

          {/* Reset button */}
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="mr-2" size={18} />
            เล่นรอบใหม่
          </Button>

          {/* Warning */}
          <p className="text-center text-xs text-muted-foreground">
            ⚠️ อย่าเปิดเผยบทบาทของคุณกับผู้เล่นคนอื่น!
          </p>
        </motion.div>
      </div>
    </div>
  );
};
