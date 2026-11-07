import { PROFILES } from "@/lib/profiles/config";
import { getActiveProfile } from "@/lib/profiles/cookie";
import { isHouseholdUnlocked } from "@/lib/profiles/household";
import { ProfilePicker } from "@/components/profile/ProfilePicker";

export const metadata = {
  title: "Pick a profile, LifeOS",
};

export default async function PickProfilePage() {
  const unlocked = await isHouseholdUnlocked();
  const active = unlocked ? await getActiveProfile() : null;

  // Profiles are only handed to the client once the gate is open. A
  // locked device learns nothing about who uses this one: no names, no
  // count, no email addresses.
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-2 py-10">
      <ProfilePicker
        profiles={unlocked ? PROFILES : []}
        activeSlug={active?.slug ?? null}
        locked={!unlocked}
      />
    </div>
  );
}
