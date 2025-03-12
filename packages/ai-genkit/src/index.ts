import { FGA_AI } from "./FGA_AI";

export { FGAReranker, auth0 } from "./retrievers/fga-reranker";

// references:
// https://firebase.google.com/docs/genkit/auth
// NOTE: This doesn't support "dynamic" negotiation with the API

export class Auth0AI {
  static FGA = FGA_AI;
}
