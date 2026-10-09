/** Port of the Flutter `timeAgo` helper (utils/timeago.dart). */
export function timeAgo(date: Date | null | undefined): string {
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);

  if (sec < 30) return "Just now";
  if (min < 60) return `${min} mins ago`;
  if (hrs < 24) return `${hrs} hrs ago`;
  if (days < 7) return `${days} days ago`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
