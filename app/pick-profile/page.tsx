import { PROFILES } from "@/lib/profiles/config";
import { getActiveProfile } from "@/lib/profiles/cookie";
import { ProfilePicker } from "@/components/profile/ProfilePicker";

export const metadata = {
  title: "Pick a profile, LifeOS",
};

export default async function PickProfilePage() {
  const active = await getActiveProfile();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-2 py-10">
      <ProfilePicker
        profiles={PROFILES}
        activeSlug={active?.slug ?? null}
      />
    </div>
  );
}
