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
import { DebugSession, StoppedEvent, StackFrame, Source, Breakpoint, InitializedEvent, Thread, BreakpointEvent, TerminatedEvent, OutputEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionLaunchRequestArguments } from './extensionLaunchRequestArguments';
import { AsmDebugger } from './asmDebugger';
const { Subject } = require('await-notify');

// the implementation of debugging for the asm files uses the DebugSession based on the Debug Adapter Protocol
// thereby, the generic debug ui of VS Code will be usable for debugging
// see https://github.com/microsoft/vscode-debugadapter-node/blob/master/adapter/src/debugSession.ts for the methods and variables
export class AsmDebugSession extends DebugSession {
    
    private static THREAD_ID = 1; // we do not support multiple threads

    private debugger: AsmDebugger = new AsmDebugger();

    private breakpointsOnBRKStatements: boolean = true;

    // used internaly to await/notify ourselves when the configuration is done and we can proceed with lauchning the debugger
    private configurationDone = new Subject();

    public constructor() {
        super();
        this.setDebuggerIndexBase();
        this.setUpEventListeners();
    }

    private setDebuggerIndexBase() {
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
    }

    private setUpEventListeners() {
        // subscribing to the known events of our AsmDebugger
        this.debugger.on('error', (err: Error) => {
            this.sendEvent(new StoppedEvent('error', AsmDebugSession.THREAD_ID, err.toString()));
            this.sendEvent(new OutputEvent("Debugging exited due to following error:\n"+err));
            this.sendEvent(new TerminatedEvent());
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
    }

    // first request to the Debug Adapter, when starting debugging
    // Debug Adpater returns information about which capabilities it implements
    // a implemented feature is signaled by setting the corresponding flag as true
    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response = this.writeCapabilitiesIntoResponse(response);
        this.sendResponse(response);
    }

    private writeCapabilitiesIntoResponse(response: DebugProtocol.InitializeResponse): DebugProtocol.InitializeResponse {
        response.body = response.body || {}; // creates an empty response body, if the body was undefined
        // check https://microsoft.github.io/debug-adapter-protocol/specification#capabilities for all possible capabilities
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsRestartRequest = true;
        response.body.supportsTerminateRequest = false;
        response.body.supportsCancelRequest = false;
        return response;
    }

    // associated with the capability "supportsConfigurationDoneRequest"
    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		this.configurationDone.notify();
	}

