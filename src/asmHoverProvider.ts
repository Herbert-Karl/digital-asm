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
import * as vscode from 'vscode';
import { mnemonicsArray, AsmMnemonic } from './mnemonics';

export class AsmHoverProvider implements vscode.HoverProvider {

    private mnemonicToHover: Map<string, vscode.Hover>;

    constructor() {
        this.mnemonicToHover = new Map<string, vscode.Hover>();
        this.createHovers();
    }

    private createHovers() {
        mnemonicsArray.forEach((elem: AsmMnemonic) => {
            let newHover = new vscode.Hover(this.constructHoverText(elem.detail, elem.doc));
            this.mnemonicToHover.set(elem.label, newHover);
        });
    }

    private constructHoverText(header: string, body:string): string {
        return header + "\n\n" + body;
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let wordRange = document.getWordRangeAtPosition(position);
        let focusedWord = document.getText(wordRange);
        return this.mnemonicToHover.get(focusedWord);
    }
}
