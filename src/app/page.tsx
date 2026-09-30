import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Board from "@/components/Board";
import { logout } from "./actions";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Board
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        image: session.user.image ?? "",
      }}
      logoutAction={logout}
    />
  );
}
