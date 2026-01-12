import { useGameSession } from '@/hooks/useGameSession';
import { Lobby } from './Lobby';
import { GameScreen } from './GameScreen';

export const WerewolfGame = () => {
  const { session } = useGameSession();

  if (session?.status === 'playing') {
    return <GameScreen />;
  }

  return <Lobby />;
};
