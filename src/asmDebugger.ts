import * as fs from 'fs';
import { EventEmitter } from 'events';
import { RemoteInterface } from './remoteInterface';
import { AsmBreakpoint, isWindows } from './utils';

export class AsmDebugger extends EventEmitter {

    // filesystem correct paths to the asm file and hex file
    private pathToAsmFile: string;
    private pathToHexFile: string;

    // defines if the BRK Mnemonic shall be used as Breakpoint for debugging
    private brkBreakpoints: boolean = true;

    // mapping of the addresses used/returned by the digital simulator to the corresponding code lines in the asm file
    private mapAddrToCodeLine: Map<number, number>;

    // array for handling our breakpoints
    private breakpoints: AsmBreakpoint[];
    private breakpointId = 1;   // for numbering the breakpoints

    // values for tracking state
    private currentCodeLine = 0;
    private numberNonBRKBreakpoints = 0;

    // for communicating with the digital simulator
    private remoteInterface: RemoteInterface;

    // contructor for creating debugger and defining the important internal variables
    // params:
    // Uris to the asmFile and hexFile
    // a boolean controling, if BRK Statements are to be made into breakpoints for debugging
    // expects:
    // the hexFile is the parsed version of the asmFile
    public constructor(asm: string, hex: string, setBreakpointsAtBRK: boolean, IPofSimulator: string, PortOfSimulator: number) {
        super();

        this.mapAddrToCodeLine= new Map<number, number>();
        this.breakpoints = new Array<AsmBreakpoint>();

        this.pathToAsmFile = asm;
        this.pathToHexFile = hex;
        this.brkBreakpoints = setBreakpointsAtBRK;

        this.remoteInterface = new RemoteInterface(IPofSimulator, PortOfSimulator);
    }

    // start up the program
    // depending on the given boolean, the program either starts running or waits at the first code line 
    public start(stopOnEntry: boolean) {
        // before starting, we check if BRK statements should be breakpoints and set them
        if(this.brkBreakpoints) {
            this.setBreakpointsAtBRK();
        }
        this.remoteInterface.debug(this.pathToHexFile)
            .then((addr)=> {
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

    // run the program
    public continue() {
        this.run();
    }

    // run the program only one cylce
    public step() {
        this.run(true);
    }

    // stop the current running program
    public stop() {
        this.remoteInterface.stop()
            .then((addr)=> {
                this.sendEvent('pause');
            })
            .catch((err) => {
                this.sendEvent('error', err);
            });
    }

    // variation if the start function
    // because it's a restart, we don't add breakpoints
    public restart(stopOnEntry: boolean) {
        this.remoteInterface.debug(this.pathToHexFile)
            .then((addr)=> {
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

    // internal function managing the prorgam execution
    // the program will be run depending on the state of the debugger
    // params:
    // boolean which signals, if only a single step should be made; default value is false
    private run(singleStep: boolean = false) {
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
            if(this.numberNonBRKBreakpoints===0) {
                // if we have no breakpoints, which aren't based on BRK statements,
                // we can savely run the program till a BRK statement comes up
                this.remoteInterface.run()
                    .then((addr) => {
                        this.sendEvent('stopOnBreakpoint');
                    })
                    .catch((err) => {
                        this.sendEvent('error', err);
                    });
            } else {
                // because there are non BRK breakpoints, we run the program step by step, until we reach a codeline with a breakpoint
                this.loopSteps()
                    .then(() => {
                        this.sendEvent('stopOnBreakpoint');
                    })
                    .catch((err) => {
                        this.sendEvent('error', err);
                    });
            }
        }
    }

    // helper function for looping single cycles until we reached a breakpoint
    // asynchronous loop
    // expects:
    // existance of atleast one breakpoint
    // no other execution related functions being called, as those might get overwritten by the running loop
    private loopSteps = () =>
        this.remoteInterface.step()
            .then((addr) => {
                // we map the returned address to the codeline; the construct behind the map.get covers the case that the map returnes undefined
                this.currentCodeLine = this.mapAddrToCodeLine.get(addr) || this.currentCodeLine;
                let index = this.breakpoints.findIndex(bp => bp.codeline === this.currentCodeLine);
                // if we we do not have a breakpoint at the current codeline, we run another step
                if(index===-1) {
                    this.loopSteps();
                }
            })
            .catch((err) => {
                this.sendEvent('error', err);
            })

    // setting a breakpoint in the given line
    // params:
    // the codeline at which the breakpoint shall be set
    // a boolean signaling, if the breakpoints is due to a BRK statement at this line; default value is false
    // returns:
    // the new breakpoint
    public setBreakpoint(codeline: number, brk: boolean = false): AsmBreakpoint {
        let newBreakpoint = <AsmBreakpoint> {codeline, id: this.breakpointId++, brk};
        this.breakpoints.push(newBreakpoint);
        if(!brk) { this.numberNonBRKBreakpoints++; } // increase tracking number for non BRK breakpoints
        return newBreakpoint;
    }

    // internal function for checking the source code for BRK statements and setting breakpoints for them
    private setBreakpointsAtBRK() {
        // load all lines of the source file
        let sourceCodeLines = fs.readFileSync(this.pathToAsmFile, 'utf8').split('\n');
        // check every line for 'BRK' and if there is a ';' before it
        sourceCodeLines.forEach((line, index) => {
            let brk = line.indexOf("BRK");
            let semicolon = line.indexOf(";");
            if(brk!==-1 && brk<semicolon) {
                // create a breakpoint for this line
                this.setBreakpoint(index, true);
            }
        });    
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
            if(!breakpoint.brk) { this.numberNonBRKBreakpoints--; } // decrease tracking number for non BRK breakpoints
            return breakpoint;
        }
        return undefined;
    }

    // function for removing all breakpoints at once
    public clearAllBreakpoints() {
        this.breakpoints = new Array<AsmBreakpoint>();
        this.numberNonBRKBreakpoints = 0;
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
            name: this.getFileName(),
            source: this.pathToAsmFile,
            line: this.currentCodeLine,
            column: this.getColumn(this.currentCodeLine),
        };

        frames.push(newFrame);

        return frames;
    }

    // for emitting events
    // used events: error, stopOnEntry, stopOnStep, stopOnBreakpoint, pause
    private sendEvent(event: string, ...args: any[]) {
        // executes the given function asynchronously as soon as possible (next iteration of the nodeJs event loop)
        setImmediate(_ => {
            this.emit(event, ...args);
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

    private getFileName(): string {
        let seperator = isWindows ? '\\' : '/'; // choosing the file path seperator based on the platform we are currently on 
        let pathFragments = this.pathToAsmFile.split(seperator);
        return pathFragments[pathFragments.length-1];
    }

}