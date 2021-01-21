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
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { RemoteInterface } from './remoteInterface';
import { AsmBreakpoint } from "./asmBreakpoint";

export class AsmDebugger extends EventEmitter {

    // filesystem correct paths to the asm file and hex file
    private pathToAsmFile: string = "";
    private pathToHexFile: string = "";

    // mapping of the addresses used/returned by the digital simulator to the corresponding code lines in the asm file
    private mapAddrToCodeLine: Map<number, number>;

    private breakpoints: AsmBreakpoint[];
    private breakpointNumber = 1;

    // values for tracking state
    private currentCodeLine = 0;
    private numberOfNonBRKBreakpoints = 0;

    // for communicating with the digital simulator
    private remoteInterface: RemoteInterface;

    // contructor for creating debugger and defining the important internal variables
    // a call to config() should follow before using the debugger
    // the returned object can already be used for setting up event listeners
    public constructor() {
        super();

        this.mapAddrToCodeLine= new Map<number, number>();
        this.breakpoints = new Array<AsmBreakpoint>();

        // this is just a dummy remoteInterface, which shouldn't be used
        this.remoteInterface = new RemoteInterface("localhost", 8080);
    }

    // function for defining the important internal variables
    // which should be called before actually using this debugger
    // params:
    // Uris to the asmFile, hexFile and mappingFile
    // a boolean controling, if BRK Statements are to be made into breakpoints for debugging
    // expects:
    // the hexFile is the parsed version of the asmFile
    // the mappingFile contains a json array of hex addresses to asm codelines
    public config(asm: string, hex: string, map: string, IPofSimulator: string, PortOfSimulator: number) {
        this.pathToAsmFile = asm;
        this.pathToHexFile = hex;

        // loading the mapping of hex addresses to asm codelines
        let rawdata = fs.readFileSync(map);
        let mapping: Array<{addr:number, line:number}> = JSON.parse(rawdata.toString('utf8'));
        mapping.forEach(elem => {
            this.mapAddrToCodeLine.set(elem.addr, elem.line);
        });

        this.remoteInterface = new RemoteInterface(IPofSimulator, PortOfSimulator);
    }

