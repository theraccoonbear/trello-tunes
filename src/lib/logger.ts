import * as cbfs from 'fs';

const fs = cbfs.promises;

export interface LoggerOptions {
    file?: string,
    logger?: LoggerInterface,
}

enum LogLevel {
    Log = "Log",
    Warn = "Warn",
    Error = "Error",
    Fatal = "Fatal",
};

class ConcreteLogger {
    async write(message: string) {}
}

class LoggerInterface {
    constructor() {
        if (typeof (this as any).write == 'undefined') {
            throw new Error("Can't `write`");
        }
    }
}

class ConsoleLogger extends LoggerInterface {
    constructor() {
        super();
    }

    async write(message: string) {
        console.log(message);
    }
}

class FileLogger extends LoggerInterface {
    private file: string = "";
    private fh?: cbfs.promises.FileHandle;
    private delimiter = `\n`; //${String.fromCharCode(27)}`;

    constructor(file: string) {
        super();
        this.file = file;
    }

    async getFH() {
        if (typeof this.fh == 'undefined') {
            this.fh = await fs.open(this.file, 'a');
        }
        return this.fh
    }

    async write(message: string) {
        const fh = await this.getFH();
        await fs.appendFile(fh, message + this.delimiter);
    }
}

export const NewLogger = (config: string | LoggerOptions) => {
    let o: LoggerOptions = {};

    if (typeof config == 'string') {
        o.file = config;
    } else {
        return new Logger(o)
    }
    return new Logger(o);
};

class Logger {
    private logInterface: ConcreteLogger = new ConsoleLogger()

    constructor(options: LoggerOptions) {
        if (options.file) {
            this.logInterface = (new FileLogger(options.file)) as ConcreteLogger;
        } else {
            this.logInterface = (new ConsoleLogger()) as ConcreteLogger;
        }
    }

    async log(message: any) {
        return this.write(LogLevel.Log, message);
    }

    async warn(message: any) {
        return this.write(LogLevel.Warn, message);
    }

    async error(message: any) {
        return this.write(LogLevel.Error, message);
    }

    async fatal(message: any) {
        return this.write(LogLevel.Fatal, message);
    }

    async write(level: LogLevel, message: string) {
        let prepared;
        switch (typeof message) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'bigint':
                prepared = message.toString();
                break;
            default:
                prepared = message; //JSON.stringify(message);
                break;
        }
        
        const logObj = JSON.stringify({
            level,
            message: prepared,
            timestamp: new Date().toUTCString(),
        });
        await this.logInterface.write(logObj)
    }
}