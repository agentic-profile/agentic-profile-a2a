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


(async ()=>{
    const port = process.env.PORT || 4004;
    const keyring: JWKSet[] = [];

    try {
        // Well-known agentic profile and agent card
        let newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", ".well-known" ),
            did: `did:web:localhost:${port}`,
            services: [
                {
                    name: "Secure A2A coder",
                    type: "A2A",
                    id: "a2a-coder",
                    url: `http://localhost:${port}`  // points to the one well-known agent for this server
                },
                {
                    name: "A2A Eliza therapist with authentication",
                    type: "A2A",
                    id: "a2a-eliza",
                    url: `http://localhost:${port}/users/2/eliza/` // points to the Eliza agent which is defined later...
                }
            ],
            agents: [{
                name: "A2A coder",
                url: `http://localhost:${port}/users/2/coder/`,
                skills: [ AGENT_CODING_SKILL ]
            }]
        });
        keyring.push( ...newKeys );

        // Coder agent with no authentication
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "agents", "coder" ),
            did: `did:web:localhost:${port}:agents:coder`,
            services: [
                {
                    name: "Unsecured A2A coder",
                    type: "A2A",
                    id: "a2a-coder",
                    url: `http://localhost:${port}/agents/coder/`
                }
            ],
            agents: [{
                name: "A2A coder with no authentication",
                url: `http://localhost:${port}/agents/coder/`,
                skills: [ AGENT_CODING_SKILL ]
            }]
        });
        keyring.push( ...newKeys );

        // Coder agent with authentication
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "users", "2", "coder" ),
            did: `did:web:localhost:${port}:users:2:coder`,
            services: [
                {
                    name: "A2A coder with authentication",
                    type: "A2A",
                    id: "a2a-coder",
                    url: `http://localhost:${port}/users/2/coder/`
                }
            ],
            agents: [{
                name: "A2A coder with authentication",
                url: `http://localhost:${port}/users/2/coder/`,
                skills: [ AGENT_CODING_SKILL ]
            }]
        });
        keyring.push( ...newKeys );

        // Eliza agent with authentication
        newKeys = await createAgentCardAndProfile({
            dir: join( __dirname, "..", "www", "users", "2", "eliza" ),
            did: `did:web:localhost:${port}:users:2:eliza`,
            services: [
                {
                    name: "A2A Eliza therapist with authentication",
                    type: "A2A",
                    id: "a2a-eliza",
                    url: `http://localhost:${port}/users/2/eliza/`
                }
            ],
            agents: [{
                name: "A2A Eliza therapist with authentication",
                url: `http://localhost:${port}/users/2/eliza/`,
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