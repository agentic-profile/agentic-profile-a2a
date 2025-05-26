import express, {
    Response,
    Request
} from "express";
import { A2AService, errorHandler } from "@agentic-profile/a2a-service";
import { createDidResolver } from "@agentic-profile/common";
import {
    app,
    asyncHandler,
    resolveAgentSession
} from "@agentic-profile/express-common";

import { DemoStore } from "./storage/memory.js";
import { coderAgent } from "./agents/coder/coder-agent.js";  
import { elizaAgent } from "./agents/eliza/eliza-agent.js";  
import { commonRoutes } from "./routes.js";

// --- Expose /www directory for static files ---
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use("/", express.static(
    join(__dirname, "..", "www"),
    { dotfiles: "allow" }
));

// --- Set up database ---
const store = new DemoStore();
store.createAccount({
    options: { uid: 2 },        // force to uid=2
    fields: {
        name: "Eric Portman",   // #2 in the Prisoner ;)
        credit: 10              // $10
    }
});

const didResolver = createDidResolver({ store });
const agentSessionResolver = async ( req: Request, res: Response ) => {
    return resolveAgentSession( req, res, store, didResolver );
}

// --- Useful common endpoints like server status, storage debugging ---
app.use("/", commonRoutes({
    store,
    status: { name: "Testing Agentic Profile with A2A" }
}));

//==== Example 1: A2A coder agent with no authentication ====
const a2aService1 = new A2AService( coderAgent, { taskStore: store } );
app.use("/agents/coder", a2aService1.routes() );

//==== Example 2: A2A coder agent with authentication ====
const serviceOptions = { agentSessionResolver, taskStore: store };
const a2aService2 = new A2AService( coderAgent, serviceOptions );
app.use("/users/:uid/coder", a2aService2.routes() );

//==== Example 3: A2A agent with authentication ====
const a2aService3 = new A2AService( elizaAgent, serviceOptions );
app.use("/users/:uid/eliza", a2aService3.routes() );

// Basic error handler for a2a services
app.use( errorHandler );

//==== Example 4: Agentic Profile REST agent with authentication ====
app.put( "/users/:uid/eliza", asyncHandler( async (req, res ) => {
    const { uid } = req.params;

    const agentSession = await agentSessionResolver( req, res );
    if( !agentSession )
        // A 401 has been issued with a challenge, or an auth Error has been thrown
        return;

    const result = {
        uid,
        agentSession,
        message: "Coming soon!"
    }; // TODO: Implement Eliza agent
    res.json( result );
}));

export default app