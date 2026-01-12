import { Eye, Shield, User, VolumeX, Crown } from 'lucide-react';
import { WolfIcon } from './WolfIcon';
import { cn } from '@/lib/utils';

interface RoleIconProps {
  roleId: string;
  size?: number;
  className?: string;
}

export const RoleIcon = ({ roleId, size = 48, className }: RoleIconProps) => {
  const iconProps = { size, className: cn('text-current', className) };

  switch (roleId) {
    case 'wolf':
      return <WolfIcon size={size} className={className} />;
    case 'seer':
      return <Eye {...iconProps} />;
    case 'bodyguard':
      return <Shield {...iconProps} />;
    case 'beggar':
      return <User {...iconProps} />;
    case 'mute':
      return <VolumeX {...iconProps} />;
    case 'gm':
      return <Crown {...iconProps} />;
    default:
      return <User {...iconProps} />;
  }
};
