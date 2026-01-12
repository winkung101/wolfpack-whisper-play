import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { soundManager } from '@/lib/sounds';

interface NameEntryProps {
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export const NameEntry = ({ onSubmit, isLoading }: NameEntryProps) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      soundManager.playJoin();
      onSubmit(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="text-7xl mb-6"
          >
            🐺
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-glow-red mb-3">
            เกมหมาป่า
          </h1>
          <p className="text-muted-foreground">
            ใส่ชื่อของคุณเพื่อเข้าร่วมเกม
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User size={16} className="text-primary" />
              ชื่อผู้เล่น
            </label>
            <Input
              type="text"
              placeholder="ใส่ชื่อของคุณ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 text-lg bg-background/50 border-muted-foreground/20 focus:border-primary"
              maxLength={20}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-glow-red via-glow-purple to-glow-blue glow-red"
            size="lg"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                เข้าร่วมเกม
                <ArrowRight className="ml-2" size={20} />
              </>
            )}
          </Button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          ผู้เล่นทุกคนโหวต = เริ่มสุ่มบทบาททันที
        </motion.p>
      </motion.div>
    </div>
  );
};
