import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  name: string;
  isReady: boolean;
  isCurrentPlayer: boolean;
  votedToStart: boolean;
  index: number;
}

export const PlayerCard = ({ 
  name, 
  isReady, 
  isCurrentPlayer, 
  votedToStart,
  index 
}: PlayerCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={cn(
        'relative glass-card rounded-xl p-4 transition-all duration-300',
        isCurrentPlayer && 'ring-2 ring-primary/50',
        isReady && 'pulse-ready'
      )}
    >
      {/* Glow effect */}
      {isReady && (
        <div className="absolute inset-0 rounded-xl bg-green-500/10 pointer-events-none" />
      )}
      
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
            'bg-gradient-to-br',
            isReady ? 'from-green-500 to-green-700' : 'from-muted to-muted/50'
          )}>
            {name.charAt(name.length - 1)}
          </div>
          
          {/* Name */}
          <div>
            <p className={cn(
              'font-semibold text-foreground',
              isCurrentPlayer && 'text-primary'
            )}>
              {name}
              {isCurrentPlayer && (
                <span className="ml-2 text-xs text-muted-foreground">(คุณ)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {isReady ? 'พร้อมแล้ว' : 'รอสักครู่...'}
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {votedToStart && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center"
              title="โหวตเริ่มเกม"
            >
              <span className="text-xs">🗳️</span>
            </motion.div>
          )}
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              isReady 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isReady ? <Check size={16} /> : <Clock size={16} />}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
