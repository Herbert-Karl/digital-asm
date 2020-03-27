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

    // loading the program and starting it
    // params:
    // path to the hexFile, which shall be run in the simulator 
    public start(pathToHex: string) {
        this.sendRequest("start", pathToHex);
    }

    // loading the program but does not begin running it
    // params:
    // path to the hexFile, which shall be run in the simulator
    public debug(pathToHex: string) {
        this.sendRequest("debug", pathToHex);
    }

    // runs the program
    // executing is stopped, when a BRK statement comes up
    public async run(): Promise<string> {
        return this.sendRequest("run", "");
    }

    // stops execution of the program
    public stop() {
        this.sendRequest("stop", "");
    }

    // runs a single clock step in the simulator
    public async step(): Promise<string> {
        return this.sendRequest("step", "");
    }

    // function for sending commands and arguments to the digital simulator via tcp socket
    // params:
    // the command for the simulator
    // and potentially needed arguments
    // returns:
    // a Promise which either resolves to a string returned by the simulator that contains the current address in the program hex code
    // or rejects into an error. the error might come from the simulator itself or from the tcp connection
    private async sendRequest(command: string, args: string): Promise<string> {
        let socket = new net.Socket();
        socket.setDefaultEncoding("utf8");
        socket.connect(this.Port, this.IP);

        return new Promise<string>((resolve, reject) => {
            if(args!=="") {
                command = command+":"+args;
            }
            socket.write(command);

            // when the socket gets the data, we end the socket connection and return the data from the connection
            socket.on('data', function(data) {
                socket.destroy();
                let response = data.toString('utf8');
                // checking the returned data from the simulator for an okay signal
                if(!(response==="ok" || response.startsWith("ok:"))) {
                    reject(new Error("Error received from simulator: " + response));
                }
                resolve(response);
            });

            socket.on('error', function(err) {
                socket.destroy();
                reject(err);
            });
        });
    }

}