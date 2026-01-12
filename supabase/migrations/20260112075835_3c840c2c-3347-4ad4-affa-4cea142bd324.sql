-- Create game sessions table
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  vote_to_start_threshold NUMERIC DEFAULT 0.5
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_order INTEGER NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  voted_to_start BOOLEAN NOT NULL DEFAULT false,
  assigned_role TEXT,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_players_session ON public.players(session_id);
CREATE INDEX idx_players_last_seen ON public.players(last_seen);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read game sessions (public lobby)
CREATE POLICY "Anyone can read game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (true);

-- Allow anyone to create game sessions
CREATE POLICY "Anyone can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update game sessions
CREATE POLICY "Anyone can update game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (true);

-- Allow anyone to read players
CREATE POLICY "Anyone can read players" 
ON public.players 
FOR SELECT 
USING (true);

-- Allow anyone to create players
CREATE POLICY "Anyone can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update their player
CREATE POLICY "Anyone can update players" 
ON public.players 
FOR UPDATE 
USING (true);

-- Allow anyone to delete players
CREATE POLICY "Anyone can delete players" 
ON public.players 
FOR DELETE 
USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;