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

    private sourceCodelines: Array<string>;
    private mapAddrToCodeline: Map<number, number>; // maps executable lines of the output hex file to the corresponding codelines of the asm file

    constructor(pathToAsmFile: string, pathToCorrespondingMapFile: string) {
        this.runningBreakpointNumber = 1;
        this.sourceCodelines = this.loadSourceCodelinesFromFile(pathToAsmFile);
        this.mapAddrToCodeline = this.loadAddrToCodelineMappingFromFile(pathToCorrespondingMapFile);
    }

    private loadSourceCodelinesFromFile(pathToAsmFile: string): Array<string> {
        let sourceCodelines = fs.readFileSync(pathToAsmFile, 'utf8').split('\n');
        return sourceCodelines;
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
        newBreakpoint = this.checkIfCodelineContainsBrkMnemonic(newBreakpoint);
        return newBreakpoint;
    }

    private createBaseOfBreakpoint(codeline: number): AsmBreakpoint {
        return <AsmBreakpoint>{ codeline: codeline, id: this.runningBreakpointNumber++ };
    }

    private verifyIfCodelineIsExecutableLine(breakpoint: AsmBreakpoint): AsmBreakpoint {
        let isCodelinePartOfExecutable = false;
        this.mapAddrToCodeline.forEach(actualCodeline => {
            if (actualCodeline === breakpoint.codeline) {
                isCodelinePartOfExecutable = true;
            }
        });
        breakpoint.verified = isCodelinePartOfExecutable;
        return breakpoint;
    }

    private checkIfCodelineContainsBrkMnemonic(breakpoint: AsmBreakpoint): AsmBreakpoint {
        const ONE_BASED_SOURCE_TO_ZERO_BASED_ARRAY_OFFSET = 1;
        let sourceCodeline = this.sourceCodelines[breakpoint.codeline-ONE_BASED_SOURCE_TO_ZERO_BASED_ARRAY_OFFSET];
        breakpoint.brk = this.doesSourceCodelineContainBrkMnemonicBeforeSemicolon(sourceCodeline);
        return breakpoint;
    }

    private doesSourceCodelineContainBrkMnemonicBeforeSemicolon(sourceCodeline: string): boolean {
        let indexOfBrkSubstring = this.getIndexOfBrkMnemonic(sourceCodeline);
        let indexOfSemicolon = this.getIndexOfSemicolon(sourceCodeline);
        return this.isBrkMnemonicBeforeSemicolon(indexOfBrkSubstring, indexOfSemicolon);
    }

    private getIndexOfBrkMnemonic(sourceCodeline: string): number {
        let caseInsensitiveSourceCodeline = sourceCodeline.toLowerCase();
        return caseInsensitiveSourceCodeline.indexOf("brk");
    }

    private getIndexOfSemicolon(sourceCodeline: string): number {
        return sourceCodeline.indexOf(";");
    }

    private isBrkMnemonicBeforeSemicolon(indexOfBrkSubstring: number, indexOfSemicolon: number): boolean {
        return indexOfBrkSubstring!==-1 && (indexOfSemicolon===-1 || indexOfBrkSubstring<indexOfSemicolon);
    }

}