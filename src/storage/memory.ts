import {
    UserID
} from "@agentic-profile/common/schema";

import {
    Account,
    CreateAccount,
} from "./models.js";
import { InMemoryStore } from "@agentic-profile/a2a-service";
import { UnifiedStore } from "./models.js";


function mapToObject<K extends PropertyKey, V>(map: Map<K, V>): Record<K, V> {
    return Object.fromEntries(map) as Record<K, V>;
}

export class DemoStore extends InMemoryStore implements UnifiedStore {

    //
    // Unified Store
    //

    private nextUserId = 1;
    private accounts = new Map<string,Account>();

    async dump() {
        return {
            ...(await super.dump()),
            accounts: mapToObject( this.accounts ),
        }
    }


    //
    // Add Account Support
    //

    async createAccount( { options, fields }: CreateAccount ) {
        let uid;
        if( options?.uid ) {
            uid = +options.uid;
            if( uid >= this.nextUserId )
                this.nextUserId = uid + 1;
        } else
            uid = this.nextUserId++;

        const { name, credit = 2 } = fields;
        const account = { name, credit, uid, created: new Date() };
        this.accounts.set( ''+uid, account );
        return account;
    }

    async fetchAccountFields( uid: UserID, fields?: string ) {
        return this.accounts.get( ''+uid );
    }
}