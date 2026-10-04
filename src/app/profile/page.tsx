import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountSection } from "./DeleteAccountSection";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">Area Riservata</h1>
      <p className="text-slate-600">
        Benvenuto, <span className="font-medium text-slate-900">{session.user.name}</span>.
      </p>
      
      <ChangePasswordForm />
      <DeleteAccountSection />
    </div>
  );
}
