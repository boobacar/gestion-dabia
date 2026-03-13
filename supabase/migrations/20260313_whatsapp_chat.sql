-- Migration: WhatsApp Chat Integration
-- Description: Tables for storing WhatsApp conversations and messages

-- Table for Chats (Conversations)
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remote_jid TEXT UNIQUE NOT NULL, -- e.g. 22112345678@s.whatsapp.net
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    wa_message_id TEXT UNIQUE NOT NULL, -- WhatsApp internal ID
    content TEXT,
    message_type TEXT DEFAULT 'text', -- text, image, document, audio, video
    from_me BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'sent', -- pending, sent, delivered, read
    media_url TEXT, -- If applicable
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_patient_id ON public.whatsapp_chats(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_remote_jid ON public.whatsapp_chats(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Simple policies (Admins can do anything)
CREATE POLICY "Admins have full access to chats" ON public.whatsapp_chats
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Admins have full access to messages" ON public.whatsapp_messages
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
