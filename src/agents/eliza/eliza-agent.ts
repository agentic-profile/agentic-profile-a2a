/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import { MessageData } from "genkit";
import * as schema from "@agentic-profile/a2a-client/schema";
import { TaskContext, TaskYieldUpdate } from "@agentic-profile/a2a-service";
import ElizaBot from "./elizabot.js";


export async function* elizaAgent({
    task,
    history, // Extract history from context
}: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
    // Use AsyncGenerator and correct return type
    // Map A2A history to Genkit messages
    const messages: MessageData[] = (history ?? [])
        .map((m) => ({
            role: (m.role === "agent" ? "model" : "user") as "user" | "model",
            content: m.parts
                .filter((p): p is schema.TextPart => !!(p as schema.TextPart).text)
                .map((p) => ({ text: p.text })),
        }))
        .filter((m) => m.content.length > 0);

    if (messages.length === 0) {
        console.warn(`[ElizaAgent] No history/messages found for task ${task.id}`);
        yield {
            state: "failed",
            message: {
                role: "agent",
                parts: [{ type: "text", text: "No input message found." }],
            },
        };
        return;
    }

    const eliza = new ElizaBot(false);
    const userText = "Good morning!"
    const text = userText ? eliza.transform( userText )!: eliza.getInitial()!;

    yield {
        state: "completed",
        message: {
            role: "agent",
            parts: [
                {
                    type: "text",
                    text
                },
            ],
        },
    };
}