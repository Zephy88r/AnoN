import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDialog } from "../contexts/DialogContext";
import { getMyAnonId, setMyUsername } from "../services/session";
import {
  checkUsername,
  getMyProfile,
  getProfilePosts,
  getPublicProfile,
  reportProfile,
  reportProfilePost,
  updateMyProfile,
  type ProfileMe,
  type ProfilePost,
  type ProfilePublic,
  type UsernameCheckResult,
} from "../services/profileApi";
import {
  createPost,
  createComment,
  createCommentReply,
  deletePost,
  dislikeComment,
  dislikeCommentReply,
  dislikePost,
  getRemainingPosts,
  getCommentReplies,
  getComments,
  likeComment,
  likeCommentReply,
  likePost,
  type ApiComment,
  type ApiCommentReply,
} from "../services/postsApi";

const shell =
  "rounded-2xl border border-emerald-500/20 dark:border-green-500/25 bg-white/70 dark:bg-black/45 backdrop-blur p-4";
const statCard =
  "rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/60 dark:bg-black/35 p-3";

const POST_REPORT_REASON_OPTIONS = [
  "Spam",
  "Harassment or hate",
  "Violence or threat",
  "Sexual content",
  "Misinformation",
  "Other",
];

const PROFILE_REPORT_REASON_OPTIONS = [
  "Impersonation or fake identity",
  "Harassment or targeted abuse",
  "Repeated spam behavior",
  "Threatening behavior",
  "Other",
];

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function displayUsername(username?: string, anonId?: string): string {
  return username || `User #${anonId?.substring(0, 8) || "unknown"}`;
}

function validateSuffix(suffixRaw: string): UsernameCheckResult | null {
  const suffix = suffixRaw.trim().toLowerCase();
  if (!suffix || suffix.length < 3) {
    return { available: false, message: "✖ Username must be at least 3 characters" };
  }
  if (!/^[a-z0-9_]{3,20}$/.test(suffix)) {
    return { available: false, message: "✖ Only letters, numbers, and underscore allowed" };
  }
  const reserved = new Set([
    "admin", "system", "support", "moderator", "mod", "root", "null", "me", "you", "official", "staff", "owner",
  ]);
  if (reserved.has(suffix)) {
    return { available: false, message: "✖ This name is reserved" };
  }
  return null;
}

