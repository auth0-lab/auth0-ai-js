import { genkit, z } from 'genkit';
import { openAI, gpt4o } from 'genkitx-openai';
import { AuthorizationError } from '@auth0/ai';
import { FSSessionStore } from '@auth0/ai-genkit';
import { session as sess } from '@auth0/ai/session';
import { tokens } from '@auth0/ai/tokens';


const ai = genkit({
  plugins: [ openAI({ apiKey: process.env.OPENAI_API_KEY }) ],
  model: gpt4o,
});

const buy = ai.defineTool(
  {
    name: "buy",
    description: "Use this function to buy stock",
    inputSchema: z.object({
      ticker: z.string(),
      qty: z.number()
    }),
    outputSchema: z.string(),
  },
  async ({ ticker, qty }) => {
    const accessToken = tokens().accessToken;
    if (!accessToken) {
      throw new AuthorizationError('You need authorization to buy stock', 'insufficient_scope', { scope: [ 'openid', 'stock.buy' ] });
    }
  
    return 'OK'
  }
);


export async function prompt(message) {
  console.log('## PROMPT ###');
  console.log(sess());
  console.log(tokens());
  
  const sessionId = sess().id;
  let session;
  if (!sessionId) {
    console.log('create session!');
    session = ai.createSession({
      store: new FSSessionStore(),
    });
  } else {
    console.log('load session! ' + sessionId);
    session = await ai.loadSession(sessionId, {
      store: new FSSessionStore(),
    });
  }
  
  
  
  
  const chat = session.chat();
  sess().id = chat.session.id;
  
  try {
    const { text } = await chat.send({
      //'Hello, I am a stock trader'
      prompt: message,
      tools: [ buy ]
    });
  
    return { message: {
      //content: 'OK'
      context: text
    } };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // TODO: I wish there was a better interface here to explicitly persist
      // the session.  It may also be worth considering wether to inject a
      // system method saying that authorization was requested, in which case
      // `chat.updateMessages()` would be the correct approach.
      await chat.session.store.save(chat.session.id, chat.session.sessionData);
    }
    
    throw error;
  }
}
