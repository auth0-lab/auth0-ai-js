# Interruptions

This library includes infrastructure code within the AI SDK to handle a concept called **Interruptions**.

In an LLM workflow, a tool call may fail because it requires additional input from the user—a process commonly known as **Human in the Loop**. We refer to this special type of error as an Interruption.

When a tool throws an error that extends the Interruption class, the AI SDK automatically serializes the error and returns it to the client.

The client can then process the interruption, obtain the necessary input, and resume execution within the tool chain.

## Usage

There are two changes required in the chat route:

- Invoke Tools with the `invokeTools` function. This will call the tools after the user has provided the necessary input.
- Handle the Interruption error with the `errorSerializer` function. This will serialize the error and return it to the client.

```javascript
import { errorSerializer, invokeTools } from "@auth0/ai-vercel/interruptions";

return createDataStreamResponse({
  execute: async (dataStream) => {
    await invokeTools({
      messages,
      tools: {
        checkUsersCalendar,
      },
      onToolResult: async (message: Message) => {
        await saveMessages({
          messages: [{ ...message, chatId: id }],
        });
      },
    });
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt({ selectedChatModel }),
      messages,
    });

    result.mergeIntoDataStream(dataStream);
  },
  onError: errorSerializer(),

  // Alternatively you can handle other type of errors as follows:
  // onError: errorSerializer((err) => {
  //   console.log(err);
  //   return "Oops, an error occured!";
  // }),
});
```

## Client-side

If you are using the AI SDK on the client-side, you can handle the interruption error by wrapping the `useChat` hook with the `useInterruptions` hook:

```javascript
import { useInterruptions } from "@auth0/ai-vercel/react";
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    toolInterrupt,
  } = useInterruptions((handler) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      id,
      body: { id, selectedChatModel: selectedChatModel },
      initialMessages,
```

This will give you an additional `toolInterrupt` function that you can use to display a different component for the Chat message.

## Complete example

For a complete example refer to [this demo](../../demos/vercel-ai/).
