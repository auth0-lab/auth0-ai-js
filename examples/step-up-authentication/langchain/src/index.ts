import "dotenv/config";

// import Enquirer from "enquirer";
// import { BaseMessage, HumanMessage } from "@langchain/core/messages";
// import { Interrupt } from "@langchain/langgraph";
// import { Client } from "@langchain/langgraph-sdk";
// async function main() {
//   try {
//     console.log(`<Enter a command (type "exit" to quit)>\n\n`);
//     // const authResponse = await DeviceAuthorizer.authorize(
//     //   {
//     //     scope: "openid",
//     //   },
//     //   {
//     //     clientId: process.env["AUTH0_PUBLIC_CLIENT_ID"]!,
//     //   }
//     // );
//     const enquirer = new Enquirer<{ message: string }>();
//     const messages: BaseMessage[] = [];
//     const client = new Client({
//       apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
//     });
//     const { thread_id } = await client.threads.create();
//     let interrupt: Interrupt | null = null;
//     while (true) {
//       const { message } = await enquirer.prompt({
//         type: "text",
//         name: "message",
//         message: "    ",
//         prefix: "User",
//       });
//       if (message.toLowerCase() === "exit") {
//         console.log("Goodbye!");
//         break;
//       }
//       messages.push(new HumanMessage(message));
//       // Use the search tool to ask the user where they are, then look up the weather there
//       const waitResult = await client.runs.wait(thread_id, "agent2", {
//         command: interrupt ? { resume: message } : undefined,
//         input: { messages },
//         config: {
//           configurable: {
//             // userId: authResponse.claims?.sub,
//           },
//         },
//       });
//       const result = (waitResult as Record<string, any>).messages;
//       const state = await client.threads.getState(thread_id);
//       const tasks = state.tasks;
//       if (tasks.length && tasks[0].interrupts.length) {
//         interrupt = tasks[0].interrupts[0];
//         console.log(`Assistant · ${JSON.stringify(interrupt.value)}\n`);
//       } else {
//         console.log(`Assistant · ${result[result.length - 1].content}\n`);
//       }
//     }
//   } catch (error) {
//     console.log("AGENT:error", error);
//   }
// }
// main().catch(console.error);
// import { Client } from "@langchain/langgraph-sdk";
import { CIBAAuthorizer } from "@auth0/ai";

async function main() {
  try {
    // const client = new Client({
    //   apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:5555",
    // });

    // const cron = await client.crons.create("ciba", {
    //   schedule: "*/5 * * * * *",
    //   config: {},
    //   input: {
    //     user_id: "google-oauth2|114615802253716134337",
    //     thread_id: "xxxx-xxx",
    //     auth_req_id: "",
    //     agent_to_resume: "agent2",
    //   },
    // });

    // console.log("Cron created:", cron);

    // console.log(await client.crons.search());

    const ciba = await CIBAAuthorizer.start({
      scope: "openid",
      userId: "google-oauth2|114615802253716134337",
      binding_message: "some message",
    });

    console.log(ciba);

    console.log(await CIBAAuthorizer.check(ciba.auth_req_id));
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error);
