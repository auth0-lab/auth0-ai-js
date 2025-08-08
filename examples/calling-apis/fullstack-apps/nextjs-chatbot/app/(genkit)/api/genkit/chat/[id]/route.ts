import { ToolRequestPart } from "genkit";
import path from "path";

import { ai, JsonSessionStore } from "@/app/(genkit)/lib/genkit";
import {
  checkUsersCalendar,
  listChannels,
  listRepositories,
} from "@/app/(genkit)/lib/tools/";
import { auth0 } from "@/lib/auth0";
import { resumeAuth0Interrupts } from "@auth0/ai-genkit";

const sessionStore = new JsonSessionStore(
  path.join(process.cwd(), "/.store/genkit")
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth0Session = await auth0.getSession();
  const { id } = await params;
  const {
    message,
    interruptedToolRequest,
    timezone,
  }: {
    message?: string;
    interruptedToolRequest?: ToolRequestPart;
    timezone: { region: string; offset: number };
  } = await request.json();

  let session = await ai.loadSession(id, {
    store: sessionStore,
  });

  if (!session) {
    session = ai.createSession({
      sessionId: id,
      store: sessionStore,
    });
  }

  const tools = [checkUsersCalendar, listChannels, listRepositories];

  const chat = session.chat({
    tools: tools,
    system: `You are a helpful assistant.
    The user's timezone is ${timezone.region} with an offset of ${timezone.offset} minutes.
    User's details: ${JSON.stringify(auth0Session?.user, null, 2)}.
    You can use the tools provided to help the user.
    You can also ask the user for more information if needed.
    Chat started at ${new Date().toISOString()}
    `,
  });

  const r = await chat.send({
    prompt: message,
    resume: resumeAuth0Interrupts(tools, interruptedToolRequest),
  });

  return Response.json({ messages: r.messages, interrupts: r.interrupts });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await ai.loadSession(id, {
    store: sessionStore,
  });

  if (!session) {
    return new Response("Session not found", {
      status: 404,
    });
  }

  const json = session.toJSON();

  if (!json?.threads?.main) {
    return new Response("Session not found", {
      status: 404,
    });
  }

  return Response.json(json.threads.main);
}
