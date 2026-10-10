import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CustomerAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt="" />}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(name, "?")}</AvatarFallback>
    </Avatar>
  );
}
