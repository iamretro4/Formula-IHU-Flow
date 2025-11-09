import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Reply, Trash2, Edit, MoreVertical, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUploadZone } from "./FileUploadZone";

type Comment = {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
  };
  attachments?: string[];
  replies?: Comment[];
};

type CommentsSectionProps = {
  entityType: "task" | "document" | "project" | "milestone";
  entityId: string;
};

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
    fetchComments();
  }, [entityType, entityId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments" as any)
        .select(`
          *,
          user:profiles(id, full_name)
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

      if (error && error.code !== "42P01") throw error;

      if (data) {
        // Organize comments into threads
        const topLevel = data.filter((c: Comment) => !c.parent_id);
        const withReplies = topLevel.map((comment: Comment) => ({
          ...comment,
          replies: data.filter((c: Comment) => c.parent_id === comment.id),
        }));
        setComments(withReplies);
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !attachment) return;

    setSubmitting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      let attachmentUrl = null;
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const filePath = `${currentUser.id}/comments/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, attachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      // Process @mentions
      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1]);
      }

      const { error } = await (supabase
        .from("comments" as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: currentUser.id,
          content: newComment,
          parent_id: replyingTo,
          attachments: attachmentUrl ? [attachmentUrl] : null,
          metadata: mentions.length > 0 ? { mentions } : null,
        }) as Promise<{ error: any }>);

      if (error) throw error;

      // Create notifications for mentions
      if (mentions.length > 0) {
        // Find mentioned users and create notifications
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .or(mentions.map(m => `full_name.ilike.%${m}%`).join(','));

        if (profiles) {
          for (const profile of profiles) {
            await (supabase
              .from("notifications" as any)
              .insert({
                user_id: profile.id,
                type: "other",
                title: "You were mentioned in a comment",
                message: `${currentUser.email} mentioned you in a comment`,
                link: `/${entityType}s?id=${entityId}`,
              }) as Promise<{ error: any }>);
          }
        }
      }

      setNewComment("");
      setReplyingTo(null);
      setAttachment(null);
      fetchComments();
      toast({ title: "Comment added successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("comments" as any)
        .delete()
        .eq("id", id) as Promise<{ error: any }>);

      if (error) throw error;
      fetchComments();
      toast({ title: "Comment deleted" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("comments" as any)
        .update({ content: editContent })
        .eq("id", id) as Promise<{ error: any }>);

      if (error) throw error;
      setEditingId(null);
      setEditContent("");
      fetchComments();
      toast({ title: "Comment updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground p-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder={replyingTo ? "Write a reply..." : "Add a comment... (Use @username to mention someone)"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <FileUploadZone
            onFileSelect={setAttachment}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={attachment}
            disabled={submitting}
          />
          <div className="flex gap-2">
            {replyingTo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting || (!newComment.trim() && !attachment)}>
              <Send className="h-4 w-4 mr-2" />
              {replyingTo ? "Reply" : "Comment"}
            </Button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReply={() => setReplyingTo(comment.id)}
              onDelete={handleDelete}
              onEdit={(id, content) => {
                setEditingId(id);
                setEditContent(content);
              }}
              editingId={editingId}
              editContent={editContent}
              onEditChange={setEditContent}
              onSaveEdit={handleEdit}
              onCancelEdit={() => {
                setEditingId(null);
                setEditContent("");
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  editingId,
  editContent,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}: {
  comment: Comment;
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  editingId: string | null;
  editContent: string;
  onEditChange: (content: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const isOwner = comment.user_id === currentUserId;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>
              {comment.user?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{comment.user?.full_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(comment.id, comment.content)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {editingId === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => onEditChange(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onSaveEdit(comment.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {comment.content}
                  </ReactMarkdown>
                </div>
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {comment.attachments.map((url, idx) => (
                      <Badge key={idx} variant="outline" className="cursor-pointer">
                        <Paperclip className="h-3 w-3 mr-1" />
                        Attachment {idx + 1}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="h-8"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-8 mt-4 space-y-3 border-l-2 pl-4">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    editingId={editingId}
                    editContent={editContent}
                    onEditChange={onEditChange}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
