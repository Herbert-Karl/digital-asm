import * as path from 'path';
import { DebugSession, StoppedEvent, StackFrame, Source, Breakpoint } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { AsmLaunchRequestArguments } from './utils';
import { AsmDebugger } from './asmDebugger';

// the implementation of debugging for the asm files uses the DebugSession based on the Debug Adapter Protocol
// thereby, the generic debug ui of VS Code will be usable for debugging
// see https://github.com/microsoft/vscode-debugadapter-node/blob/master/adapter/src/debugSession.ts for the methods and variables
export class AsmDebugSession extends DebugSession {
    
    // because we do not support multiple threads, we hardcode an id to use as a default
    private static THREAD_ID: 1;

    private debugger: AsmDebugger | null;

    public constructor() {
        super();

        // debugger uses zero-based lines and columns
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);

        // because we can't just start our debugger without additional information, we st a null value
        this.debugger = null;
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

    // function for starting the debuggee
    // our needed arguments are part of our extension for the LaunchRequestArguments
    // sets up our AsmDebugger
    // response is empty / just an acknowledgement
    protected launchRequest(response: DebugProtocol.LaunchResponse, args: AsmLaunchRequestArguments) {
        this.debugger = new AsmDebugger(args.pathToAsmFile, args.pathToHexFile, args.pathToAsmHexMapping, args.setBreakpointsAtBRK, args.IPofSimulator, args.PortOfSimulator);

        // subscribing to the known events of our AsmDebugger
        this.debugger.on('error', (err) => {
            this.sendEvent(new StoppedEvent('error', AsmDebugSession.THREAD_ID, err));
        });
        this.debugger.on('stopOnEntry', () => {
            this.sendEvent(new StoppedEvent('entry', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on('stopOnStep', () => {
            this.sendEvent(new StoppedEvent('step', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on('stopOnBreakpoint', () => {
            this.sendEvent(new StoppedEvent('breakpoint', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on('pause', () => {
            this.sendEvent(new StoppedEvent('pause', AsmDebugSession.THREAD_ID));
        });

        // launching/starting
        let stopOnEntry = true;
        if(args.noDebug!==undefined) {
            // if the launchrequestarguments contain an information about the debugging we use it
            // but we negate noDebug in order to match the semantic of stopOnEntry (noDebug true would mean that we shouldn't stopOnEntry/shoudl just run the program)
            stopOnEntry = !args.noDebug;
        }
        this.debugger.start(stopOnEntry);

        this.sendResponse(response);
    }
 
    // override of the default implementation of the function
    // associated with the capability "supportsRestartRequest"
    // response is empty / just an acknowledgement that the request has been done
    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request): void {
        // we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.restart(true);
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // sets the breakpoints for the program, previous breakpoints shall be discarded
    // the request contains all expected breakpoints
    // the response must return information about all actual created breakpoints
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {
        // debugger not started yet
        if(this.debugger===null) {

        } else {
            let currentBreakpoints = this.debugger.getBreakpoints;
            // get wanted breakpoints
            let breakpoints = args.breakpoints || new Array<DebugProtocol.SourceBreakpoint>();
            // set a breakpoint for every requested one
            breakpoints.forEach((elem, index) => {
                let bp = this.debugger?.setBreakpoint(elem.line);
                // condition should always be true, as we already earlier checked for this.debugger to exist
                // the undefined is only needed, because the null check for this.debugger doesn't apply in the forEach loop
                // as such, typescript thinks, that the function call on this.debugger might fail due to null and bp subsequent would become undefined
                if(bp!==undefined) {
                    currentBreakpoints.splice(index, 0, bp); // add the new breakpoint into the array in order of creation; due to using the indexes, the new breakpoints occupy the array from the beginning
                }       
            });
            
            // mapping our asmBreakpoints into the DAP breakpoints and setting them into the response
            response.body.breakpoints = currentBreakpoints.map(bp => <Breakpoint>{id: bp.id, line: bp.codeline, verified: true, source: args.source});

            this.sendResponse(response);
        }
    }
    
    // override of the default implementation of the function
    // (re)start running the program
    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request) : void {
        // we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.continue();
        response.body.allThreadsContinued = false; // as we only have one thread, we signal, that we only continued one thread (marked by the thread id in the request)
        this.sendResponse(response);
    }
    
    // override of the default implementation of the function
    // running the program for one step
    // the response is only an acknowledgement, so no content is required
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request) : void {
        // we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.step();
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // request for stepping into a function if possible
    // because it isn't feasible for our language, we make one step instead
    // the response is emtpy/ an acknowledgement
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request) : void {
		// we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.step();
        this.sendResponse(response);
	}
    
    // override of the default implementation of the function
    // request for stepping out off a function if possible
    // because it isn't feasible for our language, we make one step instead
    // the response is emtpy/ an acknowledgement
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request) : void {
        // we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.step();
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // request to stop executing the program
    // the response is only an acknowledgement
    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request) : void {
        // we omit a null check, because the launchRequest should have happened beforehand
        this.debugger?.stop();
        this.sendResponse(response);
	}
    
    // override of the default implementation of the function
    // request for the stackFrames of the referenced thread
    // importantly, the stackFrame contains the information, which line the program is currently at
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
        let startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
        let endFrame = startFrame + (typeof args.levels === 'number' ? args.levels : 1);
        
        // we omit a null check, because the launchRequest should have happened beforehand
        let stk = this.debugger?.stack(startFrame, endFrame);

        // converting the returned quasi stackFrames into proper ones
        let properStk = stk?.map(f => new StackFrame(f.id, f.name, this.createSource(f.source), f.line, f.column)) || new Array<StackFrame>(); // default variant should never happen, but is necessary to set the response body without null/undefined checks
        response.body = {
            totalFrames: properStk.length,
            stackFrames: properStk
        };
        
        this.sendResponse(response);
	}

    /*
        requests for Evaluate, Source, Scopes and Variables aren't implemented (empty base implementation used)
        because we do not support these things
        but does things can't be defined via the capabilities, so we can't explicitly forbid such requests
    */

    // helper function for creating a Source object for a given filePath
    // we don't give a sourceReference for the file
    // params:
    // filePath as string
    // returns:
    // Source object corresponding to the given filePath
    private createSource(filePath: string): Source {
        return new Source(path.basename(filePath), this.convertDebuggerPathToClient(filePath), undefined);
    }

}