import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { Flash, PageTitle } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Your profile" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser("/profile");
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div>
      <Flash searchParams={searchParams} />
      <PageTitle
        sub={
          user.phone
            ? `Signed in as ${user.email}`
            : "Confirm your full name and add your phone number so your driver or passengers can reach you. It's only shared with people in your car."
        }
      >
        {user.phone ? "Your profile" : "One quick thing"}
      </PageTitle>
      <ProfileForm name={user.name} phone={formatPhone(user.phone)} next={next} />
    </div>
  );
}
