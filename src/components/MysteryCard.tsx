import { useState } from 'react';
import { motion } from 'framer-motion';
import { RoleIcon } from './RoleIcon';
import { getRoleById } from '@/lib/roles';
import { soundManager } from '@/lib/sounds';
import { cn } from '@/lib/utils';

interface MysteryCardProps {
  roleId: string;
}

export const MysteryCard = ({ roleId }: MysteryCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const role = getRoleById(roleId);

  const handleFlip = () => {
    if (!isFlipped) {
      soundManager.playReveal();
      setIsFlipped(true);
    }
  };

  if (!role) return null;

  return (
    <div className="mystery-card w-full max-w-sm mx-auto">
      <motion.div
        className="relative w-full aspect-[3/4] cursor-pointer"
        onClick={handleFlip}
        whileHover={{ scale: isFlipped ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="mystery-card-inner w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Back (Mystery) */}
          <div className="mystery-card-face absolute inset-0 glass-card rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-glow-red/20 via-glow-purple/20 to-glow-blue/20" />
            
            {/* Decorative patterns */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 left-4 w-12 h-12 border-2 border-primary/50 rounded-lg rotate-45" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-2 border-secondary/50 rounded-lg rotate-45" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-accent/50 rounded-full" />
            </div>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
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
              <h3 className="text-xl font-bold text-foreground text-glow-red mb-2">
                การ์ดปริศนา
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                แตะเพื่อเปิดเผยบทบาทของคุณ
              </p>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer pointer-events-none" />
            </div>
          </div>

          {/* Card Front (Revealed Role) */}
          <div 
            className={cn(
              "mystery-card-face mystery-card-back absolute inset-0 glass-card rounded-2xl overflow-hidden",
              `bg-gradient-to-br ${role.color}`
            )}
          >
            <div className="absolute inset-0 bg-black/30" />
            
            <div className="relative h-full flex flex-col items-center justify-center p-8">
              {/* Role Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={isFlipped ? { scale: 1, rotate: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
                className="mb-6"
              >
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                  <RoleIcon roleId={role.id} size={56} className="text-white" />
                </div>
              </motion.div>

              {/* Role Name */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isFlipped ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="text-3xl font-bold text-white text-center mb-3"
              >
                {role.name}
              </motion.h2>

              {/* Role Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isFlipped ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="text-white/80 text-center text-sm leading-relaxed"
              >
                {role.description}
              </motion.p>

              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-8 h-8 border border-white/30 rounded-full" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border border-white/30 rounded-full" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {!isFlipped && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-4 text-muted-foreground text-sm animate-pulse"
        >
          👆 แตะการ์ดเพื่อเปิดเผย
        </motion.p>
      )}
    </div>
  );
};
