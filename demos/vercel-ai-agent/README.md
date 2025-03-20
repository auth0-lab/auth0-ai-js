# Vercel AI Agent with Auth0 AI and AI SDK

This is a demo application that implements [Auth0 AI](https://auth0.ai) along with the [AI SDK](https://sdk.vercel.ai/) to create an AI agent that can perform stock purchases. The application demonstrates how to integrate the AI SDK with Auth0 AI to implement an agent with asynchronous user authentication ("Human in the Loop").

## Getting Started

### Prerequisites

- An Auth0 account, you can create one [here](https://auth0.com).
- An OpenAI account and API key. You can create one [here](https://platform.openai.com).
  - [Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)

### Prepare the workspace

Copy the `.env.example` file to `.env` and fill in the required values:

```bash
# OpenAI
OPENAI_API_KEY=

# Auth0
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# If you are going to run `npm run queue-job` to test:
TEST_USER_ID=
TEST_USER_EMAIL=
```

> [!NOTE]
> Both `TEST_USER_ID` and `TEST_USER_EMAIL` must be a real user in your Auth0 tenant account.

### Install & run

Install the dependencies by running the following command:

```bash
npm install
```

Then, start the required services with Docker Compose:

```bash
npm run docker:up
```

Finally, run the application with:

```bash
npm run worker
```

And start the queue with:

```bash
npm run queue-job
```


## Learn More

To learn more about Auth0 AI and the AI SDK, take a look at the following resources:

- [Auth0 AI](https://auth0.ai)
- [AI SDK](https://sdk.vercel.ai/)

## License

Apache-2.0
