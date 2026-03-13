"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Send, User, Paperclip, MoreVertical, Phone, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendWhatsAppMessage, getChatMessages, markChatAsRead, searchPatients, createOrGetChat } from "@/app/actions/chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Chat {
  id: string;
  remote_jid: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
}

interface Message {
  id: string;
  chat_id: string;
  content: string;
  from_me: boolean;
  timestamp: string;
  message_type: string;
}

export default function ChatInterface({ initialChats }: { initialChats: any[] }) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when selecting a chat
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
      markChatAsRead(selectedChatId);
    }
  }, [selectedChatId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.chat_id === selectedChatId) {
          setMessages(prev => [...prev, newMsg]);
        }
        // Update last message in chat list
        setChats(prev => {
          const updated = prev.map(chat => 
            chat.id === newMsg.chat_id 
              ? { ...chat, last_message: newMsg.content, last_message_at: newMsg.timestamp }
              : chat
          );
          // If message is for a chat not in list, we might need to refetch list but for now just sort what we have
          return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, supabase]);

  // Patient search for new chat
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (patientSearch.length >= 2) {
        setIsSearchingPatients(true);
        const results = await searchPatients(patientSearch);
        setPatientResults(results);
        setIsSearchingPatients(false);
      } else {
        setPatientResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientSearch]);

  async function loadMessages(chatId: string) {
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
    } catch (err) {
      toast.error("Échec du chargement des messages");
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId || !selectedChat) return;

    setIsSending(true);
    const text = newMessage;
    setNewMessage("");

    try {
      const res = await sendWhatsAppMessage(selectedChatId, selectedChat.remote_jid, text);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      toast.error("Échec de l'envoi");
    } finally {
      setIsSending(false);
    }
  }

  async function handleStartChat(patientId: string) {
    setIsNewChatOpen(false);
    setPatientSearch("");
    
    toast.promise(createOrGetChat(patientId), {
      loading: 'Initialisation de la conversation...',
      success: (data) => {
        if (data.success) {
          setSelectedChatId(data.chatId);
          // Refresh chat list to include new chat
          // (In a real app, you might refetch from server or use the returned chat object)
          window.location.reload(); // Simple way to refresh for now
          return 'Conversation prête';
        }
        throw new Error(data.error);
      },
      error: (err) => `Erreur: ${err.message}`
    });
  }

  const filteredChats = chats.filter(chat => {
    const name = `${chat.patient?.first_name || ""} ${chat.patient?.last_name || ""}`.toLowerCase();
    const phone = chat.remote_jid.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 px-1">Conversations</h2>
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger
                render={
                  <div 
                    role="button"
                    className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                  </div>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouveau Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Chercher par nom ou téléphone..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {isSearchingPatients ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : patientResults.length > 0 ? (
                      patientResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleStartChat(p.id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-slate-500">{p.phone_number}</p>
                          </div>
                        </button>
                      ))
                    ) : patientSearch.length >= 2 ? (
                      <p className="text-center py-4 text-sm text-slate-500">Aucun patient trouvé</p>
                    ) : (
                      <p className="text-center py-4 text-xs text-slate-400 italic">Tapez au moins 2 caractères...</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={cn(
                "w-full p-4 flex gap-3 items-start hover:bg-white transition-colors border-b border-slate-100/50",
                selectedChatId === chat.id && "bg-white shadow-sm ring-1 ring-slate-200/50"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-900 truncate">
                    {chat.patient ? `${chat.patient.first_name} ${chat.patient.last_name}` : chat.remote_jid.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {format(new Date(chat.last_message_at), "HH:mm")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate line-clamp-1 italic">
                  {chat.last_message}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {selectedChatId ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  {selectedChat?.patient ? `${selectedChat.patient.first_name} ${selectedChat.patient.last_name}` : selectedChat?.remote_jid.split("@")[0]}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Patient Connecté</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[70%]",
                  msg.from_me ? "ml-auto items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    msg.from_me
                      ? "bg-primary text-white rounded-tr-none"
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {format(new Date(msg.timestamp), "HH:mm")}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <button
                type="button"
                className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Écrivez votre message..."
                className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="p-2.5 bg-primary text-white rounded-xl shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/10">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
            <User className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Pas de conversation sélectionnée</h3>
          <p className="text-sm mt-1">Choisissez un patient pour commencer à discuter.</p>
        </div>
      )}
    </div>
  );
}
