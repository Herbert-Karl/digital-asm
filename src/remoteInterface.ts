/*
Copyright © 2020 Herbert Bärschneider

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
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
    // returns:
    // passes through a promise waiting for a response from executing the command in the digital simulator
    // the resolved number is the current program address (or -1 if there was only a confomrmation response); may reject due to errors
    public start(pathToHexFile: string): Promise<number> {
        return this.sendRequest("start", pathToHexFile);
    }

    // loading the program but does not begin running it
    // params:
    // path to the hexFile, which shall be run in the simulator
    // returns:
    // passes through a promise waiting for a response from executing the command in the digital simulator
    // the resolved number is the current program address (or -1 if there was only a confomrmation response); may reject due to errors
    public debug(pathToHexFile: string): Promise<number> {
        return this.sendRequest("debug", pathToHexFile);
    }

    // runs the program
    // executing is stopped, when a BRK statement comes up
    // returns:
    // passes through a promise waiting for a response from executing the command in the digital simulator
    // the resolved number is the current program address (or -1 if there was only a confomrmation response); may reject due to errors
    public run(): Promise<number> {
        return this.sendRequest("run", "");
    }

    // stops execution of the program
    // returns:
    // passes through a promise waiting for a response from executing the command in the digital simulator
    // the resolved number is the current program address (or -1 if there was only a confomrmation response); may reject due to errors
    public stop(): Promise<number> {
        return this.sendRequest("stop", "");
    }

    // runs a single clock step in the simulator
    // returns:
    // passes through a promise waiting for a response from executing the command in the digital simulator
    // the resolved number is the current program address (or -1 if there was only a confomrmation response); may reject due to errors
    public step(): Promise<number> {
        return this.sendRequest("step", "");
    }

    // function for sending commands and arguments to the digital simulator via tcp socket
    // params:
    // the command for the simulator
    // and potentially needed arguments
    // returns:
    // a Promise which either resolves to a number that is the current address in the program hex code
    // or rejects into an error. the error might come from the simulator itself or from the tcp connection
    private sendRequest(command: string, args: string): Promise<number> {
        let socket = new net.Socket();
        socket.setDefaultEncoding("utf8");
        socket.setNoDelay(true);
        socket.connect(this.Port, this.IP);

        return new Promise<number>((resolve, reject) => {
                       
            socket.on('connect', () => {
                if(args!=="") {
                    command = command+":"+args;
                }
                try {
                    let message = RemoteInterface.createSocketMessage(command);
                    socket.write(message);
                } catch (error) {
                    reject(error);
                }
            });

            socket.on('data', (data) => {
                socket.end();
                try {
                    let responseNumber = RemoteInterface.convertSocketResponse(data);
                    resolve(responseNumber);
                } catch (error) {
                    reject(error);
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                reject(err);
            });
        });
    }

    private static createSocketMessage(command: string): Uint8Array {
        let convertedCommand = new TextEncoder().encode(command);
        // the DataOutputStream/DataInputStream used in java-based simulator has a special need:
        // the length of the data send/to be send, prefixed to the data itself as two bytes 
        let length = RemoteInterface.getUTF8ByteLength(convertedCommand);
        let message = new Uint8Array(length.length+convertedCommand.length);
        message.set(length);
        message.set(convertedCommand, length.length);
        return message;
    }

    private static getUTF8ByteLength(command: Uint8Array): Uint8Array {
        let len = command.length;
        if (len>=((1<<16))) {
            throw new Error("Command exceeds maximum Length of 2^16 UTF8 Code points!");
        } 
        let high = len & 65280; // 0b 1111 1111 0000 0000
        let low = len & 255; // 0b 0000 0000 1111 1111
        return Uint8Array.from([high, low]);
    }

    private static convertSocketResponse(response: Buffer): number {
        let responseString = response.toString('utf8');
        if(!RemoteInterface.isPositiveResponse(responseString)) {
            throw new Error("Error received from simulator: " + responseString);
        }
        return RemoteInterface.getAddress(responseString);
    }

    private static isPositiveResponse(response: string): boolean {
        return response.substr(2,2)==="ok" || response.substr(2,3)==="ok:";
    }

    // function for converting the response string from digital, which contains the current address, into a usable number
    // params:
    // a string, being a positive response from digital
    // returns:
    // the address contained in the response as base 10 number or -1 if no number was present
    private static getAddress(response: string): number {
        if(response.length===4) {
            // this was only a conformation response without an address
            // as such, we have no number to compute and return -1
            return -1;
        }
        else {
            // we slice the first 5 bytes away, as they are not part of the number
            // then we parse the string representing a base 16 number 
            return parseInt(response.substr(5), 16);
        }
    }

}