import * as os from 'os';
import { DebugProtocol } from 'vscode-debugprotocol';

// representation of breakpoints for our debugger
export interface AsmBreakpoint {
    codeline: number;
    id: number;
    brk: boolean;
}

// interface containing all information needed for launching our debugger
export interface AsmLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    pathToAsmFile: string;
    pathToHexFile: string;
    pathToAsmHexMapping: string;
    setBreakpointsAtBRK: boolean;
    IPofSimulator: string; 
    PortOfSimulator: number;
}

export const isWindows = os.platform()==='win32';