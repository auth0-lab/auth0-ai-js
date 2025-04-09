/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import UserButton from "@/components/auth0/user-button";
import { auth0 } from "@/lib/auth0";

import Chat from "../components/chat";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <header className="w-full max-w-7xl h-14 mx-auto flex items-center justify-between border-b border-gray-200">
        <div className="font-semibold">Auth0 AI | Demo | Genkit</div>
        <UserButton user={session?.user!} logoutUrl="/auth/logout" />
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
        <Chat />
      </main>
    </div>
  );
}
