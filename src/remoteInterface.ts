import * as net from 'net';
import { TextEncoder } from 'util';

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
    public async start(pathToHex: string): Promise<string> {
        return this.sendRequest("start", pathToHex);
    }

    // loading the program but does not begin running it
    // params:
    // path to the hexFile, which shall be run in the simulator
    public async debug(pathToHex: string): Promise<string> {
        return this.sendRequest("debug", pathToHex);
    }

    // runs the program
    // executing is stopped, when a BRK statement comes up
    public async run(): Promise<string> {
        return this.sendRequest("run", "");
    }

    // stops execution of the program
    public async stop(): Promise<string> {
        return this.sendRequest("stop", "");
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
        socket.setNoDelay(true);
        socket.connect(this.Port, this.IP);

        return new Promise<string>((resolve, reject) => {
            if(args!=="") {
                command = command+":"+args;
            }
            let length = RemoteInterface.getUTF8ByteLength(command);
            // we add the length of the command infront of the command before writing,
            // because the simulator on the other end needs/excepts this information 
            // (specialty of the DataOutputStream/DataInputStream used in the java program)
            socket.write(length+command);

            // when the socket gets the data, we end the socket connection and return the data from the connection
            socket.on('data', function(data) {
                socket.destroy();
                let response = data.toString('utf8');
                // checking the returned data from the simulator for an okay signal
                if(!(response.substr(2,2)==="ok" || response.substr(2,3)==="ok:")) {
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

    // function calculating the length of the given string and returning it as a two byte string in utf-8 encoding
    private static getUTF8ByteLength(command: string): string {
        // we calculate the length of the string by encoding it into a corresponding array of utf-8 codepoints and taking the length of that one
        let len = (new TextEncoder().encode(command)).length;
        // then we seperate the upper and lower byte
        let high = len & 65280;
        let low = len & 255;
        // and create a utf-8 string representation of these two bytes 
        return String.fromCodePoint(high, low);
    }

}