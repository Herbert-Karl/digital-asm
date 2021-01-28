/*
Copyright © 2021 Herbert Bärschneider

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
import { Breakpoint } from 'vscode';
import { AsmBreakpoint, IBreakpoint } from "./asmBreakpoint";

export interface IBreakpointFactory {
    createBreakpoint(codeline: number): IBreakpoint;
}

export class AsmBreakpointFactory implements IBreakpointFactory {

    private runningBreakpointNumber: number;

    private mapAddrToCodeline: Map<number, number>; // maps executable lines of the output hex file to the corresponding codelines of the asm file

    constructor(pathToMapFile: string) {
        this.runningBreakpointNumber = 1;
        this.mapAddrToCodeline = this.loadAddrToCodelineMappingFromFile(pathToMapFile);
    }

    private loadAddrToCodelineMappingFromFile(pathToMapFile: string): Map<number, number> {
        let rawFileData = fs.readFileSync(pathToMapFile);
        let arrayOfAddrToCodelineAssociations: Array<{ addr: number, line: number }> = JSON.parse(rawFileData.toString('utf8'));
        let mapAddrToCodeline = new Map<number, number>();
        arrayOfAddrToCodelineAssociations.forEach(elem => {
            mapAddrToCodeline.set(elem.addr, elem.line);
        });
        return mapAddrToCodeline;
    }

    public createBreakpoint(codeline: number): AsmBreakpoint {
        let newBreakpoint = this.createBaseOfBreakpoint(codeline);
        newBreakpoint = this.verifyIfCodelineIsExecutableLine(newBreakpoint);
        return newBreakpoint;
    }

    private createBaseOfBreakpoint(codeline: number): AsmBreakpoint {
        return <AsmBreakpoint>{ codeline: codeline, id: this.runningBreakpointNumber++ };
    }

    private verifyIfCodelineIsExecutableLine(breakpoint: AsmBreakpoint): AsmBreakpoint {
        let isCodelinePartOfExecutable = false;
        this.mapAddrToCodeline.forEach(actualCodeline => {
            if (actualCodeline===breakpoint.codeline) {
                isCodelinePartOfExecutable = true;
            }
        });
        breakpoint.verified = isCodelinePartOfExecutable;
        return breakpoint;
    }

}