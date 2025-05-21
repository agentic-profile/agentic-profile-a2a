import 'dotenv/config';
import log from "loglevel";
import app from "./src/app.ts";

log.setLevel((process.env.LOG_LEVEL ?? "trace") as log.LogLevelDesc);
console.log( "log level", log.getLevel() );

const port = process.env.PORT || 4004;
app.listen(port, () => {
    log.info(`A2A + Agentic Profile Node server listening on http://localhost:${port}`);
});