export default function Profile() {
  const { anonId } = useParams();
  const { showAlert } = useDialog();
  const myAnonId = getMyAnonId();
  const isOwnProfile = !anonId || anonId === myAnonId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileMe | null>(null);
  const [publicProfile, setPublicProfile] = useState<ProfilePublic | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);

  const [suffixInput, setSuffixInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [isRegionPublic, setIsRegionPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<UsernameCheckResult | null>(null);

  const [comments, setComments] = useState<Record<string, ApiComment[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentSort, setCommentSort] = useState<Record<string, "newest" | "oldest">>({});

  const [replies, setReplies] = useState<Record<string, ApiCommentReply[]>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

  const [newPostText, setNewPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postsLeftToday, setPostsLeftToday] = useState<number | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "profile" | "post"; id: string } | null>(null);
  const [reportedTargets, setReportedTargets] = useState<Record<string, true>>({});
  const activeReportReasons = reportTarget?.type === "profile" ? PROFILE_REPORT_REASON_OPTIONS : POST_REPORT_REASON_OPTIONS;
  const reportTargetKey = reportTarget ? `${reportTarget.type}:${reportTarget.id}` : "";
  const alreadyReportedInSession = reportTargetKey ? !!reportedTargets[reportTargetKey] : false;

  const targetAnonId = isOwnProfile ? myProfile?.anon_id : anonId;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isOwnProfile) {
          const p = await getMyProfile();
          if (!active) return;
          setMyProfile(p);
          setSuffixInput(p.username_suffix || "");
          setBioInput(p.bio || "");
          setIsRegionPublic(!!p.is_region_public);
          const remainingRes = await getRemainingPosts();
          if (!active) return;
          setPostsLeftToday(remainingRes.remaining);
          const postRes = await getProfilePosts(p.anon_id);
          if (!active) return;
          setPosts(postRes.posts || []);
        } else {
          if (!anonId) return;
          const p = await getPublicProfile(anonId);
          if (!active) return;
          setPublicProfile(p);
          const postRes = await getProfilePosts(anonId);
          if (!active) return;
          setPosts(postRes.posts || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [anonId, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !myProfile) return;
    const normalized = suffixInput.trim().toLowerCase();
    if (normalized === (myProfile.username_suffix || "").trim().toLowerCase()) {
      setUsernameFeedback({ available: true, message: "✔ Username available" });
      return;
    }
    const local = validateSuffix(normalized);
    if (local) {
      setUsernameFeedback(local);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const result = await checkUsername(`ghost_${normalized}`);
        setUsernameFeedback(result);
      } catch {
        setUsernameFeedback({ available: false, message: "✖ Username check failed" });
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [suffixInput, isOwnProfile, myProfile]);

  const profile = useMemo(() => (isOwnProfile ? myProfile : publicProfile), [isOwnProfile, myProfile, publicProfile]);
  const canShowRegion = !!profile && ((isOwnProfile && "region" in profile) || (!!profile.is_region_public && !!profile.region));

  async function onSaveProfile() {
    if (!myProfile) return;
    const normalized = suffixInput.trim().toLowerCase();
    const local = validateSuffix(normalized);
    if (local) return setUsernameFeedback(local);
    if (usernameFeedback && !usernameFeedback.available) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        username_suffix: normalized,
        bio: bioInput.trim(),
        is_region_public: isRegionPublic,
      });
      setMyProfile(updated);
      setMyUsername(updated.username);
      setSuffixInput(updated.username_suffix || normalized);
      setUsernameFeedback({ available: true, message: "✔ Username available" });
    } catch (e) {
      if (e instanceof TypeError && e.message.includes("Failed to fetch")) {
        setError("Unable to reach server. Please ensure backend is running and CORS allows PATCH requests.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  }

  function openReportProfileModal() {
    if (!targetAnonId) return;
    setReportTarget({ type: "profile", id: targetAnonId });
    setReportReason("");
    setReportModalOpen(true);
  }

  function openReportPostModal(postId: string) {
    setReportTarget({ type: "post", id: postId });
    setReportReason("");
    setReportModalOpen(true);
  }

  function closeReportModal() {
    setReportModalOpen(false);
    setReportReason("");
    setReportTarget(null);
  }

  async function handleSubmitReport() {
    if (!reportTarget || !reportReason.trim()) return;
    setIsSubmittingReport(true);
    try {
      if (reportTarget.type === "profile") {
        await reportProfile(reportTarget.id, reportReason);
        setReportedTargets((prev) => ({ ...prev, [`profile:${reportTarget.id}`]: true }));
        await showAlert({ title: "Success", message: "Profile reported successfully." });
      } else {
        await reportProfilePost(reportTarget.id, reportReason);
        setReportedTargets((prev) => ({ ...prev, [`post:${reportTarget.id}`]: true }));
        await showAlert({ title: "Success", message: "Post reported successfully." });
      }
      closeReportModal();
    } catch (e) {
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      if (message.includes("already reported") || message.includes("api 409")) {
        if (reportTarget) {
          setReportedTargets((prev) => ({ ...prev, [`${reportTarget.type}:${reportTarget.id}`]: true }));
        }
        await showAlert({
          title: "Already Reported",
          message: reportTarget.type === "profile" ? "You already reported this profile." : "You already reported this post.",
          danger: true,
        });
      } else {
        await showAlert({
          title: "Report Failed",
          message: reportTarget.type === "profile" ? "Failed to report profile." : "Failed to report post.",
          danger: true,
        });
      }
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function onLikePost(postId: string) {
    try {
      const updated = await likePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
    } catch {
      window.alert("Failed to react to post.");
    }
  }

  async function onDislikePost(postId: string) {
    try {
      const updated = await dislikePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
    } catch {
      window.alert("Failed to react to post.");
    }
  }

  async function onDeletePost(postId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      window.alert("Failed to delete post. You can only delete your own posts.");
    }
  }

  async function onCreatePost() {
    const text = newPostText.trim();
    if (!text) return;
    if (postsLeftToday !== null && postsLeftToday <= 0) {
      window.alert("Daily post limit reached.");
      return;
    }
    setPosting(true);
    try {
      const res = await createPost(text);
      setPosts((prev) => [res.post, ...prev]);
      setNewPostText("");
      setPostsLeftToday(res.posts_remaining);
      setMyProfile((prev) => (prev ? { ...prev, posts_count: prev.posts_count + 1 } : prev));
    } catch {
      window.alert("Failed to create post.");
    } finally {
      setPosting(false);
    }
  }

  async function onToggleComments(postId: string) {
    const visible = !!showComments[postId];
    if (!visible && !comments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await getComments(postId);
        setComments((prev) => ({ ...prev, [postId]: res.comments }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
    setShowComments((prev) => ({ ...prev, [postId]: !visible }));
  }

  async function onSubmitComment(postId: string) {
    const text = (commentText[postId] || "").trim();
    if (!text) return;
    try {
      const created = await createComment(postId, text);
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), created] }));
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      setShowComments((prev) => ({ ...prev, [postId]: true }));
    } catch {
      window.alert("Failed to add comment.");
    }
  }

  async function onLikeComment(postId: string, commentId: string) {
    try {
      const updated = await likeComment(commentId);
      setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? updated : c)) }));
    } catch {
      window.alert("Failed to like comment.");
    }
  }

  async function onDislikeComment(postId: string, commentId: string) {
    try {
      const updated = await dislikeComment(commentId);
      setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? updated : c)) }));
    } catch {
      window.alert("Failed to dislike comment.");
    }
  }

  async function onToggleReplies(commentId: string) {
    const visible = !!showReplies[commentId];
    if (!visible && !replies[commentId]) {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
      try {
        const res = await getCommentReplies(commentId);
        setReplies((prev) => ({ ...prev, [commentId]: res.replies }));
      } finally {
        setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
      }
    }
    setShowReplies((prev) => ({ ...prev, [commentId]: !visible }));
  }

  async function onSubmitReply(postId: string, commentId: string) {
    const text = (replyText[commentId] || "").trim();
    if (!text) return;
    try {
      const created = await createCommentReply(commentId, text);
      setReplies((prev) => ({ ...prev, [commentId]: [...(prev[commentId] || []), created] }));
      setReplyText((prev) => ({ ...prev, [commentId]: "" }));
      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? { ...c, replies_count: (c.replies_count || 0) + 1 } : c)),
      }));
    } catch {
      window.alert("Failed to add reply.");
    }
  }

  async function onLikeReply(commentId: string, replyId: string) {
    try {
      const updated = await likeCommentReply(replyId);
      setReplies((prev) => ({ ...prev, [commentId]: (prev[commentId] || []).map((r) => (r.id === replyId ? updated : r)) }));
    } catch {
      window.alert("Failed to like reply.");
    }
  }

  async function onDislikeReply(commentId: string, replyId: string) {
    try {
      const updated = await dislikeCommentReply(replyId);
      setReplies((prev) => ({ ...prev, [commentId]: (prev[commentId] || []).map((r) => (r.id === replyId ? updated : r)) }));
    } catch {
      window.alert("Failed to dislike reply.");
    }
  }

  if (loading) return <div className="font-mono text-sm text-slate-700 dark:text-green-300/80">Loading profile...</div>;
  if (error) return <div className="font-mono text-sm text-red-600 dark:text-red-300">{error}</div>;
  if (!profile) return <div className="font-mono text-sm text-slate-700 dark:text-green-300/80">Profile not found.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className={shell}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-green-100">{profile.username}</h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-green-300/80">{profile.bio || "No bio set."}</p>
          </div>
          {!isOwnProfile && (
            <button onClick={openReportProfileModal} className="rounded-lg border border-red-500/35 px-3 py-1.5 text-xs font-mono text-red-600 dark:text-red-300 hover:bg-red-500/10">
              Report Profile
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {isOwnProfile && myProfile && (
            <>
              <div className={statCard}><div className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-green-300/60">Anon ID</div><div className="mt-1 break-all font-mono text-slate-800 dark:text-green-200">{myProfile.anon_id}</div></div>
              <div className={statCard}><div className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-green-300/60">Joined</div><div className="mt-1 font-mono text-slate-800 dark:text-green-200">{formatDate(myProfile.created_at)}</div></div>
            </>
          )}
          {canShowRegion && <div className={statCard}><div className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-green-300/60">Region</div><div className="mt-1 font-mono text-slate-800 dark:text-green-200">{profile.region}</div></div>}
          <div className={statCard}><div className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-green-300/60">Trust</div><div className="mt-1 font-mono text-slate-800 dark:text-green-200">{profile.trust_score}</div></div>
          <div className={statCard}><div className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-green-300/60">Status</div><div className="mt-1 font-mono text-slate-800 dark:text-green-200">{profile.status_label}</div></div>
        </div>
      </section>

      <section className={shell}>
        <h2 className="text-sm font-mono uppercase tracking-wide text-emerald-700 dark:text-green-300">Stats</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className={statCard}><span className="font-mono text-slate-800 dark:text-green-200">Posts: {profile.posts_count}</span></div>
          <div className={statCard}><span className="font-mono text-slate-800 dark:text-green-200">Comments: {profile.comments_count}</span></div>
          <div className={statCard}><span className="font-mono text-slate-800 dark:text-green-200">Reactions: {profile.reactions_count}</span></div>
          {isOwnProfile && myProfile && <div className={statCard}><span className="font-mono text-slate-800 dark:text-green-200">Profile Views: {myProfile.profile_views}</span></div>}
        </div>
      </section>

      {isOwnProfile && myProfile && (
        <section className={shell}>
          <h2 className="text-sm font-mono uppercase tracking-wide text-emerald-700 dark:text-green-300">Edit Profile</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-mono text-slate-700 dark:text-green-300/80">Username</label>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 px-3 py-2">
                <span className="font-mono text-sm text-slate-700 dark:text-green-300/80">ghost_</span>
                <input value={suffixInput} onChange={(e) => setSuffixInput(e.target.value)} className="w-full bg-transparent font-mono text-sm text-slate-900 outline-none dark:text-green-100" placeholder="suffix" />
              </div>
              {usernameFeedback && <p className={`mt-1 text-xs font-mono ${usernameFeedback.available ? "text-emerald-700 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{usernameFeedback.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-slate-700 dark:text-green-300/80">Bio</label>
              <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value)} rows={3} maxLength={240} className="w-full rounded-lg border border-emerald-500/25 bg-transparent p-2 text-sm text-slate-900 outline-none dark:text-green-100" />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-green-200">
              <input type="checkbox" checked={isRegionPublic} onChange={(e) => setIsRegionPublic(e.target.checked)} />
              Make region visible to other users
            </label>

            <button onClick={onSaveProfile} disabled={saving} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm font-mono text-slate-900 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-green-100">
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>
      )}

      {isOwnProfile && myProfile && (
        <section className={shell}>
          <h2 className="text-sm font-mono uppercase tracking-wide text-emerald-700 dark:text-green-300">Security / Device</h2>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="font-mono text-slate-800 dark:text-green-200">Primary Device Active: {myProfile.primary_device_active ? "Yes" : "No"}</div>
            <div className="font-mono text-slate-800 dark:text-green-200">Session Status: {myProfile.session_status}</div>
            <div className="font-mono text-slate-800 dark:text-green-200">Last Active: {formatDate(myProfile.last_active_at)}</div>
            <div className="font-mono text-slate-800 dark:text-green-200">Recovery Key Generated: {myProfile.recovery_key_generated ? "Yes" : "No"}</div>
          </div>
        </section>
      )}

      <section className={shell}>
        <h2 className="text-sm font-mono uppercase tracking-wide text-emerald-700 dark:text-green-300">{isOwnProfile ? "My Posts" : "Posts"}</h2>
        {isOwnProfile && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-white/70 p-3 dark:border-green-500/20 dark:bg-black/40">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What's on your mind?"
              className="w-full resize-none rounded-lg border border-emerald-500/25 bg-white p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-green-300/30 dark:bg-black dark:text-green-100 dark:focus:ring-green-300/50"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-500 dark:text-green-300/60">
                {newPostText.trim().length}/500
                {postsLeftToday !== null ? ` • ${postsLeftToday} posts left today` : ""}
              </span>
              <button
                onClick={onCreatePost}
                disabled={posting || !newPostText.trim() || (postsLeftToday !== null && postsLeftToday <= 0)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-mono text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-300/15 dark:text-green-200 dark:hover:bg-green-300/25"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-3 space-y-4">
          {posts.length === 0 && <p className="text-sm text-slate-700 dark:text-green-300/80">No posts found.</p>}
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-emerald-500/15 bg-white/60 p-4 backdrop-blur dark:border-green-500/20 dark:bg-black/50">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm text-emerald-700 dark:text-green-300">{profile.username}</div>
                  <div className="text-xs font-mono text-slate-600 dark:text-green-300/70">{timeAgo(post.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {post.anon_id === myAnonId && (
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="rounded border border-red-500/30 px-2 py-1 text-[11px] font-mono text-red-600 dark:text-red-300"
                      title="Delete post"
                    >
                      🗑️
                    </button>
                  )}
                  {!isOwnProfile && (
                    <button onClick={() => openReportPostModal(post.id)} className="rounded border border-red-500/30 px-2 py-1 text-[11px] font-mono text-red-600 dark:text-red-300">🚩</button>
                  )}
                </div>
              </div>

              <p className="text-slate-800 leading-relaxed dark:text-green-100">{post.text}</p>

              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <button onClick={() => onLikePost(post.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${post.user_reaction === "like" ? "bg-blue-500/10 font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}>
                    <svg className="h-5 w-5" fill={post.user_reaction === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={post.user_reaction === "like" ? "0" : "2"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                    <span className="font-mono">{post.likes}</span>
                  </button>
                  <button onClick={() => onDislikePost(post.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${post.user_reaction === "dislike" ? "bg-red-500/10 font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}>
                    <svg className="h-5 w-5" fill={post.user_reaction === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={post.user_reaction === "dislike" ? "0" : "2"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
                    <span className="font-mono">{Math.max(0, post.dislikes)}</span>
                  </button>
                </div>
                <div className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700" onClick={() => onToggleComments(post.id)}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  <span>{(comments[post.id]?.length || 0) + (comments[post.id]?.reduce((sum, c) => sum + (c.replies_count || 0), 0) || 0)}</span>
                </div>
              </div>

              <div className="mt-2">
                <button onClick={() => onToggleComments(post.id)} className="font-mono text-sm text-slate-500 transition hover:text-slate-700 dark:text-green-300/60 dark:hover:text-green-300">
                  {showComments[post.id] ? "▼ Hide comments" : "▶ Show comments"}
                </button>
              </div>

              {showComments[post.id] && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-green-300/20">
                  <div className="flex gap-2">
                    <input
                      value={commentText[post.id] || ""}
                      onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          onSubmitComment(post.id);
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-green-300/30 dark:bg-black dark:text-green-300 dark:placeholder-green-300/40 dark:focus:ring-green-300/50"
                    />
                    <button onClick={() => onSubmitComment(post.id)} disabled={!commentText[post.id]?.trim()} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-mono text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-300/10 dark:text-green-300 dark:hover:bg-green-300/20">
                      Post
                    </button>
                  </div>

                  {(comments[post.id] || []).length > 0 && (
                    <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-green-300/10">
                      <span className="text-xs font-mono text-slate-500 dark:text-green-300/60">
                        {(() => {
                          const total = (comments[post.id]?.length || 0) + (comments[post.id]?.reduce((sum, c) => sum + (c.replies_count || 0), 0) || 0);
                          return `${total} comment${total !== 1 ? "s" : ""}`;
                        })()}
                      </span>
                      <select value={commentSort[post.id] || "newest"} onChange={(e) => setCommentSort((prev) => ({ ...prev, [post.id]: e.target.value as "newest" | "oldest" }))} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-green-300/30 dark:bg-black dark:text-green-300 dark:focus:ring-green-300/50">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>
                  )}

                  {loadingComments[post.id] ? (
                    <div className="text-sm text-slate-400 dark:text-green-300/50 font-mono">Loading comments...</div>
                  ) : (
                    <div className="space-y-2">
                      {(comments[post.id] || [])
                        .sort((a, b) => {
                          const sortOrder = commentSort[post.id] || "newest";
                          const da = new Date(a.created_at).getTime();
                          const db = new Date(b.created_at).getTime();
                          return sortOrder === "newest" ? db - da : da - db;
                        })
                        .map((c) => (
                          <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-green-300/10 dark:bg-slate-900/50">
                            <div className="text-xs font-mono text-slate-500 dark:text-green-300/60 mb-1">{displayUsername(c.username, c.anon_id)} • {timeAgo(c.created_at)}</div>
                            <div className="text-sm text-slate-800 dark:text-green-300">{c.text}</div>
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <button onClick={() => onLikeComment(post.id, c.id)} className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${c.user_reaction === "like" ? "bg-blue-500/10 font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}><span>👍</span><span className="font-mono">{c.likes}</span></button>
                              <button onClick={() => onDislikeComment(post.id, c.id)} className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${c.user_reaction === "dislike" ? "bg-red-500/10 font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}><span>👎</span><span className="font-mono">{Math.max(0, c.dislikes)}</span></button>
                              <button onClick={() => onToggleReplies(c.id)} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700">{showReplies[c.id] ? "Hide" : "Reply"}{c.replies_count > 0 ? ` (${c.replies_count})` : ""}</button>
                            </div>

                            {showReplies[c.id] && (
                              <div className="mt-3 pl-3 border-l border-slate-200 dark:border-green-300/20">
                                <div className="flex gap-2 mb-2">
                                  <input
                                    value={replyText[c.id] || ""}
                                    onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        onSubmitReply(post.id, c.id);
                                      }
                                    }}
                                    placeholder="Write a reply..."
                                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-green-300/30 dark:bg-black dark:text-green-300 dark:placeholder-green-300/40 dark:focus:ring-green-300/50"
                                  />
                                  <button onClick={() => onSubmitReply(post.id, c.id)} disabled={!replyText[c.id]?.trim()} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-mono text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-300/10 dark:text-green-300 dark:hover:bg-green-300/20">Reply</button>
                                </div>
                                {loadingReplies[c.id] ? (
                                  <div className="text-xs text-slate-500 dark:text-green-300/60">Loading replies...</div>
                                ) : (
                                  <div className="space-y-2">
                                    {(replies[c.id] || []).map((r) => (
                                      <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-green-300/10 dark:bg-slate-900/50">
                                        <div className="text-xs font-mono text-slate-500 dark:text-green-300/60 mb-1">{displayUsername(r.username, r.anon_id)} • {timeAgo(r.created_at)}</div>
                                        <div className="text-sm text-slate-800 dark:text-green-300">{r.text}</div>
                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                          <button onClick={() => onLikeReply(c.id, r.id)} className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${r.user_reaction === "like" ? "bg-blue-500/10 font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}><span>👍</span><span className="font-mono">{r.likes}</span></button>
                                          <button onClick={() => onDislikeReply(c.id, r.id)} className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${r.user_reaction === "dislike" ? "bg-red-500/10 font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-green-300/70 dark:hover:bg-slate-700"}`}><span>👎</span><span className="font-mono">{Math.max(0, r.dislikes)}</span></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-white p-5 shadow-xl dark:border-green-500/20 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-green-100">{reportTarget?.type === "profile" ? "Report user profile" : "Report post"}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-green-300/70">
              {reportTarget?.type === "profile"
                ? "This report is for account-level behavior. Select the closest reason."
                : "This report is for this specific post. Select a reason."}
            </p>

            <div className="mt-4 space-y-2">
              {activeReportReasons.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-green-500/20 dark:text-green-200 dark:hover:bg-slate-800/60"
                >
                  <input
                    type="radio"
                    name="profile_report_reason"
                    value={option}
                    checked={reportReason === option}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeReportModal}
                disabled={isSubmittingReport}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-green-500/30 dark:text-green-300 dark:hover:bg-green-500/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={!reportReason || isSubmittingReport || alreadyReportedInSession}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-mono text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-500/20 dark:text-green-200 dark:hover:bg-green-500/30"
              >
                {alreadyReportedInSession ? "Already reported" : isSubmittingReport ? "Reporting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
