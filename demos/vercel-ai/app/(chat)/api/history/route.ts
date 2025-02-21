

import { auth0 } from "@/lib/auth0";
import { getChatsByUserId } from "@/lib/db/queries";

export const GET = async function myApiRoute() {
  const session = await auth0.getSession();

  if (!session || !session.user) {
    return Response.json("Unauthorized!", { status: 401 });
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const chats = await getChatsByUserId({ id: session.user.sub! });
  return Response.json(chats);
};