    public start(stopOnEntry: boolean) {
        this.remoteInterface.debug(this.pathToHexFile)
            .then((addr) => {
                this.currentCodeLine = this.getFirstCodeLine();
                if(stopOnEntry) {
                    this.sendEvent('stopOnEntry');
                } else {
                    this.run();
                }
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    public continue() {
        this.run();
    }

    public step() {
        this.run(true);
    }

    public stop() {
        this.remoteInterface.stop()
            .then((addr) => {
                this.sendEvent('pause');
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    // internal function managing the prorgam execution
    // the program will be run depending on the state of the debugger
    // params:
    // boolean which signals, if only a single step should be made; default value is false
    private async run(singleStep: boolean = false) {
        if(singleStep) {
            this.remoteInterface.step()
                .then((addr) => {
                    // we map the returned address to the codeline; the construct behind the map.get covers the case that the map returnes undefined
                    this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
                    this.sendEvent('stopOnStep');
                })
                .catch((err) => {
                    this.sendEvent('error', err);
                });
        } else {
            if(this.numberOfNonBRKBreakpoints===0) {
                // if we have no breakpoints, which aren't based on BRK statements,
                // we can savely run the program till a BRK statement comes up
                this.remoteInterface.run()
                    .then((addr) => {
                        this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
                        this.sendEvent('stopOnBreakpoint');
                    })
                    .catch((err) => {
                        this.sendEvent('error', err);
                    });
            } else {
                // because there are non BRK breakpoints, we run the program step by step, until we reach a codeline with a breakpoint
                let looping: boolean = true;
                while(looping) {
                    try {
                        let addr = await this.remoteInterface.step();
                        // we map the returned address to the codeline; the construct behind the map.get covers the case that the map returnes undefined
                        this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
                        let index = this.breakpoints.findIndex(bp => bp.codeline === this.currentCodeLine);
                        // if we have a breakpoint at the current codeline, we stop
                        if(index!==-1) {
                            looping = false;
                            this.sendEvent('stopOnBreakpoint');
                        }
                    } catch(err) {  // for possible errors when await -ing 
                        this.sendEvent('error', err);
                    }
                }
            }
        }
    }

    // setting a breakpoint in the given line
    // params:
    // the codeline at which the breakpoint shall be set
    // a boolean signaling, if the breakpoints is due to a BRK statement at this line; default value is false
    // returns:
    // the new breakpoint
    public setBreakpoint(codeline: number, brk: boolean = false): AsmBreakpoint {
        let newBreakpoint = <AsmBreakpoint> {codeline, id: this.breakpointNumber++, brk, verified: false};
        this.verifyBreakpoint(newBreakpoint);
        this.checkBreakpointForBRK(newBreakpoint);
        this.breakpoints.push(newBreakpoint);
        if(!newBreakpoint.brk) { this.numberOfNonBRKBreakpoints++; } // increase tracking number for non BRK breakpoints
        return newBreakpoint;
    }

    // function for removing a single breakpoint
    // params:
    // codeline at which the breakpoint is set
    // returns:
    // either the breakpoint that was removed or undefined, if no breakpoint was found at the given codeline
    public clearBreakpoint(codeline: number): AsmBreakpoint | undefined {
        let index = this.breakpoints.findIndex(bp => bp.codeline === codeline);
        // if no breakpoint for this line is found (index -1) we can't get and return a breakpoint
        if(index >= 0) {
            let breakpoint = this.breakpoints[index];
            this.breakpoints.splice(index, 1); //removes one element in the array beginning at the position given by index, effectivly deleting the breakpoint from the array
            if(!breakpoint.brk) { this.numberOfNonBRKBreakpoints--; } // decrease tracking number for non BRK breakpoints
            return breakpoint;
        }
        return undefined;
    }

    public clearAllBreakpoints() {
        this.breakpoints = new Array<AsmBreakpoint>();
        this.numberOfNonBRKBreakpoints = 0;
    }

    // function for creating a stacktrace / array of stackframes
    // the returned "frames" closely resemble the frames used by the Debug Adapter Protocol
    // currently we support only a single stackFrame; as such, the parameter for start- and endFrame do nothing
    // params:
    // start and end number for the stack frames
    // returns:
    // an array of stackframes as untyped objects
    public stack(startFrame: number, endFrame: number): Array<any> {
        let frames = new Array<any>();

        let newFrame = {
            id: 1,
            name: path.basename(this.pathToAsmFile),
            source: this.pathToAsmFile,
            line: this.currentCodeLine,
            column: this.getColumn(this.currentCodeLine),
        };

        frames.push(newFrame);

        return frames;
    }

    // used events: error, stopOnEntry, stopOnStep, stopOnBreakpoint, pause
    private sendEvent(event: string, ...args: any[]) {
        // executes the given function asynchronously as soon as possible (next iteration of the nodeJs event loop)
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }

    // getter function for the breakpoints variable
    public get getBreakpoints() {
        return this.breakpoints;
    }

    // getter function for the underlying .asm file
    public get getPathToAsmFile() {
        return this.pathToAsmFile;
    }

    // helper function
    // returns the index of the first non-whitespace char in the codeLine referenced by the given line number
    // params:
    // number of the codeLine
    private getColumn(line: number): number {
        let codeLine = fs.readFileSync(this.pathToAsmFile, 'utf8').split('\n')[line]; // reads in the file as a single string, splits it into an array and then only takes the referenced line 
        return codeLine.indexOf(codeLine.trimLeft());
    }

    // helper function
    // uses the mapping between codelines and hex address
    // returns:
    // the code line number for the first address in the hex file; defaults to 1, if for some reason, there is no codeline for address 0
    private getFirstCodeLine(): number {
        return this.mapAddrToCodeLine.get(0) || 1;
    }

    private verifyBreakpoint(bp: AsmBreakpoint) {
        this.mapAddrToCodeLine.forEach((existingCodeLine) => {
            if(bp.codeline===existingCodeLine) {
                bp.verified = true;
                return;
            }
        });
    }

    // helper function
    // checks if a breakpoint is on a code line with a brk statement
    // sets the brk attribute accordingly
    private checkBreakpointForBRK(bp: AsmBreakpoint) {
        // load all lines of the source file
        const sourceCodeLines = fs.readFileSync(this.pathToAsmFile, 'utf8').split('\n');
        // check the line, at which the breakpoint is at, for 'BRK' and if there is a ';' before it
        let line = sourceCodeLines[bp.codeline-1];
        let brk = line.indexOf("BRK");
        let semicolon = line.indexOf(";");
        if(brk!==-1 && (semicolon===-1 || brk<semicolon)) {
            bp.brk = true;
        }
    }

}