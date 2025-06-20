/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */


import { MessageData } from "genkit";
import * as schema from "@agentic-profile/a2a-client/schema";
import { ai } from "./genkit.js";

import { TaskContext, TaskYieldUpdate } from "@agentic-profile/a2a-service";
import { CodeMessage } from "./code-format.js"; // CodeMessageSchema might not be needed here

const hasGeminiKey = !!process.env.GEMINI_API_KEY;
if (!hasGeminiKey) {  
    console.warn("WARNING: GEMINI_API_KEY environment variable not set.")
}

export async function* coderAgent({
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
        console.warn(`[CoderAgent] No history/messages found for task ${task.id}`);
        yield {
            state: "failed",
            message: {
                role: "agent",
                parts: [{ type: "text", text: "No input message found." }],
            },
        };
        return;
    }

    if( !hasGeminiKey ) {
        const text = process.env.NO_GEMINI_KEY_MESSAGE ?? "No Gemini API key found.  Please set the GEMINI_API_KEY environment variable.";
        yield {
            state: "completed",
            message: {
                role: "agent",
                parts: [{ type: "text", text }],
            },
        };
        return;
    }

    yield {
        state: "working",
        message: {
            role: "agent",
            parts: [{ type: "text", text: "Generating code..." }],
        },
    };

    const { stream, response } = await ai.generateStream({
        system:
            "You are an expert coding assistant. Provide a high-quality code sample according to the output instructions provided below. You may generate multiple files as needed.",
        output: { format: "code" },
        messages, // Pass mapped history
    });
    
    console.log( "out", stream, response );

    const fileContents = new Map<string, string>(); // Store latest content per file
    const fileOrder: string[] = []; // Store order of file appearance
    let emittedFileCount = 0; // Track how many files we've yielded

    for await (const chunk of stream) {
        const codeChunk = chunk.output as CodeMessage | undefined;
        if (!codeChunk?.files) continue;

        let currentFileOrderIndex = -1; // Track index in fileOrder for current chunk

        for (const { filename, content } of codeChunk.files) {
            if( !filename )
                continue;

            // Update the content regardless
            fileContents.set(filename, content);

            // Check if this is the first time seeing this file
            if (!fileOrder.includes(filename)) {
                fileOrder.push(filename);
                currentFileOrderIndex = fileOrder.length - 1;

                // If this newly seen file isn't the *first* file overall,
                // and we haven't emitted the *previous* file yet, emit the previous one now.
                if (
                    currentFileOrderIndex > 0 &&
                    emittedFileCount < currentFileOrderIndex
                ) {
                    const prevFileIndex = currentFileOrderIndex - 1;
                    const prevFilename = fileOrder[prevFileIndex];
                    const prevFileContent = fileContents.get(prevFilename) ?? ""; // Should exist

                    console.log(
                        `[CoderAgent] Emitting completed file (index ${prevFileIndex}): ${prevFilename}`
                    );
                    yield {
                        index: prevFileIndex,
                        name: prevFilename,
                        parts: [{ type: "text", text: prevFileContent }],
                        lastChunk: true,
                    };
                    emittedFileCount++;
                }
            }
        }
    }

    // After the loop, emit any remaining files that haven't been yielded
    // (This should typically just be the very last file)
    for (let i = emittedFileCount; i < fileOrder.length; i++) {
        const filename = fileOrder[i];
        const content = fileContents.get(filename) ?? "";
        console.log(`[CoderAgent] Emitting final file (index ${i}): ${filename}`);
        yield {
            index: i,
            name: filename,
            parts: [{ type: "text", text: content }],
            lastChunk: true,
        };
    }

    // Get the final list of files from the complete response (for the final message)
    const fullMessage = (await response).output as CodeMessage | undefined; // Add undefined check
    const generatedFiles = fullMessage?.files.map((f) => f.filename) ?? [];

    yield {
        state: "completed",
        message: {
            role: "agent",
            parts: [
                {
                    type: "text",
                    text: 
                        generatedFiles.length > 0
                            ? `Generated files: ${generatedFiles.join(", ")}`
                            : "Completed, but no files were generated.",
                },
            ],
        },
    };
}

