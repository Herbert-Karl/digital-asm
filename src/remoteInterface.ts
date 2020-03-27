import * as net from 'net';

// class implementing the RemoteInterface of the asm3.jar (https://github.com/hneemann/Assembler/blob/master/src/main/java/de/neemann/assembler/gui/RemoteInterface.java)
// to directly interface with the digital simulator 
export class RemoteInterface {

    private IP: string;
    private Port: number;

    public constructor(ip: string, port: number) {
        this.IP = ip;
        this.Port = port;
    }

    // ...
    public start(pathToHex: string) {
        this.sendRequest("start", pathToHex);
    }

    // ...
    public debug(pathToHex: string) {
        this.sendRequest("debug", pathToHex);
    }

    // ...
    public run(): Promise<string> {
        return this.sendRequest("run", "");
    }

    // ...
    public stop() {
        this.sendRequest("stop", "");
    }

    // ...
    public step(): Promise<string> {
        return this.sendRequest("step", "");
    }


    private async sendRequest(command: string, args: string): Promise<string> {
        let socket = new net.Socket();
        socket.setDefaultEncoding("utf8");
        socket.connect(this.Port, this.IP);
        let response: string = await new Promise((resolve, reject) => {
            if(args!=="") {
                command = command+":"+args;
            }
            socket.write(command);

            // when the socket gets the data, we end the socket connection and return the data from the connection
            socket.on('data', function(data) {
                socket.destroy();
                resolve(data.toString('utf8'));
            });

            socket.on('error', function(err) {
                socket.destroy();
                reject(err);
            });
        });
        if(response!=="ok" || !response.startsWith("ok:")) {
            //ToDo: error
        }
        return response;
    }

}