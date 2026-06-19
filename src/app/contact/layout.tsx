import { getCurrentProfile } from "@/lib/auth/session";

import { ContactMemberShell } from "@/components/user/contact-member-shell";

import { PublicShell } from "@/components/public/public-shell";

import { getHomeForRole } from "@/lib/auth/routes";



export const dynamic = "force-dynamic";



function isActiveMember(

  profile: Awaited<ReturnType<typeof getCurrentProfile>>

) {

  return (

    profile?.role === "user" &&

    !profile.is_deleted &&

    profile.status !== "deleted"

  );

}



export default async function ContactLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  try {

    const profile = await getCurrentProfile();



    if (profile && isActiveMember(profile)) {

      return (

        <ContactMemberShell profile={profile}>{children}</ContactMemberShell>

      );

    }



    return (

      <PublicShell

        isAuthenticated={Boolean(profile)}

        homeHref={profile ? getHomeForRole(profile.role) : undefined}

        displayName={profile?.display_name}

      >

        {children}

      </PublicShell>

    );

  } catch (err) {

    console.error("[contact/layout] render failed:", err);

    return (

      <PublicShell isAuthenticated={false}>{children}</PublicShell>

    );

  }

}


