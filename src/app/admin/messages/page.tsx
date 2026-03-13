import { getChats } from "@/app/actions/chat";
import ChatInterface from "./_components/ChatInterface";

export const metadata = {
  title: "DABIA Connect | Messages",
  description: "Messagerie intégrée avec vos patients",
};

export default async function MessagesPage() {
  const initialChats = await getChats();

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
      <ChatInterface initialChats={initialChats || []} />
    </div>
  );
}
