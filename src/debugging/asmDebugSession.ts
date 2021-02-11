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
import * as path from 'path';
import { DebugSession, StoppedEvent, StackFrame, Source, Breakpoint, InitializedEvent, Thread, BreakpointEvent, TerminatedEvent, OutputEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionLaunchRequestArguments } from '../extensionLaunchRequestArguments';
import { AsmDebugger, AsmDebuggerEvent } from './asmDebugger';
import { AsmBreakpointFactory, IBreakpointFactory } from './asmBreakpointFactory';
import { AsmBreakpoint } from './asmBreakpoint';
const { Subject } = require('await-notify');

// the implementation of debugging for the asm files uses the DebugSession based on the Debug Adapter Protocol
// thereby, the generic debug ui of VS Code will be usable for debugging
// see https://github.com/microsoft/vscode-debugadapter-node/blob/master/adapter/src/debugSession.ts for the methods and variables
export class AsmDebugSession extends DebugSession {
    
    private static THREAD_ID = 1; // we do not support multiple threads

    private debugger!: AsmDebugger;
    private breakpointFactory: IBreakpointFactory | undefined = undefined;

    // used internaly to await/notify ourselves when the configuration is done and we can proceed with lauchning the debugger
    private configurationDone = new Subject();

    public constructor() {
        super();
        this.setDebuggerIndexBase();
    }

    private setDebuggerIndexBase() {
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
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

    // function for starting the debugger
    // our needed arguments are part of our extension for the LaunchRequestArguments
    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ExtensionLaunchRequestArguments) {
        this.breakpointFactory = new AsmBreakpointFactory(args.pathToAsmFile, args.pathToAsmHexMapping);
        this.debugger = new AsmDebugger(args.pathToAsmFile, args.pathToHexFile, args.pathToAsmHexMapping, args.HostOfSimulator, args.PortOfSimulator);
        this.setUpEventListeners();

        if(args.setBreakpointsAtBRK) {
            this.setBreakpointsAtBRKMnemonics();
        }

        // annouces to the development tool that our debug adapter is ready to accept configuration requests like breakpoints
        this.sendEvent(new InitializedEvent());
        // timeout given in millliseconds
        await this.configurationDone.wait(10000);

        this.debugger.start(args.stopOnEntry);

        this.sendResponse(response); // response is just an acknowledgement
    }

    private setUpEventListeners() {
        this.debugger.on(AsmDebuggerEvent.ERROR, (err: Error) => {
            this.sendEvent(new StoppedEvent('error', AsmDebugSession.THREAD_ID, err.toString()));
            this.sendEvent(new OutputEvent("Debugging exited due to following error:\n"+err));
            this.sendEvent(new TerminatedEvent());
        });
        this.debugger.on(AsmDebuggerEvent.STOP_ON_ENTRY, () => {
            this.sendEvent(new StoppedEvent('entry', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on(AsmDebuggerEvent.STOP_ON_STEP, () => {
            this.sendEvent(new StoppedEvent('step', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on(AsmDebuggerEvent.STOP_ON_BREAKPOINT, () => {
            this.sendEvent(new StoppedEvent('breakpoint', AsmDebugSession.THREAD_ID));
        });
        this.debugger.on(AsmDebuggerEvent.PAUSE, () => {
            this.sendEvent(new StoppedEvent('pause', AsmDebugSession.THREAD_ID));
        });
    }

    private setBreakpointsAtBRKMnemonics() {
        let brkMnemonicBasedBreakpoints = (this.breakpointFactory as AsmBreakpointFactory).createBreakpointForEachBrkMnemonic();
        brkMnemonicBasedBreakpoints.forEach(breakpoint => {
            this.sendEvent(
                new BreakpointEvent('new', this.transformBreakpoint(breakpoint))
            );
        });
        this.debugger.setBreakpoints(brkMnemonicBasedBreakpoints);    
    }

    private transformBreakpoint(bp: AsmBreakpoint): Breakpoint {
        return <Breakpoint>{id: bp.id, line: bp.codeline, verified: bp.verified, source: this.createSource(this.debugger.getPathToAsmFile)};
    }

    private createSource(filePath: string): Source {
        return new Source(path.basename(filePath), this.convertDebuggerPathToClient(filePath));
    }

    // associated with the capability "supportsConfigurationDoneRequest"
    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		this.configurationDone.notify();
	}
 
    // associated with the capability "supportsRestartRequest"
    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request): void {
        this.debugger.start(true);
        this.sendResponse(response); // response is just an acknowledgement that the request has been done
	}

    // the request contains all expected breakpoints
    // the response must return information about all actual created breakpoints
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {
        let requestedBreakpoints = args.breakpoints || new Array<DebugProtocol.SourceBreakpoint>();
        let createdBreakpoints = new Array<AsmBreakpoint>();

        requestedBreakpoints.forEach(element => {
            let newBreakpoint = (this.breakpointFactory as AsmBreakpointFactory).createBreakpoint(element.line);
            createdBreakpoints.push(newBreakpoint);
        });
        this.debugger.setBreakpoints(createdBreakpoints);

        let actualBreakpoints = createdBreakpoints.map(bp => this.transformBreakpoint(bp));

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
    
    // running the program for one step
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request) : void {
        this.debugger.step();
        this.sendResponse(response); // the response is only an acknowledgement, so no content is required
	}

    // request for stepping into a function if possible
    // because it isn't feasible for our language, we make one step instead
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request) : void {
		this.debugger.step();
        this.sendResponse(response); // the response is only an acknowledgement
	}
    
    // request for stepping out off a function if possible
    // because it isn't feasible for our language, we make one step instead
    // expects:
    // debugger was succesfully constructed via launchRequest
    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request) : void {
        this.debugger.step();
        this.sendResponse(response); // the response is only an acknowledgement
	}

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request) : void {
        this.debugger.stop();
        this.sendResponse(response); // the response is only an acknowledgement
	}
    
    // request for all threads in the current debugger state
    // we support/use only one thread
    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response = this.includeThreadInformation(response);
        this.sendResponse(response);
	}
    
    private includeThreadInformation(response: DebugProtocol.ThreadsResponse): DebugProtocol.ThreadsResponse {
        response.body = {
			threads: [
				new Thread(AsmDebugSession.THREAD_ID, "thread 1")
			]
		};
        return response;
    }

    // request for the stackFrames of the referenced thread
    // the stackFrame contains the information, which line the program is currently at
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
        let startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
        let endFrame = startFrame + (typeof args.levels === 'number' ? args.levels : 1);
        
        let debuggerStack = this.debugger.stack(startFrame, endFrame);

        // converting the returned quasi stackFrames into proper ones
        let properStack = debuggerStack.map(f => new StackFrame(f.id, f.name, this.createSource(f.source), f.line, f.column));
        response.body = {
            totalFrames: properStack.length,
            stackFrames: properStack
        };
        
        this.sendResponse(response);
    }

    /*
        requests for Scopes, Variables, Attatch, Evaluate and Source aren't implemented (empty base implementation used) because we do not support these things
        but those things can't be defined via the capabilities, so we can't explicitly forbid such requests
    */
}