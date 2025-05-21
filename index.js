import log from "loglevel";

import serverlessExpress from "@codegenie/serverless-express"
import app from "./dist/app.js"

log.setLevel( process.env.LOG_LEVEL ?? "info" );
console.log( "log level", log.getLevel() );

const seHandler = serverlessExpress({ app });

export function handler(event, context, callback ) {
    context.callbackWaitsForEmptyEventLoop = false;
    return seHandler( event, context, callback );
}