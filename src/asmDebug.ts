import * as fs from 'fs';
import { DebugSession } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { RemoteInterface } from './remoteInterface';

// the implementation of debugging for the asm files uses the DebugSession based on the Debug Adapter Protocol
// thereby, the generic debug ui of VS Code will be usable for debugging
// see https://github.com/microsoft/vscode-debugadapter-node/blob/master/adapter/src/debugSession.ts for the methods and variables
export class AsmDebugSession extends DebugSession {
    
    // because we do not support multiple threads, we hardcode an id to use as a default
    private static THREAD_ID: 1;

    private debugger: AsmDebugger;

    public constructor() {
        super();

        // debugger uses zero-based lines and columns
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);

        //
        this.debugger = new AsmDebugger();
    }

    // override of the default implementation of the function
    // first request to the Degub Adapter, when starting debugging
    // Debug Adpater returns information about which capabilities it implements
    // a implemented feature is signaled by setting the corresponding flag as true
    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        
        // if the response body is undefined, we create it
        response.body = response.body || {};
        
        // features, that aren't implemented, do not need there flags to be set to false
        // flags without explicit value are interpreted as false
        // check https://microsoft.github.io/debug-adapter-protocol/specification#capabilities for all possible capabilities
        
        // ...
        response.body.supportsConfigurationDoneRequest = false;

        // we support restart requests for the program
        response.body.supportsRestartRequest = true;

        // we do not support Terminating the program by the debug adapter
        response.body.supportsTerminateRequest = false;

        // we do not support requests to cancel earlier requests or progress sequences
        response.body.supportsCancelRequest = false;

        this.sendResponse(response);
    }
 
    // override of the default implementation of the function
    // associated with the capability "supportsRestartRequest"
    // response is empty / just an acknowledgement that the request has been done
    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request): void {
        // ToDo: Implement!!!
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // sets the breakpoints for the program, previous breakpoints shall be discarded
    // the request contains all expected breakpoints
    // the response must return information about all actual created breakpoints
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {
        // ToDo: implement!!!
        this.sendResponse(response);
    }
    
    // override of the default implementation of the function
    // (re)start running the program
    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request) : void {
        // ToDo: Implement!!!
        this.sendResponse(response);
    }
    
    // override of the default implementation of the function
    // running the program for one step
    // the response is only an acknowledgement, so no content is required
    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request) : void {
        // ToDo: Implement!!!
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // request for stepping into a function if possible
    // because it isn't feasible for our language, we make one step instead
    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request) : void {
		this.nextRequest(response, args, request);
	}
    
    // override of the default implementation of the function
    // request for stepping out off a function if possible
    // because it isn't feasible for our language, we make one step instead
    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request) : void {
		this.nextRequest(response, args, request);
	}

    // override of the default implementation of the function
    // request to stop executing the program
    // the response is only an acknowledgement
    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request) : void {
        // ToDo: Implement!!!
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // request for the referenced source code
    protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request) : void {
        // ToDo: implement!!!
        this.sendResponse(response);
    }
    
    // override of the default implementation of the function
    // request for the stackFrames of the referenced thread
    // importantly, the stackFrame contains the information, which line the program is currently at
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
        // ToDo: Implement!!!
        this.sendResponse(response);
	}

    /*
        requests for Evaluate, Scopes and Variables aren't implemented (empty base implementation used)
        because we do not support these things
        but does things can't be defined via the capabilities, so we can't explicitly forbid such requests
    */
}

export interface AsmBreakpoint {
    codeline: number;
    id: number;
}

export class AsmDebugger extends EventEmitter {

    private asmFile: vscode.Uri;
    private hexFile: vscode.Uri;

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
    public constructor(asm: vscode.Uri, hex: vscode.Uri, setBreakpointsAtBRK: boolean, IPofSimulator: string, PortOfSimulator: number) {
        super();

        this.mapAddrToCodeLine= new Map<number, number>();
        this.breakpoints = new Array<AsmBreakpoint>();

        this.asmFile = asm;
        this.hexFile = hex;
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
        let pathToHexFile = this.hexFile.fsPath;
        this.remoteInterface.debug(pathToHexFile)
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

    // internal function managing the prorgam execution
    // the program will be run depending on the state of the debugger
    // params:
    // boolean which signals, if only a single step should be made; default value is false
    private run(singleStep: boolean = false) {
        if(singleStep) {
            this.remoteInterface.step()
                .then((addr) => {
                    this.currentCodeLine = this.mapAddrToCodeLine.get(addr);
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
                this.currentCodeLine = this.mapAddrToCodeLine.get(addr);
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
    public setBreakpoint(codeline: number): AsmBreakpoint {
        let newBreakpoint = <AsmBreakpoint> {codeline, id: this.breakpointId++};
        this.breakpoints.push(newBreakpoint);
        return newBreakpoint;
    }

    // internal function for checking the source code for BRK statements and setting breakpoints for them
    private setBreakpointsAtBRK() {
        // load all lines of the source file
        let sourceCodeLines = fs.readFileSync(this.asmFile.fsPath, 'utf8').split('\n');
        // check every line for 'BRK' and if there is a ';' before it
        sourceCodeLines.forEach((line, index) => {
            let brk = line.indexOf("BRK");
            let semicolon = line.indexOf(";");
            if(brk!==-1 && brk<semicolon) {
                // create a breakpoint for this line
                this.setBreakpoint(index);
            }
        });    
    }

    // function for removing a single breakpoint
    // params:
    // codeline at which the breakpoint is set
    public clearBreakpoint(codeline: number): AsmBreakpoint | undefined {
        let index = this.breakpoints.findIndex(bp => bp.codeline === codeline);
        // if no breakpoint for this line is found (index -1) we can't get and return a breakpoint
        if(index >= 0) {
            let breakpoint = this.breakpoints[index];
            this.breakpoints.splice(index, 1); //removes one element in the array beginning at the position given by index, effectivly deleting the breakpoint from the array
            return breakpoint;
        }
        return undefined;
    }

    // function for removing all breakpoints at once
    public clearAllBreakpoints() {
        this.breakpoints = new Array<AsmBreakpoint>();
    }

    // function for creating a stacktrace / array of stackframes
    // the returned "frames" closely resemble the frames used by the Debug Adapter Protocol
    // currently we support only a single stackFrame; as such, the parameter for start- and endFrame do nothing
    public stack(startFrame: number, endFrame: number): any {
        let frames = new Array<any>();

        let newFrame = {
            id: 1,
            name: this.getFileName(),
            source: this.asmFile.fsPath,
            line: this.currentCodeLine,
            column: this.getColumn(this.currentCodeLine),
        };

        frames.push(newFrame);

        return frames;
    }

    // for emitting events
    // used events: error, stopOnEntry, stopOnStep, stopOnBreakpoint
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
        let codeLine = fs.readFileSync(this.asmFile.fsPath, 'utf8').split('\n')[line]; // reads in the file as a single string, splits it into an array and then only takes the referenced line 
        return codeLine.indexOf(codeLine.trimLeft());
    }

    private getFileName(): string {
        let pathFragments = this.asmFile.path.split('/');
        return pathFragments[pathFragments.length-1];
    }

}