    // override of the default implementation of the function
    // function for starting the debuggee
    // our needed arguments are part of our extension for the LaunchRequestArguments
    // sets up our AsmDebugger
    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ExtensionLaunchRequestArguments) {
        // passing the configuration into our asmDebugger to make it actually usable
        this.debugger.config(args.pathToAsmFile, args.pathToHexFile, args.pathToAsmHexMapping, args.HostOfSimulator, args.PortOfSimulator);
        this.breakpointsOnBRKStatements = args.setBreakpointsAtBRK;

        if(this.breakpointsOnBRKStatements) {
            this.setBreakpointsAtBRK();
        }

        // annouces to the development tool that our debug adapter is ready to accept configuration requests like breakpoints
        this.sendEvent(new InitializedEvent());

        // wait until configuration has finished (and configurationDoneRequest has been called)
        // timeout given in millliseconds
        await this.configurationDone.wait(10000);

        // launching/starting
        this.debugger.start(args.stopOnEntry);

        this.sendResponse(response); // response is just an acknowledgement
    }
 
    // associated with the capability "supportsRestartRequest"
    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request): void {
        this.debugger.start(true);
        this.sendResponse(response); // response is just an acknowledgement that the request has been done
	}

    // override of the default implementation of the function
    // sets the breakpoints for the program, previous breakpoints shall be discarded
    // the request contains all expected breakpoints
    // the response must return information about all actual created breakpoints
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {
        // before setting the new set of breakpoints, we remove the old ones
        this.debugger.clearAllBreakpoints();

        // get wanted breakpoints
        let breakpoints = args.breakpoints || new Array<DebugProtocol.SourceBreakpoint>();
        // set a breakpoint for every requested one
        breakpoints.forEach(elem => {
            this.debugger.setBreakpoint(elem.line);      
        });
        
        // mapping our asmBreakpoints into the DAP breakpoints
        // for the time being, we filter out our brk statement breakpoints, because vscode expects as much breakpoints as it set and throws additional breakpoints away
        let actualBreakpoints = this.debugger.getBreakpoints.map(bp => <Breakpoint>{id: bp.id, line: bp.codeline, verified: bp.verified, source: args.source});

        response.body = {
            breakpoints: actualBreakpoints
        };
        this.sendResponse(response);
    }

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request) : void {
        this.debugger.continue();
        response.body = {
            allThreadsContinued: false // as we only have one thread, we signal, that we only continued one thread (marked by the thread id in the request)
        };
        this.sendResponse(response);
    }
    
    // override of the default implementation of the function
    // running the program for one step
    // the response is only an acknowledgement, so no content is required
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request) : void {
        this.debugger.step();
        this.sendResponse(response);
	}

    // override of the default implementation of the function
    // request for stepping into a function if possible
    // because it isn't feasible for our language, we make one step instead
    // the response is empty/ an acknowledgement
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request) : void {
		this.debugger.step();
        this.sendResponse(response);
	}
    
    // override of the default implementation of the function
    // request for stepping out off a function if possible
    // because it isn't feasible for our language, we make one step instead
    // the response is empty/ an acknowledgement
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request) : void {
        this.debugger.step();
        this.sendResponse(response);
	}

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request) : void {
        this.debugger.stop();
        this.sendResponse(response); // the response is only an acknowledgement
	}
    
    // override of the default implementation of the function
    // request for all threads in the current debugger state
    // we support/use only one thread
    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(AsmDebugSession.THREAD_ID, "thread 1")
			]
		};
        this.sendResponse(response);
	}
    
    // override of the default implementation of the function
    // request for the stackFrames of the referenced thread
    // the stackFrame contains the information, which line the program is currently at
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
        let startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
        let endFrame = startFrame + (typeof args.levels === 'number' ? args.levels : 1);
        
        let stk = this.debugger.stack(startFrame, endFrame);

        // converting the returned quasi stackFrames into proper ones
        let properStk = stk.map(f => new StackFrame(f.id, f.name, this.createSource(f.source), f.line, f.column));
        response.body = {
            totalFrames: properStk.length,
            stackFrames: properStk
        };
        
        this.sendResponse(response);
    }

    /*
        requests for Scopes, Variables, Attatch, Evaluate and Source aren't implemented (empty base implementation used)
        because we do not support these things
        but does things can't be defined via the capabilities, so we can't explicitly forbid such requests
    */

    private createSource(filePath: string): Source {
        return new Source(path.basename(filePath), this.convertDebuggerPathToClient(filePath));
    }

    // internal function for checking the source code for BRK statements and setting breakpoints for them
    private setBreakpointsAtBRK() {
        // load all lines of the source file
        let sourceCodeLines = fs.readFileSync(this.debugger.getPathToAsmFile, 'utf8').split('\n');
        // check every line for 'BRK' and if there is a ';' before it
        sourceCodeLines.forEach((line, index) => {
            let brk = line.indexOf("BRK");
            let semicolon = line.indexOf(";");
            if(brk!==-1 && (semicolon===-1 || brk<semicolon)) {
                // create a breakpoint for this line; adjusting 0 based index to 1 based code lines
                let newBreakpoint = this.debugger.setBreakpoint(index+1, true);
                // signaling the editor about the additional breakpoint created
                this.sendEvent(
                    new BreakpointEvent(
                        'new', 
                        <Breakpoint>{id: newBreakpoint.id, line: newBreakpoint.codeline, verified: newBreakpoint.verified, source: this.createSource(this.debugger.getPathToAsmFile)}
                    )
                );
            }
        });    
    }

}