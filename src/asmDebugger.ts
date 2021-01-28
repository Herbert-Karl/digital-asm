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
                    this.executeTillBreakpoint();
                }
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    public continue() {
        this.executeTillBreakpoint();
    }

    public step() {
        this.executeStepCommand();
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

    private executeStepCommand() {
        this.remoteInterface.step()
            .then((address) => {
                this.updateCurrentCodeline(address);
                this.sendEvent('stopOnStep');
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    private async executeTillBreakpoint() {
        if(this.numberOfNonBRKBreakpoints===0) {
            this.executeRunCommand();
        } else {
            await this.loopStepsAndCheckForBreakpoints();
        }
    }

    private executeRunCommand() {
        this.remoteInterface.run()
            .then((address) => {
                this.updateCurrentCodeline(address);
                this.sendEvent('stopOnBreakpoint');
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    private loopSteps: boolean = true;

    private async loopStepsAndCheckForBreakpoints() {
        this.loopSteps = true;
        while(this.loopSteps) {
            try {
                await this.executeSingleStepAndCheckForBreakpoint();
            } catch(err) {
                this.sendEvent('error', err);
            }
        } 
    }

    private async executeSingleStepAndCheckForBreakpoint() {
        let address = await this.remoteInterface.step();
        this.updateCurrentCodeline(address);
        if(this.isBreakpointAtCurrentCodeLine()) {
            this.loopSteps = false;
            this.sendEvent('stopOnBreakpoint');
        }
    }

    private updateCurrentCodeline(addr: number) {
        this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
    }

    private isBreakpointAtCurrentCodeLine(): boolean {
        let index = this.breakpoints.findIndex(breakpoint => breakpoint.codeline === this.currentCodeLine);
        return index!==-1;
    }

    // function for creating a stacktrace / array of stackframes
    // the returned "frames" closely resemble the frames used by the Debug Adapter Protocol
    // currently we support only a single stackFrame; as such, the parameter for start- and endFrame do nothing
    // params:
    // start and end number for the stack frames
    // returns:
    // an array of stackframes as untyped objects
    public stack(startFrame: number, endFrame: number): Array<any> {
        let stackFrames = new Array<any>();
        let singleStackFrame = this.createStackFrame();
        stackFrames.push(singleStackFrame);
        return stackFrames;
    }

    private createStackFrame(): any {
        let stackFrame = {
            id: 1,
            name: path.basename(this.pathToAsmFile),
            source: this.pathToAsmFile,
            line: this.currentCodeLine,
            column: this.getColumn(this.currentCodeLine),
        };
        return stackFrame;
    }

    // used events: error, stopOnEntry, stopOnStep, stopOnBreakpoint, pause
    private sendEvent(event: string, ...args: any[]) {
        // executes the given function asynchronously as soon as possible (next iteration of the nodeJs event loop)
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }

    public setBreakpoints(value: AsmBreakpoint[]) {
        this.breakpoints = value;
        this.updateNumberOfNonBRKBreakpoints();
    }

    public get getPathToAsmFile() {
        return this.pathToAsmFile;
    }

    private updateNumberOfNonBRKBreakpoints() {
        this.numberOfNonBRKBreakpoints = 0;
        this.breakpoints.forEach(breakpoint => {
            if(!breakpoint.brk) {
                this.numberOfNonBRKBreakpoints++;
            }
        });
    }

    // helper function
    // returns the index of the first non-whitespace char in the codeLine referenced by the given line number
    // params:
    // number of the codeLine
    private getColumn(line: number): number {
        let codeLine = fs.readFileSync(this.pathToAsmFile, 'utf8').split('\n')[line]; // reads in the file as a single string, splits it into an array and then only takes the referenced line 
        return codeLine.indexOf(codeLine.trimLeft());
    }

    private static DEFAULT_FIRST_CODELINE = 1;
    
    private getFirstCodeLine(): number {
        return this.mapAddrToCodeLine.get(0) || AsmDebugger.DEFAULT_FIRST_CODELINE;
    }

}