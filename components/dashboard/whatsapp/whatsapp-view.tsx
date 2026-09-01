"use client";

import * as React from "react";
import { Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { formatDateTime } from "@/lib/format";
import {
  fetchConversation,
  fetchConversations,
  replyToConversation,
  syncCatalog,
  type WaConversation,
  type WaMessage,
} from "@/lib/admin";

/**
 * The human handover queue (FR-WA-6).
 *
 * The bot hands a conversation over when it cannot parse what somebody wants.
 * Until now those threads went nowhere a person could see — the endpoints
 * existed, the customer was told "a member of our team will reply shortly",
 * and nobody could.
 */
export function WhatsAppView() {
  const [conversations, setConversations] = React.useState<WaConversation[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<WaMessage[] | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const loadList = React.useCallback(async () => {
    try {
      const { conversations: found } = await fetchConversations();
      setConversations(found);
    } catch {
      setConversations([]);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
  }, [loadList]);

  const loadThread = React.useCallback(async (id: string) => {
    setThread(null);
    try {
      const { messages } = await fetchConversation(id);
      setThread(messages);
    } catch {
      setThread([]);
    }
  }, []);

  function open(id: string) {
    setSelectedId(id);
    setDraft("");
    void loadThread(id);
  }

  async function send(release: boolean) {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      await replyToConversation(selectedId, draft.trim(), release);
      setDraft("");
      await Promise.all([loadThread(selectedId), loadList()]);
      if (release) {
        toast.success("Replied, and the bot has the conversation back.");
        setSelectedId(null);
      } else {
        toast.success("Reply sent.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Conversations the bot could not answer. Replying sends a WhatsApp message as the
          restaurant.
        </p>
        <ConfirmAction
          destructive={false}
          trigger={
            <Button size="touch" variant="outline" disabled={syncing}>
              {syncing ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              Push the menu to WhatsApp
            </Button>
          }
          title="Send the menu to WhatsApp?"
          consequence="Every item on the menu is copied into the WhatsApp catalogue, prices included. Customers see the new prices straight away."
          confirmLabel="Push the menu"
          onConfirm={async () => {
            setSyncing(true);
            try {
              const result = await syncCatalog();
              toast.success(`${result.synced} of ${result.total} items are up to date.`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "The sync did not finish.");
            } finally {
              setSyncing(false);
            }
          }}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
          {conversations === null ? (
            <div className="space-y-px p-4">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-14" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              size="sm"
              icon={MessageCircle}
              title="Nobody is waiting"
              hint="The bot only passes a conversation over when it cannot work out what somebody wants."
            />
          ) : (
            <ul className="divide-border divide-y">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => open(conversation.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors",
                      selectedId === conversation.id ? "bg-brand-50" : "hover:bg-muted",
                    )}
                  >
                    <span className="block truncate font-medium">
                      {conversation.customer?.name ?? conversation.phoneE164}
                    </span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {conversation.lastMessageAt
                        ? formatDateTime(conversation.lastMessageAt)
                        : "No messages yet"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card ring-foreground/10 flex min-h-80 min-w-0 flex-col rounded-xl ring-1">
          {!selectedId ? (
            <EmptyState
              icon={MessageCircle}
              title="Pick a conversation"
              hint="Choose someone on the left to read what they said and reply."
            />
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread === null ? (
                  <Skeleton className="h-40" />
                ) : thread.length === 0 ? (
                  <EmptyState size="sm" title="Nothing in this conversation yet" />
                ) : (
                  thread.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                        message.direction === "INBOUND"
                          ? "bg-surface-2"
                          : "bg-brand-50 text-brand-800 ml-auto",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.body ?? "(no text)"}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-border flex flex-col gap-2 border-t p-4">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Type your reply"
                  aria-label="Your reply"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="touch" disabled={!draft.trim() || sending} onClick={() => void send(false)}>
                    {sending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    Send
                  </Button>
                  <Button
                    size="touch"
                    variant="outline"
                    disabled={!draft.trim() || sending}
                    onClick={() => void send(true)}
                  >
                    Send and let the bot take over
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  The bot stays quiet on this conversation until you hand it back.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
