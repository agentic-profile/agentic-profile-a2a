import { UserID } from "@agentic-profile/common/schema";
import { AgenticProfileStore } from "@agentic-profile/common";
import { ClientAgentSessionStore } from "@agentic-profile/auth";
import { TaskStore } from "@agentic-profile/a2a-service";


//
// Accounts
//

export interface User {
    uid: UserID,
    name: string,
    created: Date
}

export interface Account extends User {
    credit?: number
}

export interface CreateAccountOptions {
    uid?: UserID
}

export interface CreateAccountFields {
    name: string,
    credit?: number
}

export interface CreateAccount {
    options: CreateAccountOptions,
    fields: CreateAccountFields
}

export interface AccountStore {
    createAccount( account: CreateAccount ): Promise<Account>;
    fetchAccountFields( uid: UserID, fields?: string ): Promise<Account | undefined>;
}

//
// Unified Storage
//

export interface UnifiedStore extends AccountStore, AgenticProfileStore, ClientAgentSessionStore, TaskStore {
    dump(): Promise<any>;
}
