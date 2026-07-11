import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { EditorPageClient } from "./EditorPageClient";

type PageProps = {
  params: Promise<{ fileId: string }>;
};

export default async function EditorPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const { fileId } = await params;

  return (
    <EditorPageClient
      fileId={fileId}
      userInfo={{
        name: user?.fullName ?? user?.firstName ?? "Anonymous",
        avatar: user?.imageUrl ?? "",
        userId,
      }}
    />
  );
}
