-- Migration: Create push_subscriptions table for Web Push Notifications
-- Created: 2026-05-07

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription jsonb NOT NULL, -- Contiene endpoint, p256dh y auth
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Índice único para evitar duplicados y permitir UPSERT (basado en el endpoint del navegador)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx 
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios gestionen sus propias suscripciones
-- Asumimos que public.users.authId coincide con el UUID de autenticación de Supabase
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE authId = auth.uid()::text
    )
  );

-- Añadir columna de seguimiento a safecare_requests
ALTER TABLE public.safecare_requests 
ADD COLUMN IF NOT EXISTS followup_sent boolean DEFAULT false;

COMMENT ON TABLE public.push_subscriptions IS 'Almacena las suscripciones de Web Push de los usuarios para notificaciones en el navegador.';
