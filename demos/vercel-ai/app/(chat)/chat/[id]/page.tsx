import { notFound } from "next/navigation";
import { z } from "zod";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { auth0 } from "@/lib/auth0";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export default async function Page(props: {
  params: Promise<z.infer<typeof paramsSchema>>;
}) {
  let params: z.infer<typeof paramsSchema>;

  try {
    params = paramsSchema.parse(await props.params);
  } catch (error) {
    return notFound();
  }

  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth0.getSession();

  if (chat.visibility === "private") {
    if (!session || !session.user) {
      return notFound();
    }

    if (session.user.sub !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const chatModelFromCookie = { value: "gpt-4o-mini" };

  const initialMessages = convertToUIMessages(messagesFromDb);

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={initialMessages}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={initialMessages}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.visibility}
        isReadonly={session?.user?.sub !== chat.userId}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
