import "dotenv/config";

import { FGARetriever } from "./fga-retriever";
import { generate, LocalVectorStore, readDocuments } from "./helpers";

async function main() {
  // User ID
  const user = "user1";
  // User query
  const query = "Show me forecast for ZEKO?";

  // 1. RAG pipeline
  const documents = readDocuments();
  // `LocalVectorStore` is a helper function that creates a Faiss index
  // and uses OpenAI embeddings API to encode the documents.
  const vectorStore = await LocalVectorStore.fromDocuments(documents);

  // 2. Create an instance of the FGARetriever
  const retriever = FGARetriever.create({
    documents: await vectorStore.search(query),
    buildQuery: (doc) => ({
      user: `user:${user}`,
      object: `doc:${doc.id}`,
      relation: "can_view",
    }),
  });

  // 3. Filter documents based on user permissions
  const context = await retriever.retrieve();

  // 4. Generate a response based on the context
  // `generate` is a helper function that takes a query and a context and returns
  // a response using OpenAI chat completion API.
  const answer = await generate(query, context);

  // 5. Print the answer
  console.log(answer);
}

main().catch(console.error);
