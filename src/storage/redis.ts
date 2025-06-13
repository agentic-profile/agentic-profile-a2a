import { Redis, RedisOptions } from "ioredis";

import { UnifiedStore } from "./models.js";
import { AgenticProfile } from "@agentic-profile/common/schema";
import { DID } from "@agentic-profile/common/schema";
import { ClientAgentSession, ClientAgentSessionUpdates } from "@agentic-profile/auth";
import { TaskAndHistory } from "@agentic-profile/a2a-service";


export class RedisStore implements UnifiedStore {
    private redis: Redis;

    constructor(redisUrl?: string) {
        console.log( "Using RedisStore", redisUrl );
        if( !redisUrl )
            redisUrl = "redis://localhost:6379";

        const [ scheme, hostAndPort ] = redisUrl.split( "://" );
        const [ host, port = 6379 ] = hostAndPort.split( ":" );

        const options: RedisOptions = {
            host,
            port: Number(port),
            connectTimeout: 10000
        };

        if( scheme === "rediss" )
            options.tls = {};

        console.log( "Redis options", options );
        this.redis = new Redis(options);
    }

    /*
    async createAccount(account: CreateAccount): Promise<Account> {
        throw new Error("Method not implemented.");
    }
    async fetchAccountFields(uid: UserID, fields?: string | undefined): Promise<Account | undefined> {
        throw new Error("Method not implemented.");
    }
    */

    async saveAgenticProfile(profile: AgenticProfile): Promise<void> {
        // NOTE: Assumes AgenticProfile has a 'did' property.
        const key = `profile:${profile.id}`;
        await this.redis.set(key, JSON.stringify(profile));
    }

    async loadAgenticProfile(did: DID): Promise<AgenticProfile | undefined> {
        const key = `profile:${did}`;
        const data = await this.redis.get(key);
        if (!data) {
            return undefined;
        }
        return JSON.parse(data);
    }

    async createClientAgentSession(challenge: string): Promise<number> {
        const id = await this.redis.incr("next_session_id");
        const key = `session:${id}`;
        const session: Partial<ClientAgentSession> = {
            id,
            challenge,
        };
        await this.redis.set(key, JSON.stringify(session));
        return id;
    }

    async fetchClientAgentSession(id: number): Promise<ClientAgentSession | undefined> {
        const key = `session:${id}`;
        const data = await this.redis.get(key);
        if (!data) {
            return undefined;
        }
        return JSON.parse(data);
    }

    async updateClientAgentSession(id: number, updates: ClientAgentSessionUpdates): Promise<void> {
        const key = `session:${id}`;
        const data = await this.redis.get(key);
        if (!data) {
            throw new Error("Session not found");
        }
        const session = JSON.parse(data);
        const updatedSession = { ...session, ...updates };
        await this.redis.set(key, JSON.stringify(updatedSession));
    }

    async saveTask(data: TaskAndHistory): Promise<void> {
        // NOTE: Assumes TaskAndHistory has 'taskId' and 'sessionId' properties.
        const { taskId, sessionId } = data as any;
        const key = `task:${sessionId || 'null'}:${taskId}`;
        await this.redis.set(key, JSON.stringify(data));
    }

    async loadTask(taskId: string, sessionId: string | null): Promise<TaskAndHistory | null> {
        const key = `task:${sessionId || 'null'}:${taskId}`;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }

    async dump() {
        console.log("Dumping all data from Redis...");
        const keys = await this.redis.keys('*');
        const dump: Record<string, any> = {};
        for (const key of keys) {
            const type = await this.redis.type(key);
            switch (type) {
                case 'string':
                    const value = await this.redis.get(key);
                    try {
                        dump[key] = JSON.parse(value!);
                    } catch (e) {
                        dump[key] = value;
                    }
                    break;
                case 'hash':
                    dump[key] = await this.redis.hgetall(key);
                    break;
                case 'list':
                    dump[key] = await this.redis.lrange(key, 0, -1);
                    break;
                case 'set':
                    dump[key] = await this.redis.smembers(key);
                    break;
                case 'zset':
                    dump[key] = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
                    break;
                default:
                    dump[key] = `unsupported type: ${type}`;
                    break;
            }
        }
        console.log(JSON.stringify(dump, null, 2));
    }
}
