import type { Metadata } from "next";
import { getProfile } from "@/modules/users/service";
import { getIdentityView } from "@/modules/identity/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoForm } from "@/modules/users/components/personal-info-form";
import { ContactInfoForm } from "@/modules/users/components/contact-info-form";
import { ChangePasswordForm } from "@/modules/users/components/change-password-form";
import { IdentitySummary } from "@/modules/identity/components/identity-summary";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const view = await getProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal, contact and security information."
        breadcrumbs={[{ label: "Profile" }]}
      />

      <Tabs defaultValue="personal">
        <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="personal">Personal information</TabsTrigger>
          <TabsTrigger value="contact">Contact information</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
              <CardDescription>
                Your name and details. NIN is not collected in this phase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalInfoForm
                initial={{
                  title: view.profile.title,
                  firstName: view.profile.firstName,
                  lastName: view.profile.lastName,
                  middleName: view.profile.middleName,
                  dateOfBirth: view.profile.dateOfBirth
                    ? view.profile.dateOfBirth.toISOString()
                    : null,
                  gender: view.profile.gender,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact information</CardTitle>
              <CardDescription>
                How we reach you, and where you&apos;re located.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactInfoForm
                initial={{
                  email: view.user.email,
                  phone: view.user.phone,
                  address: view.profile.address,
                  city: view.profile.city,
                  state: view.profile.state,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="mt-4">
          <IdentitySummary view={await getIdentityView()} />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password. All other sessions are signed out when you
                do.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
