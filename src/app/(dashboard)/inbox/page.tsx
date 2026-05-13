"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import {
  Search,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageCircle,
  Send,
  Paperclip,
  Smile,
  User,
  Star,
  ThumbsDown,
  ArrowLeft,
  Bot,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface IncomingMessage {
  id: string;
  body: string;
  channel: string;
  status: string;
  notes: string | null;
  receivedAt: string;
  contact: {
    id: string;
    name: string | null;
    phoneNumber: string;
    company: string | null;
  };
}

interface MessageLog {
  id: string;
  messageBody: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  body: string;
  timestamp: string;
  direction: "incoming" | "outgoing";
  status: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  SENT: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
  DELIVERED: <CheckCheck className="h-3 w-3 text-blue-400" />,
  FAILED: <AlertCircle className="h-3 w-3 text-destructive" />,
  PENDING: <Clock className="h-3 w-3 text-muted-foreground" />,
  WAITING: <Clock className="h-3 w-3 text-muted-foreground" />,
  SENDING: <Clock className="h-3 w-3 text-amber-400" />,
};

const inboxStatusColors: Record<string, string> = {
  NEW: "bg-emerald-500",
  REPLIED: "bg-blue-500",
  INTERESTED: "bg-amber-500",
  NOT_INTERESTED: "bg-zinc-500",
  FOLLOW_UP: "bg-purple-500",
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string | null) {
  if (!name) return "bg-zinc-600";
  const colors = [
    "bg-emerald-600", "bg-blue-600", "bg-purple-600", "bg-amber-600",
    "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function InboxPage() {
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IncomingMessage | null>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox?limit=200");
      const data = await res.json();
      if (data.success) setMessages(data.data.messages);
    } catch {
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const selectContact = useCallback(async (msg: IncomingMessage) => {
    setSelected(msg);
    setNotes(msg.notes || "");
    setShowNotes(false);

    const items: ConversationItem[] = [];

    items.push({
      id: msg.id,
      body: msg.body,
      timestamp: msg.receivedAt,
      direction: "incoming",
      status: msg.status,
    });

    const otherMsgs = messages.filter(
      (m) => m.contact.id === msg.contact.id && m.id !== msg.id
    );
    for (const m of otherMsgs) {
      items.push({
        id: m.id,
        body: m.body,
        timestamp: m.receivedAt,
        direction: "incoming",
        status: m.status,
      });
    }

    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setConversation(items);
  }, [messages]);

  const updateMessage = async (id: string, status?: string) => {
    try {
      await fetch("/api/inbox", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes: notes || undefined }),
      });
      toast.success("Updated");
      fetchMessages();
    } catch {
      toast.error("Failed to update");
    }
  };

  const contactMap = new Map<string, IncomingMessage>();
  for (const msg of messages) {
    if (!contactMap.has(msg.contact.id)) {
      contactMap.set(msg.contact.id, msg);
    }
  }
  const uniqueContacts = Array.from(contactMap.values());

  const filtered = search
    ? uniqueContacts.filter(
        (m) =>
          m.contact.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.contact.phoneNumber.includes(search)
      )
    : uniqueContacts;

  return (
    <div className="space-y-4">
      <PageHeader title="Inbox" description="WhatsApp & Telegram conversations" />

      <div className="flex h-[calc(100vh-160px)] rounded-xl border overflow-hidden bg-card">
        {/* Left panel - Contact list */}
        <div className={`w-full md:w-96 flex-shrink-0 border-r flex flex-col ${selected ? "hidden md:flex" : "flex"}`}>
          {/* Search header */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search or start new chat"
                className="pl-10 bg-secondary/50 border-0 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Messages from contacts will appear here
                </p>
              </div>
            ) : (
              filtered.map((msg) => {
                const isActive = selected?.contact.id === msg.contact.id;
                const unreadCount = messages.filter(
                  (m) => m.contact.id === msg.contact.id && m.status === "NEW"
                ).length;

                return (
                  <button
                    key={msg.contact.id}
                    onClick={() => selectContact(msg)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                      isActive ? "bg-accent" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(msg.contact.name)}`}>
                      {getInitials(msg.contact.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex items-center gap-1.5">
                          {msg.channel === "telegram"
                            ? <Bot className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            : <MessageSquare className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                          {msg.contact.name || msg.contact.phoneNumber}
                        </span>
                        <span className={`text-[11px] flex-shrink-0 ${unreadCount > 0 ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                          {formatTime(msg.receivedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {msg.body}
                        </p>
                        {unreadCount > 0 && (
                          <span className="flex-shrink-0 h-5 min-w-[20px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel - Chat */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(selected.contact.name)}`}>
                {getInitials(selected.contact.name)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">
                  {selected.contact.name || "Unknown"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {selected.contact.phoneNumber}
                  {selected.contact.company && ` · ${selected.contact.company}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Select
                  value={selected.status}
                  onValueChange={(v) => updateMessage(selected.id, v)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">
                      <span className="flex items-center gap-2"><MessageCircle className="h-3 w-3" /> New</span>
                    </SelectItem>
                    <SelectItem value="REPLIED">
                      <span className="flex items-center gap-2"><Check className="h-3 w-3" /> Replied</span>
                    </SelectItem>
                    <SelectItem value="INTERESTED">
                      <span className="flex items-center gap-2"><Star className="h-3 w-3" /> Interested</span>
                    </SelectItem>
                    <SelectItem value="NOT_INTERESTED">
                      <span className="flex items-center gap-2"><ThumbsDown className="h-3 w-3" /> Not Interested</span>
                    </SelectItem>
                    <SelectItem value="FOLLOW_UP">
                      <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Follow Up</span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}>
              <div className="flex flex-col p-4 space-y-2 min-h-full justify-end">
                {/* Encryption notice */}
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-3 py-1.5 rounded-lg text-center max-w-sm">
                    Messages are end-to-end encrypted. Only use for opted-in business communication.
                  </div>
                </div>

                {/* Date separator */}
                {conversation.length > 0 && (
                  <div className="flex justify-center my-2">
                    <span className="bg-secondary text-muted-foreground text-[10px] px-3 py-1 rounded-md shadow-sm">
                      {new Date(conversation[0].timestamp).toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* Messages */}
                {conversation.map((item) => (
                  <div
                    key={item.id}
                    className={`flex ${item.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                        item.direction === "outgoing"
                          ? "bg-emerald-700/90 text-white"
                          : "bg-card border"
                      }`}
                    >
                      {/* Bubble tail */}
                      <div
                        className={`absolute top-0 w-3 h-3 ${
                          item.direction === "outgoing"
                            ? "-right-1.5 bg-emerald-700/90"
                            : "-left-1.5 bg-card border-l border-t"
                        }`}
                        style={{
                          clipPath: item.direction === "outgoing"
                            ? "polygon(0 0, 100% 0, 0 100%)"
                            : "polygon(100% 0, 0 0, 100% 100%)",
                        }}
                      />
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        {item.body}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        item.direction === "outgoing" ? "text-white/60" : "text-muted-foreground"
                      }`}>
                        <span className="text-[10px]">{formatFullTime(item.timestamp)}</span>
                        {item.direction === "outgoing" && statusIcons[item.status]}
                      </div>
                    </div>
                  </div>
                ))}

                {conversation.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className={`h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-medium mb-4 ${getAvatarColor(selected.contact.name)}`}>
                      {getInitials(selected.contact.name)}
                    </div>
                    <p className="text-lg font-medium">{selected.contact.name}</p>
                    <p className="text-sm text-muted-foreground">{selected.contact.phoneNumber}</p>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Notes panel (slide down) */}
            {showNotes && (
              <div className="border-t bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Internal Notes</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selected.contact.phoneNumber}
                  </Badge>
                </div>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this contact..."
                  className="text-xs resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { updateMessage(selected.id); setShowNotes(false); }}>
                    Save Notes
                  </Button>
                </div>
              </div>
            )}

            {/* Message input (visual only — actual sending via campaigns) */}
            <div className="border-t bg-card p-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" disabled>
                  <Smile className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" disabled>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Use Campaigns to send messages..."
                    className="bg-secondary/50 border-0 pr-10 text-sm"
                    disabled
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" disabled>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                Direct replies are handled through the Campaigns section for compliance tracking
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-secondary/20">
            <div className="text-center space-y-3">
              <div className="mx-auto h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-light text-muted-foreground">OneByOne Web</h3>
              <p className="text-sm text-muted-foreground/60 max-w-sm">
                Send and receive WhatsApp messages from your contacts.
                Select a conversation to view messages.
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/40 pt-4">
                <Phone className="h-3 w-3" />
                <span>End-to-end encrypted for business use only</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
