import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type VolunteerAvatarProps = {
  profilePhotoUrl?: string | null;
  name?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-16 w-16" };
const iconSizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export const VolunteerAvatar = ({
  profilePhotoUrl,
  name,
  className,
  size = "md",
}: VolunteerAvatarProps) => {
  const sizeClass = sizes[size];
  const iconClass = iconSizes[size];

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0",
        sizeClass,
        className
      )}
      title={name ?? undefined}
    >
      {profilePhotoUrl ? (
        <img
          src={profilePhotoUrl}
          alt={name ? `${name} profile` : "Volunteer"}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className={cn("text-muted-foreground", iconClass)} />
      )}
    </div>
  );
};
