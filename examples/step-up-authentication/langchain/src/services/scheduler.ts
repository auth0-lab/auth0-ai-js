import bodyParser from "body-parser";
import express from "express";
import { nanoid } from "nanoid";
import cron from "node-cron";
import storage from "node-persist";

import { Client } from "@langchain/langgraph-sdk";

async function main() {
  const app = express();
  const port = 5555;

  app.use(bodyParser.json());
  await storage.init({ dir: "./.scheduler" });

  const storedTasks = await storage.values();

  storedTasks.forEach((task: any) => {
    if (cron.validate(task.schedule)) {
      const scheduledTask = cron.schedule(task.schedule, () => {
        console.log(`Executing task ${task.id}: ${task.task}`);
      });
      tasks[task.id] = scheduledTask;
    }
  });

  const tasks: { [key: string]: cron.ScheduledTask } = {};

  app.post(
    "/runs/crons",
    async (req: express.Request, res: express.Response) => {
      const values = await storage.values();
      const data = req.body;
      data.id = nanoid();

      const exists = values.find(
        (task: any) => task.input.thread_id === data.input.thread_id
      );
      const { id, assistant_id, schedule } = data;

      if (!!exists) {
        return res.status(201).json({ id: exists.id });
      }

      if (!schedule || !assistant_id) {
        return res
          .status(400)
          .json({ error: "Missing required fields: id, schedule, task" });
      }

      if (!cron.validate(schedule)) {
        return res.status(400).json({ error: "Invalid cron expression" });
      }

      if (tasks[id]) {
        return res
          .status(400)
          .json({ error: "Task with this ID already exists" });
      }

      const scheduledTask = cron.schedule(schedule, async () => {
        try {
          const client = new Client({
            apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
          });

          const threads = await client.threads.create();

          await client.runs.wait(threads.thread_id, assistant_id, {
            input: {
              ...data.input,
              task_id: id,
            },
          });

          console.log(`Executing task ${id} |${assistant_id}`);
        } catch (e) {
          console.error(e);
        }
      });

      tasks[id] = scheduledTask;

      await storage.setItem(id, data);

      console.log(`Task scheduled: ${id}:${schedule}`);

      res.status(201).json({ id });
    }
  );

  app.delete("/runs/crons/:id", async (req, res) => {
    const { id } = req.params;
    const scheduledTask = tasks[id];

    if (!scheduledTask) {
      return res.status(200).json({ id });
    }

    scheduledTask.stop();
    delete tasks[id];

    await storage.removeItem(id);

    res.status(200).json({ id });
  });

  app.post("/runs/crons/search", async (req, res) => {
    const tasks = await storage.values();

    res.status(200).json({ tasks });
  });

  app.listen(port, () => {
    console.log(`Cron API service is running on http://localhost:${port}`);
  });
}

main().catch(console.error);
