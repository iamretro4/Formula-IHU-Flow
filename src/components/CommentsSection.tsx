import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Reply, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentsSectionProps {
  entityType: 'task' | 'document' | 'project' | 'milestone' | 'purchase_request';
  entityId: string;
}

type Comment = {
  id: string;
  content: string;
  author_id: string;
  parent_comment_id: string | null;
  created_at: string;
  is_edited: boolean;
  author?: {
    id: string;
    full_name: string;
  } | null;
  reactions?: {
    reaction_type: string;
    count: number;
  }[];
  replies?: Comment[];
};

const CommentsSection = ({ entityType, entityId }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    fetchComments();
  }, [entityId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const commentsWithAuthors = await Promise.all(
        (data || []).map(async (comment: any) => {
          const { data: author } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", comment.author_id)
            .single();

          // Fetch reactions
          const { data: reactions } = await supabase
            .from("comment_reactions")
            .select("reaction_type")
            .eq("comment_id", comment.id);

          const reactionCounts = (reactions || []).reduce((acc: any, r: any) => {
            acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
            return acc;
          }, {});

          return {
            ...comment,
            author,
            reactions: Object.entries(reactionCounts).map(([type, count]) => ({
              reaction_type: type,
              count: count as number,
            })),
          };
        })
      );

      // Organize into threads (parent comments with replies)
      const parentComments = commentsWithAuthors.filter((c) => !c.parent_comment_id);
      const replies = commentsWithAuthors.filter((c) => c.parent_comment_id);

      const organizedComments = parentComments.map((parent) => ({
        ...parent,
        replies: replies.filter((r) => r.parent_comment_id === parent.id),
      }));

      setComments(organizedComments);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        content: newComment.trim(),
        author_id: user.id,
      });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({ title: "Comment added" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        content: replyContent.trim(),
        author_id: user.id,
        parent_comment_id: parentId,
      });

      if (error) throw error;

      setReplyContent("");
      setReplyingTo(null);
      fetchComments();
      toast({ title: "Reply added" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleReaction = async (commentId: string, reactionType: string) => {
    if (!user) return;

    try {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from("comment_reactions")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .eq("reaction_type", reactionType)
        .single();

      if (existing) {
        // Remove reaction
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("reaction_type", reactionType);
      } else {
        // Add reaction
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }

      fetchComments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("author_id", user.id);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Comments ({comments.length})</h3>
      </div>

      {/* New comment form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
          Post Comment
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>
                  {comment.author?.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {comment.author?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                      {comment.is_edited && " (edited)"}
                    </p>
                  </div>
                  {user?.id === comment.author_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-sm">{comment.content}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(comment.id, "thumbs_up")}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {comment.reactions?.find((r) => r.reaction_type === "thumbs_up")?.count || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                </div>

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="ml-4 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim()}
                      >
                        Post Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-4 space-y-2 border-l-2 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {reply.author?.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs">
                              {reply.author?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(reply.created_at).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
};

export default CommentsSection;

