import { DebugProtocol } from 'vscode-debugprotocol';

// representation of breakpoints for our debugger
export interface AsmBreakpoint {
    codeline: number;
    id: number;
    brk: boolean;
    verified: boolean;
}

// interface containing all information needed for launching our debugger
export interface AsmLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    stopOnEntry: boolean;
    pathToAsmFile: string;
    pathToHexFile: string;
    pathToAsmHexMapping: string;
    setBreakpointsAtBRK: boolean;
    IPofSimulator: string; 
    PortOfSimulator: number;
}