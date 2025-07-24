## Federated Connections with Access Tokens

Federated Connections with Access Tokens enables an API to exchange a client's access token from Token Vault for a 
Third-Party API access token. The API acts as both an API and a "client" in this case, exchanging the first party client's
access token for a federated Third Party access token. 

One use case this may help in particularly is when the agent is a SPA, and you would like the API backend to access a
Third Party (such as Google) on the user's behalf.

//todo : add further description, diagram of new flow, etc.