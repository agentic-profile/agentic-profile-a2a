import 'dotenv/config';

import { join } from "path";
import { createEdDsaJwk } from "@agentic-profile/auth";
import {
    createAgenticProfile,
    webDidToUrl
} from "@agentic-profile/common";
import { saveProfile } from "@agentic-profile/express-common";
import {
    __dirname,
    AGENT_CARD_TEMPLATE,
    AGENT_CODING_SKILL,
    saveAgentCard
} from "./util.js";
import { JWKSet } from '@agentic-profile/common/schema';

const port = process.env.PORT || 4004;
const hostname = process.env.HOSTNAME || "localhost:" + port;
const baseUrl = process.env.BASE_URL || `http://${hostname}`;

(async ()=>{

    const keyring: JWKSet[] = [];

    try {
        // Well-known agentic profile and agent card
        let newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", ".well-known" ),
            did: `did:web:${hostname}`,
            services: [
                {
                    name: "A2A coder with Universal Authentication",
                    type: "A2A",
                    id: "coder",  // scope of DID is the server, so call this agent a "coder"
                    url: `${baseUrl}/users/2/coder/`  // points to the one well-known agent for this server
                },
                {
                    name: "A2A Eliza therapist with Universal Authentication",
                    type: "A2A",
                    id: "eliza", // scope of DID is the server, so call this agent an "eliza"
                    url: baseUrl // points to the Eliza agent which is defined later...
                }
            ],
            agents: [{
                name: "A2A Eliza therapist with Universal Authentication",
                url: `${baseUrl}/users/2/eliza/`,
                skills: [],
                capabilities: { stateTransitionHistory: true }
            }]
        });
        keyring.push( ...newKeys );

        // Coder agent with no authentication
        // Scope of DID is the coder, so make the agent id a "chat"
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "agents", "coder" ),
            did: `did:web:${hostname}:agents:coder`,
            services: [
                {
                    name: "Unsecured A2A coder",
                    type: "A2A",
                    id: "chat",
                    url: `${baseUrl}/agents/coder/`
                }
            ],
            agents: [{
                name: "Unsecured A2A coder",
                url: `${baseUrl}/agents/coder/`,
                skills: [ AGENT_CODING_SKILL ]
            }]
        });
        keyring.push( ...newKeys );

        // Eliza agent with no authentication
        // Scope of DID is the eliza, so make the agent id a "chat"
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "agents", "eliza" ),
            did: `did:web:${hostname}:agents:eliza`,
            services: [
                {
                    name: "Unsecured A2A Eliza therapist",
                    type: "A2A",
                    id: "chat",
                    url: `${baseUrl}/agents/eliza/`
                }
            ],
            agents: [{
                name: "Unsecured A2A Eliza therapist",
                url: `${baseUrl}/agents/eliza/`,
                skills: [],
                capabilities: { stateTransitionHistory: true }
            }]
        });
        keyring.push( ...newKeys );

        // Coder agent with authentication
        // Scope of DID is the coder, so make the agent id a "chat"
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "users", "2", "coder" ),
            did: `did:web:${hostname}:users:2:coder`,
            services: [
                {
                    name: "A2A coder with Universal Authentication",
                    type: "A2A",
                    id: "chat",
                    url: `${baseUrl}/users/2/coder/`
                }
            ],
            agents: [{
                name: "A2A coder with Universal Authentication",
                url: `${baseUrl}/users/2/coder/`,
                skills: [ AGENT_CODING_SKILL ]
            }]
        });
        keyring.push( ...newKeys );

        // Eliza agent with authentication
        // Scope of DID is the eliza, so make the agent id a "chat"
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "users", "2", "eliza" ),
            did: `did:web:${hostname}:users:2:eliza`,
            services: [
                {
                    name: "A2A Eliza therapist with Universal Authentication",
                    type: "A2A",
                    id: "chat",
                    url: `${baseUrl}/users/2/eliza/`
                }
            ],
            agents: [{
                name: "A2A Eliza therapist with Universal Authentication",
                url: `${baseUrl}/users/2/eliza/`,
                skills: [],
                capabilities: { stateTransitionHistory: true }
            }]
        });
        keyring.push( ...newKeys );

        //
        // Save combined keyring
        //
        await saveProfile({
            dir: join( __dirname, ".." ),
            keyring
        });

    } catch(error) {
    	console.log( "Failed to save profile", error );
    }
})();

async function createAgentCardAndProfile({ dir, did, services, agents }) {
    const { profile, keyring } = await createAgenticProfile({
        services,
        createJwkSet: createEdDsaJwk 
    });
    profile.id = did;

    await saveProfile({ dir, profile });
    console.log( `Saved profile to ${dir}/did.json
    DID: ${did}
    url: ${webDidToUrl(did)}` );

    for (const agent of agents) {
        const { dir: targetDir = dir, ...agentData } = agent;
        
        const card = {
            ...AGENT_CARD_TEMPLATE,
            ...agentData
        };

        await saveAgentCard( targetDir, card );
        console.log( `Saved agent card to ${targetDir}/agent.json\n` );
    }

    return keyring;
}