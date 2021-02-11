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

export enum AsmDebuggerEvent {
    ERROR = 'error',
    STOP_ON_ENTRY = 'stopOnEntry',
    STOP_ON_STEP = 'stopOnStep', 
    STOP_ON_BREAKPOINT = 'stopOnBreakpoint', 
    PAUSE = 'pause'
}

export class AsmDebugger extends EventEmitter {

    // filesystem correct paths to the asm file and hex file
    private pathToAsmFile: string;
    private pathToHexFile: string;

    // mapping of the addresses used/returned by the digital simulator to the corresponding code lines in the asm file
    private mapAddrToCodeLine: Map<number, number>;

    private breakpoints: AsmBreakpoint[];

    private currentCodeLine: number;
    private numberOfNonBRKBreakpoints: number;

    // for communicating with the digital simulator
    private remoteInterface: RemoteInterface;

    public constructor(pathToAsmFile: string, pathToHexFile: string, pathToMapFile: string, IPofSimulator: string, PortOfSimulator: number) {
        super();

        this.mapAddrToCodeLine= new Map<number, number>();
        this.breakpoints = new Array<AsmBreakpoint>();
        this.currentCodeLine = 0;
        this.numberOfNonBRKBreakpoints = 0;

        this.pathToAsmFile = pathToAsmFile;
        this.pathToHexFile = pathToHexFile;

        let rawdata = fs.readFileSync(pathToMapFile);
        let mapping: Array<{addr:number, line:number}> = JSON.parse(rawdata.toString('utf8'));
        mapping.forEach(elem => {
            this.mapAddrToCodeLine.set(elem.addr, elem.line);
        });

        this.remoteInterface = new RemoteInterface(IPofSimulator, PortOfSimulator);
    }

    public start(stopOnEntry: boolean) {
        this.remoteInterface.debug(this.pathToHexFile)
            .then((_) => {
                this.currentCodeLine = this.getFirstCodeLine();
                if(stopOnEntry) {
                    this.sendEvent(AsmDebuggerEvent.STOP_ON_ENTRY);
                } else {
                    this.executeTillBreakpoint();
                }
            })
            .catch((err) => {
                this.sendEvent(AsmDebuggerEvent.ERROR, err);
            });
    }

    private static DEFAULT_FIRST_CODELINE = 1;
    
    private getFirstCodeLine(): number {
        return this.mapAddrToCodeLine.get(0) || AsmDebugger.DEFAULT_FIRST_CODELINE;
    }

    public stop() {
        this.remoteInterface.stop()
            .then((_) => {
                this.sendEvent(AsmDebuggerEvent.PAUSE);
            })
            .catch((err) => {
                this.sendEvent(AsmDebuggerEvent.ERROR, err);
            });
    }

    public step() {
        this.executeStepCommand();
    }

    private executeStepCommand() {
        this.remoteInterface.step()
            .then((address) => {
                this.updateCurrentCodeline(address);
                this.sendEvent(AsmDebuggerEvent.STOP_ON_STEP);
            })
            .catch((err) => {
                this.sendEvent(AsmDebuggerEvent.ERROR, err);
            });
    }

    private updateCurrentCodeline(addr: number) {
        this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
    }

    public continue() {
        this.executeTillBreakpoint();
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
                this.sendEvent(AsmDebuggerEvent.STOP_ON_BREAKPOINT);
            })
            .catch((err) => {
                this.sendEvent(AsmDebuggerEvent.ERROR, err);
            });
    }

    private loopSteps: boolean = true;

    private async loopStepsAndCheckForBreakpoints() {
        this.loopSteps = true;
        while(this.loopSteps) {
            try {
                await this.executeSingleStepAndCheckForBreakpoint();
            } catch(err) {
                this.sendEvent(AsmDebuggerEvent.ERROR, err);
            }
        } 
    }

    private async executeSingleStepAndCheckForBreakpoint() {
        let address = await this.remoteInterface.step();
        this.updateCurrentCodeline(address);
        if(this.isBreakpointAtCurrentCodeLine()) {
            this.loopSteps = false;
            this.sendEvent(AsmDebuggerEvent.STOP_ON_BREAKPOINT);
        }
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
            column: this.getFirstNonWhitespacePosition(this.currentCodeLine),
        };
        return stackFrame;
    }

    private getFirstNonWhitespacePosition(referencedCodeline: number): number {
        let codeLine = fs.readFileSync(this.pathToAsmFile, 'utf8').split('\n')[referencedCodeline];
        return codeLine.indexOf(codeLine.trimLeft());
    }

    private sendEvent(event: AsmDebuggerEvent, ...args: any[]) {
        // executes the given function asynchronously as soon as possible (next iteration of the nodeJs event loop)
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }

    public setBreakpoints(value: AsmBreakpoint[]) {
        this.breakpoints = value;
        this.updateNumberOfNonBRKBreakpoints();
    }

    private updateNumberOfNonBRKBreakpoints() {
        this.numberOfNonBRKBreakpoints = 0;
        this.breakpoints.forEach(breakpoint => {
            if(!breakpoint.brkMnemomic) {
                this.numberOfNonBRKBreakpoints++;
            }
        });
    }

    public get getPathToAsmFile() {
        return this.pathToAsmFile;
    }

}