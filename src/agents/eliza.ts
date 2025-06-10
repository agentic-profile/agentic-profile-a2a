import { Task } from "@agentic-profile/a2a-client/schema";
import { TaskContext, TaskYieldUpdate } from "@agentic-profile/a2a-service";
import { ElizaBot } from "@agentic-profile/eliza";


export async function* elizaAgent({
    task,
    userMessage
}: TaskContext): AsyncGenerator<TaskYieldUpdate, Task | void, unknown> {

    const userText = userMessage.parts.find(e=>e.type === "text")?.text;

    const eliza = new ElizaBot(false);
    const elizaState = task.metadata?.elizaState as any;
    if( elizaState )
        eliza.setState( elizaState );

    const text = userText ? eliza.transform( userText )!: eliza.getInitial()!;

    if( !task.metadata )
        task.metadata = {};
    task.metadata.elizaState = eliza.getState();

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