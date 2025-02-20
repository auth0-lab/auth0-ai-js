import bodyParser from "body-parser";
import express from "express";
import { nanoid } from "nanoid";
import cron from "node-cron";
import storage from "node-persist";

import { Client } from "@langchain/langgraph-sdk";

import { SchedulerParams } from "../sdk/types";

// Task execution function
async function executeTask(taskId: string, data: SchedulerParams) {
  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
    });
    const threads = await client.threads.create();
    await client.runs.wait(threads.thread_id, data.cibaGraphId, {
      input: { ...data, taskId },
    });
    console.log(`Executing task ${taskId} | ${data.cibaGraphId}`);
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  const app = express();
  const port = 5555;
  const tasks: { [key: string]: cron.ScheduledTask } = {};

  app.use(bodyParser.json());
  await storage.init({ dir: "./.scheduler" });

  // Initialize stored tasks
  const storedTasks = await storage.values();

  storedTasks.forEach((task: any) => {
    if (cron.validate(task.schedule)) {
      const scheduledTask = cron.schedule(task.schedule, () => {
        console.log(`Executing task ${task.id}: ${task.task}`);
      });
      tasks[task.id] = scheduledTask;
    }
  });

  app.post("/schedule", async (req: express.Request, res: express.Response) => {
    const data = req.body as SchedulerParams;
    const schedule = "*/5 * * * * *";

    if (!cron.validate(schedule)) {
      return res.status(400).json({ error: "Invalid cron expression" });
    }

    const taskId = nanoid();
    tasks[taskId] = cron.schedule(schedule, () => executeTask(taskId, data));
    await storage.setItem(taskId, data);

    console.log(`Task scheduled: ${taskId}:${schedule}`);
    res.status(201).json({ taskId });
  });

  app.delete("/schedule/:id", async (req, res) => {
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

  app.listen(port, () => {
    console.log(`Cron API service is running on http://localhost:${port}`);
  });
}

main().catch(console.error);
